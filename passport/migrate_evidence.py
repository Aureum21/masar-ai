"""Copy legacy local evidence to private S3; retain local originals as a backup."""
import asyncio
from copy import deepcopy
import hashlib
import logging
from types import SimpleNamespace
from sqlalchemy import select
import models as core  # Register users/trips FK tables for standalone CLI flushes.
from .models import Submission, EvidenceDeletion, uid, utcnow
from . import evidence_storage as storage


def copy_legacy(snapshot):
    data = storage.read_bytes(snapshot)
    ref = storage.new_s3_ref(snapshot.user_id, snapshot.image_name)
    client = storage.client_for(ref)
    storage.require_private(client, ref['bucket'])
    digest = hashlib.sha256(data).hexdigest()
    try:
        existing = client.head_object(Bucket=ref['bucket'], Key=ref['key'])
    except Exception as error:
        if getattr(error,'response',{}).get('Error',{}).get('Code') not in {'404','NoSuchKey','NotFound'}:
            raise
        ref = storage.put_private(ref, data, snapshot.image_type)
    else:
        if existing.get('Metadata',{}).get('sha256') != digest or existing.get('ContentLength') != len(data):
            raise ValueError('A different object already occupies this evidence key; no overwrite performed.')
        ref = dict(ref,sha256=digest,bytes=len(data),**({'version_id':existing['VersionId']} if existing.get('VersionId') else {}))
    # Verify the exact stored pixels before the database starts referring to S3.
    copy = SimpleNamespace(user_id=snapshot.user_id,image_name=snapshot.image_name,image_storage=ref)
    if hashlib.sha256(storage.read_bytes(copy)).hexdigest() != digest:
        raise ValueError('S3 evidence verification failed')
    return ref


async def migrate(sessions, apply=False, user_id=None, limit=100):
    stats = {'examined':0,'available':0,'migrated':0,'missing':0,'already_s3':0,'changed':0,'failed':0}
    async with sessions() as db:
        query = select(Submission).where(Submission.image_name.is_not(None)).order_by(Submission.created_at)
        if user_id is not None:
            query = query.where(Submission.user_id == user_id)
        records = list((await db.scalars(query.limit(limit))).all())
        snapshots = [SimpleNamespace(id=row.id,user_id=row.user_id,image_name=row.image_name,
                     image_type=row.image_type,image_storage=deepcopy(row.image_storage)) for row in records]
    for snapshot in snapshots:
        stats['examined'] += 1
        if (snapshot.image_storage or {}).get('backend') == 's3':
            stats['already_s3'] += 1
            continue
        if not storage.local_path(snapshot.user_id,snapshot.image_name).is_file():
            stats['missing'] += 1
            continue
        stats['available'] += 1
        if not apply:
            continue
        try:
            ref = await asyncio.to_thread(copy_legacy,snapshot)
            async with sessions() as db:
                current = await db.scalar(select(Submission).where(Submission.id == snapshot.id).with_for_update())
                if not current or current.image_name != snapshot.image_name:
                    db.add(EvidenceDeletion(id=uid(),storage=ref,attempts=0,retry_at=utcnow()))
                    outcome = 'changed'
                elif (current.image_storage or {}).get('backend') == 's3':
                    # Another migration already linked this object: do not delete it.
                    outcome = 'already_s3'
                else:
                    current.image_storage = ref
                    outcome = 'migrated'
                await db.commit()
                stats[outcome] += 1
        except Exception as error:
            logging.getLogger(__name__).warning('Evidence migration deferred (%s).', type(error).__name__)
            # Never print private photo names, locations, URLs or SDK exception payloads.
            stats['failed'] += 1
    return stats
