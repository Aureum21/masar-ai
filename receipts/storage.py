"""Receipt-specific private local/S3 namespace, separate from Passport evidence."""
from io import BytesIO
import hashlib,os,re
from pathlib import Path
from fastapi import HTTPException
from PIL import Image,ImageOps,UnidentifiedImageError
from passport.evidence_storage import client_for,require_private

MAX_BYTES=10*1024*1024
def sanitize(raw):
    if not raw or len(raw)>MAX_BYTES:raise HTTPException(413,'Choose a non-empty image up to 10 MB.')
    try:
        with Image.open(BytesIO(raw)) as image:
            if image.format not in {'JPEG','PNG','WEBP'} or image.width*image.height>16_000_000:raise ValueError()
            image=ImageOps.exif_transpose(image).convert('RGB')
            image.thumbnail((2400,2400))
            clean=Image.new('RGB',image.size);clean.paste(image)
            output=BytesIO();clean.save(output,format='JPEG',quality=88,optimize=True)
            data=output.getvalue()
        if len(data)>MAX_BYTES:raise ValueError()
        return data,hashlib.sha256(data).hexdigest()
    except (ValueError,OSError,UnidentifiedImageError,Image.DecompressionBombError):
        raise HTTPException(422,'Choose a valid JPG, PNG or WebP image, up to 16 megapixels. PDF OCR is not supported.') from None

def reference(user_id,identity):
    backend=os.getenv('RECEIPT_STORAGE') or ('s3' if os.getenv('MASAR_ENV')=='production' else 'local')
    ref={'backend':backend,'user_id':user_id,'receipt_id':identity,'key':f'receipts/{user_id}/{identity}.jpg'}
    if backend=='s3':ref.update(bucket=os.getenv('RECEIPT_BUCKET') or os.getenv('PASSPORT_EVIDENCE_BUCKET',''),region=os.getenv('RECEIPT_REGION') or os.getenv('PASSPORT_EVIDENCE_REGION','eu-north-1'))
    return validate(ref)

def validate(ref):
    if not isinstance(ref,dict) or type(ref.get('user_id')) is not int or ref['user_id']<1 or not re.fullmatch('[a-f0-9]{32}',ref.get('receipt_id','')):
        raise HTTPException(503,'Invalid private receipt reference.')
    if ref.get('backend') not in {'local','s3'} or ref.get('key')!=f"receipts/{ref['user_id']}/{ref['receipt_id']}.jpg":raise HTTPException(503,'Invalid receipt storage configuration.')
    if ref['backend']=='s3' and (not re.fullmatch('[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]',ref.get('bucket','')) or not re.fullmatch('[a-z0-9-]{3,40}',ref.get('region',''))):raise HTTPException(503,'Configure a private receipt bucket and region.')
    if ref.get('version_id') is not None and (not isinstance(ref['version_id'],str) or len(ref['version_id'])>1024):raise HTTPException(503,'Invalid private receipt version reference.')
    return ref

def path_for(ref):
    validate(ref)
    root=Path(os.getenv('RECEIPT_DIR',str(Path(__file__).resolve().parents[1]/'data/receipt-private'))).resolve()
    return root/str(ref['user_id'])/(ref['receipt_id']+'.jpg')

def put(ref,data):
    validate(ref)
    try:
        if ref['backend']=='local':
            path=path_for(ref);path.parent.mkdir(parents=True,exist_ok=True)
            with path.open('xb') as output:output.write(data)
            return ref
        else:
            client=client_for(ref);require_private(client,ref['bucket'])
            result=client.put_object(Bucket=ref['bucket'],Key=ref['key'],Body=data,ContentType='image/jpeg',CacheControl='private, no-store',ServerSideEncryption='AES256',IfNoneMatch='*')
            return {**ref,**({'version_id':result['VersionId']} if result.get('VersionId') else {})}
    except HTTPException:raise
    except Exception:raise HTTPException(503,'Private receipt storage is unavailable. No public image was created.') from None

def read(ref):
    validate(ref)
    try:
        if ref['backend']=='local':
            path=path_for(ref)
            if not path.is_file():raise HTTPException(404,'Original receipt image is unavailable.')
            if path.stat().st_size>MAX_BYTES:raise HTTPException(413,'Stored receipt is too large.')
            data=path.read_bytes()
        else:
            response=client_for(ref).get_object(Bucket=ref['bucket'],Key=ref['key'],**({'VersionId':ref['version_id']} if ref.get('version_id') else {}))
            body=response['Body']
            try:
                chunks=[];size=0
                while size<=MAX_BYTES:
                    chunk=body.read(min(65536,MAX_BYTES+1-size))
                    if not chunk:break
                    chunks.append(chunk);size+=len(chunk)
                data=b''.join(chunks)
                if len(data)>MAX_BYTES:raise HTTPException(413,'Stored receipt is too large.')
            finally:body.close()
        if ref.get('sha256') and hashlib.sha256(data).hexdigest()!=ref['sha256']:raise HTTPException(503,'Private receipt integrity check failed.')
        return data
    except HTTPException:raise
    except Exception:raise HTTPException(503,'Private receipt image is temporarily unavailable. Please retry.') from None

def delete(ref):
    validate(ref)
    if ref['backend']=='local':path_for(ref).unlink(missing_ok=True)
    else:
        client=client_for(ref);version=ref.get('version_id')
        if not version:
            try:version=client.head_object(Bucket=ref['bucket'],Key=ref['key']).get('VersionId')
            except Exception as error:
                if getattr(error,'response',{}).get('Error',{}).get('Code') in {'404','NoSuchKey','NotFound'}:return
                raise
        client.delete_object(Bucket=ref['bucket'],Key=ref['key'],**({'VersionId':version} if version else {}))
