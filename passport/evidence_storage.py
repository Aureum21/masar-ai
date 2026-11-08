"""Private local/S3 evidence bytes. No public URLs or credentials in DB records."""
from contextlib import contextmanager
from functools import lru_cache
from io import BytesIO
import logging
import hashlib
import os
from pathlib import Path
import re
import tempfile
import time
from threading import Lock

from fastapi import HTTPException
from PIL import Image, ImageOps

MAX_STORED_BYTES = 20 * 1024 * 1024
_privacy = {}
_privacy_lock = Lock()
log = logging.getLogger(__name__)


def storage_root():
    return Path(os.getenv('PASSPORT_EVIDENCE_DIR', str(Path(__file__).resolve().parent.parent/'data'/'passport-evidence'))).resolve()


def configured_backend():
    value = os.getenv('PASSPORT_EVIDENCE_STORAGE', 'local').lower()
    if value not in {'local', 's3'}:
        raise HTTPException(503, 'Evidence storage configuration is invalid.')
    return value


def local_path(user_id, name):
    validate_identity(user_id, name)
    root = storage_root()/str(user_id)
    path = root/name
    if not path.resolve().is_relative_to(root.resolve()):
        raise HTTPException(409, 'Evidence storage path is invalid.')
    return path


def validate_identity(user_id, name):
    if not isinstance(user_id, int) or user_id < 1 or not isinstance(name, str) or not re.fullmatch(r'[a-f0-9]{32}\.(png|jpg)', name):
        raise HTTPException(404, 'Evidence image not found')


def sanitized(data, image_type):
    with Image.open(BytesIO(data)) as original:
        oriented = ImageOps.exif_transpose(original).convert('RGB')
        clean = Image.new('RGB', oriented.size)
        clean.paste(oriented)
        result = BytesIO()
        clean.save(result, format='PNG' if image_type == 'image/png' else 'JPEG', optimize=True)
    if result.tell() > MAX_STORED_BYTES:
        raise HTTPException(413, 'The sanitized photo is too large to store. Choose a smaller image.')
    return result.getvalue()


@lru_cache(maxsize=8)
def s3_client(profile, region):
    import boto3
    from botocore.config import Config
    return boto3.Session(profile_name=profile or None, region_name=region).client('s3', config=Config(
        connect_timeout=3, read_timeout=10, retries={'max_attempts': 1}))


def client_for(ref):
    return s3_client(os.getenv('AWS_PROFILE', ''), ref['region'])


def require_private(client, bucket):
    scope = (id(client), bucket)
    with _privacy_lock:
        if _privacy.get(scope, 0) > time.monotonic():
            return
    protection = client.get_public_access_block(Bucket=bucket)['PublicAccessBlockConfiguration']
    if not all(protection.get(key) is True for key in ('BlockPublicAcls','IgnorePublicAcls','BlockPublicPolicy','RestrictPublicBuckets')):
        raise HTTPException(503, 'The evidence bucket must have all Block Public Access protections enabled.')
    with _privacy_lock:
        _privacy[scope] = time.monotonic()+60


def new_s3_ref(user_id, name):
    validate_identity(user_id, name)
    bucket = os.getenv('PASSPORT_EVIDENCE_BUCKET', '')
    region = os.getenv('PASSPORT_EVIDENCE_REGION') or os.getenv('AWS_DEFAULT_REGION', 'eu-north-1')
    if not bucket:
        raise HTTPException(503, 'A private evidence bucket must be configured.')
    return validate_ref({'backend':'s3','bucket':bucket,'region':region,
                         'key':f'passport-evidence/{user_id}/{name}','user_id':user_id,'name':name})


def validate_ref(ref):
    ref = dict(ref)
    validate_identity(ref.get('user_id'), ref.get('name'))
    if ref.get('backend') != 's3' or not re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]', ref.get('bucket', '')):
        raise HTTPException(503, 'Evidence storage reference is invalid.')
    if ref.get('key') != f"passport-evidence/{ref['user_id']}/{ref['name']}" or not re.fullmatch(r'[a-z0-9-]{3,40}', ref.get('region','')):
        raise HTTPException(503, 'Evidence storage reference is invalid.')
    if ref.get('version_id') is not None and (not isinstance(ref['version_id'], str) or len(ref['version_id']) > 1024):
        raise HTTPException(503, 'Evidence version reference is invalid.')
    return ref


def ref_for(submission):
    validate_identity(submission.user_id, submission.image_name)
    ref = getattr(submission, 'image_storage', None)
    if not ref or ref.get('backend') == 'local':
        return {'backend':'local','user_id':submission.user_id,'name':submission.image_name}
    ref = validate_ref(ref)
    if ref['user_id'] != submission.user_id or ref['name'] != submission.image_name:
        raise HTTPException(503, 'Evidence storage reference is invalid.')
    return ref


def quota(client, ref, size):
    listing = client.list_objects_v2(Bucket=ref['bucket'], Prefix=f"passport-evidence/{ref['user_id']}/", MaxKeys=101)
    objects = listing.get('Contents', [])
    if listing.get('IsTruncated') or len(objects) >= 100 or sum(item['Size'] for item in objects)+size > 100*1024*1024:
        raise HTTPException(413, 'Private evidence storage limit reached (100 images / 100 MB).')


def put_private(ref, data, image_type):
    ref = validate_ref(ref)
    try:
        client = client_for(ref)
        require_private(client, ref['bucket'])
        quota(client, ref, len(data))
        result = client.put_object(Bucket=ref['bucket'], Key=ref['key'], Body=data,
            ContentType=image_type, CacheControl='private, no-store',
            ServerSideEncryption='AES256', IfNoneMatch='*', Metadata={'sha256':hashlib.sha256(data).hexdigest()})
        return dict(ref, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), **({'version_id':result['VersionId']} if result.get('VersionId') else {}))
    except HTTPException:
        raise
    except Exception as error:
        log.warning('Private evidence upload unavailable (%s).', type(error).__name__)
        raise HTTPException(503, 'Private photo storage is unavailable. Your evidence was not submitted; please retry.') from None


def read_bytes(submission):
    ref = ref_for(submission)
    if ref['backend'] == 'local':
        path = local_path(ref['user_id'], ref['name'])
        if not path.is_file():
            raise HTTPException(404, 'Evidence image not found')
        if path.stat().st_size > MAX_STORED_BYTES:
            raise HTTPException(413, 'Stored evidence exceeds the supported image size.')
        return path.read_bytes()
    try:
        params = {'Bucket':ref['bucket'],'Key':ref['key']}
        if ref.get('version_id'):
            params['VersionId'] = ref['version_id']
        result = client_for(ref).get_object(**params)
        body = result['Body']
        try:
            if result.get('ContentLength', 0) > MAX_STORED_BYTES:
                raise HTTPException(413, 'Stored evidence exceeds the supported image size.')
            # Network streams may return fewer bytes than requested before EOF.
            chunks = []
            total = 0
            while total <= MAX_STORED_BYTES:
                chunk = body.read(min(64 * 1024, MAX_STORED_BYTES + 1 - total))
                if not chunk:
                    break
                chunks.append(chunk)
                total += len(chunk)
            data = b''.join(chunks)
            if len(data) > MAX_STORED_BYTES:
                raise HTTPException(413, 'Stored evidence exceeds the supported image size.')
            if ref.get('sha256') and hashlib.sha256(data).hexdigest() != ref['sha256']:
                raise HTTPException(503, 'Private photo integrity check failed. Please retry later.')
            return data
        finally:
            body.close()
    except HTTPException:
        raise
    except Exception as error:
        code = getattr(error,'response',{}).get('Error',{}).get('Code')
        if code in {'NoSuchKey','NoSuchVersion','404','NotFound'}:
            raise HTTPException(404, 'Evidence image not found') from None
        log.warning('Private evidence read unavailable (%s).', type(error).__name__)
        raise HTTPException(503, 'Private photo storage is temporarily unavailable. Please retry.') from None


def delete_ref(ref):
    if ref.get('backend') == 'local':
        local_path(ref['user_id'], ref['name']).unlink(missing_ok=True)
        return
    ref = validate_ref(ref)
    params = {'Bucket':ref['bucket'],'Key':ref['key']}
    if ref.get('version_id'):
        params['VersionId'] = ref['version_id']
    client_for(ref).delete_object(**params)


@contextmanager
def materialized(submission):
    ref = ref_for(submission)
    if ref['backend'] == 'local':
        path = local_path(ref['user_id'], ref['name'])
        if not path.is_file():
            raise HTTPException(404, 'Evidence image not found')
        yield path
    else:
        # A request-scoped copy only: it is deleted on success and model failure.
        with tempfile.TemporaryDirectory(prefix='masar-evidence-') as directory:
            path = Path(directory)/ref['name']
            path.write_bytes(read_bytes(submission))
            yield path
