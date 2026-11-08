"""Private S3 delivery with bounded hydration and bundled-photo fallback."""
import asyncio
import logging
import os
import time
from functools import lru_cache
from threading import Lock
from config.runtime import load_environment

log = logging.getLogger(__name__)
_urls = {}
_unavailable = {}
_lock = Lock()
_signing = Lock()


@lru_cache(maxsize=4)
def s3_client(profile, region):
    import boto3
    from botocore.config import Config
    return boto3.Session(profile_name=profile or None, region_name=region).client(
        's3', config=Config(connect_timeout=2, read_timeout=2, retries={'max_attempts': 1}))


def photo_url(photo):
    fallback = photo['local_path']
    load_environment()
    bucket = os.getenv('S3_BUCKET_NAME')
    key = photo.get('object_key', '')
    if os.getenv('MASAR_ENV') == 'test' or not bucket or not key.startswith('attractions/') or '..' in key:
        return fallback
    profile = os.getenv('AWS_PROFILE', '')
    region = os.getenv('AWS_DEFAULT_REGION', 'eu-north-1')
    scope = (bucket, profile, region)
    now = time.monotonic()
    # A login/credential failure affects all photos, not just one object.
    with _lock:
        if _unavailable.get(scope, 0) > now:
            return fallback
    # Never queue requests behind a slow SDK credential refresh.
    if not _signing.acquire(blocking=False):
        return fallback
    try:
        ttl = max(60, min(3600, int(os.getenv('S3_PHOTO_URL_TTL', '3600'))))
        cache_key = (bucket, key, profile, region, ttl)
        with _lock:
            cached = _urls.get(cache_key)
            if cached and cached[0] > now:
                return cached[1]
        url = s3_client(profile, region).generate_presigned_url('get_object', Params={'Bucket': bucket, 'Key': key}, ExpiresIn=ttl)
        with _lock:
            _urls[cache_key] = (now + min(600, ttl / 2), url)
            _unavailable.pop(scope, None)
        return url
    except Exception as error:
        with _lock:
            _unavailable[scope] = time.monotonic() + 60
        # Never log signed URLs, credentials or provider exception payloads.
        reason = type(error).__name__
        action = 'Renew the local AWS login.' if reason in {'LoginRefreshRequired', 'TokenRetrievalError', 'SSOTokenLoadError', 'UnauthorizedSSOTokenError'} else 'Check AWS credentials/configuration.'
        log.warning('Attraction S3 signing unavailable (%s). %s Bundled photos are active; retrying S3 in 60 seconds.', reason, action)
        return fallback
    finally:
        _signing.release()


def hydrate_images(place, local_only=False):
    photos = place.get('photoAssets', [])
    if not photos:
        return place
    local = [p['local_path'] for p in photos]
    return {**place, 'images': local if local_only else [photo_url(p) for p in photos], 'imageFallbacks': local}


async def hydrate_catalogue_images(items, timeout=2):
    # Catalogue metadata must not wait indefinitely for optional AWS signing.
    try:
        return await asyncio.wait_for(asyncio.to_thread(lambda: [hydrate_images(item) for item in items]), timeout)
    except TimeoutError:
        return [hydrate_images(item, local_only=True) for item in items]
