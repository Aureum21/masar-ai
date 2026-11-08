"""Upload reviewed licensed photos; optionally sync only media fields in the catalogue.

Run from the repository root: python -m tools.upload_attraction_photos --upload --sync-db
Without flags this validates the manifest and local files only. Never changes bucket access.
"""
import argparse
import asyncio
import hashlib
import json
import os
from pathlib import Path
from config.runtime import load_environment

ROOT = Path(__file__).resolve().parents[1]

def reviewed_photos():
    photos = json.loads((ROOT / 'data/attraction_photos.v1.json').read_text(encoding='utf-8'))['photos']
    from domain.attractions import BY_ID
    seen = set()
    for photo in photos:
        pid = photo['id']
        if pid not in BY_ID or pid in seen:
            raise ValueError('Duplicate or unknown attraction: ' + pid)
        seen.add(pid)
        expected = f"/attraction-photos/{pid}.webp"
        if photo['local_path'] != expected or not photo['object_key'].startswith(f'attractions/{pid}/') or '..' in photo['object_key']:
            raise ValueError('Invalid media path: ' + pid)
        if (not photo['license'].startswith(('CC BY ', 'CC BY-SA ', 'CC0', 'Public domain', 'PDM')) or 'NC' in photo['license'] or 'ND' in photo['license']) or not photo['page_url'].startswith('https://commons.wikimedia.org/wiki/File:') or not photo['author']:
            raise ValueError('Incomplete photo credit: ' + pid)
        local = ROOT / 'frontend/public' / photo['local_path'].lstrip('/')
        if hashlib.sha256(local.read_bytes()).hexdigest() != photo['sha256']:
            raise ValueError('Photo checksum mismatch: ' + pid)
    return photos

def upload(photos):
    from botocore.exceptions import ClientError
    from services.attraction_media import s3_client
    bucket = os.environ['S3_BUCKET_NAME']
    client = s3_client(os.getenv('AWS_PROFILE', ''), os.getenv('AWS_DEFAULT_REGION', 'eu-north-1'))
    client.head_bucket(Bucket=bucket)
    for photo in photos:
        try:
            previous = client.head_object(Bucket=bucket, Key=photo['object_key'])
        except ClientError as error:
            if error.response['Error']['Code'] not in ('404', 'NoSuchKey', 'NotFound'):
                raise
            previous = {}
        if previous.get('Metadata', {}).get('sha256') != photo['sha256']:
            body = (ROOT / 'frontend/public' / photo['local_path'].lstrip('/')).read_bytes()
            client.put_object(Bucket=bucket, Key=photo['object_key'], Body=body, ContentType='image/webp', CacheControl='public, max-age=31536000, immutable', ServerSideEncryption='AES256', Metadata={'sha256': photo['sha256']})
        verified = client.head_object(Bucket=bucket, Key=photo['object_key'])
        if verified['ContentLength'] != photo['bytes'] or verified.get('Metadata', {}).get('sha256') != photo['sha256']:
            raise RuntimeError('S3 verification failed: ' + photo['id'])
        print('Verified:', photo['id'], flush=True)

async def sync(photos):
    from sqlalchemy import select
    from database import AsyncSessionLocal, engine
    from models import Attraction
    try:
        async with AsyncSessionLocal() as db:
            for photo in photos:
                row = await db.scalar(select(Attraction).where(Attraction.id == photo['id']).with_for_update())
                if row is None:
                    raise RuntimeError('Seed catalogue before syncing photos: ' + photo['id'])
                data = dict(row.data)
                # Preserve non-photo attribution and all destination/challenge metadata.
                credits = [c for c in data.get('attribution', []) if c.get('type') != 'photo']
                credits.append({'type': 'photo', 'label': f"Photo: {photo['author']} · {photo['license']} · Resized to WebP", 'url': photo['page_url'], 'licenseUrl': photo['license_url']})
                data.update(images=[photo['local_path']], imageFallbacks=[photo['local_path']], photoAssets=[photo], attribution=credits)
                row.data = data
            await db.commit()
        print('Catalogue media updated:', len(photos))
    finally:
        await engine.dispose()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--upload', action='store_true')
    parser.add_argument('--sync-db', action='store_true')
    args = parser.parse_args()
    load_environment()
    photos = reviewed_photos()
    print('Validated licensed photos:', len(photos))
    if args.upload:
        upload(photos)
    if args.sync_db:
        asyncio.run(sync(photos))

if __name__ == '__main__':
    main()
