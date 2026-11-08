# Attraction photos

The reviewed set contains 40 real Wikimedia Commons photographs, optimized to about 6.9 MB total. Each photo's file page, author, license, changes and checksum are in `data/attraction_photos.v1.json`. The `pending` list records 18 entries: two retain existing app exterior images; 16 still need an exact reusable photo. Do not substitute a different destination. Some museum photos show an interior or exhibit, and the Al Marjan photo shows the coastal island complex.

## Delivery

Local fallback files live in `frontend/public/attraction-photos/`. The catalogue database stores local paths, stable S3 keys and credits, never expiring signed URLs. Authenticated catalogue endpoints sign private S3 GET URLs for one hour, caching signatures for ten minutes. If AWS credentials cannot refresh, the API returns local paths. Cards and map popups also switch to the bundled copy if a signed link expires. Agents receive local media references without the asset metadata or signed links.

The `masarai-pics` bucket in `eu-north-1` remains private. No bucket policy, ACL or public-access setting was changed. Objects use S3 AES256 encryption. AWS authentication is the official browser login profile `masar`; no permanent access keys were created or placed in `.env`.

## Reproduce

1. Install backend requirements, including `boto3[crt]`.
2. Run `aws login --profile masar --region eu-north-1` using AWS CLI 2.32 or newer. The development login eventually needs renewal. For a deployed backend, use an IAM role scoped to the media prefix rather than copying a developer login.
3. Set the nonsecret AWS/S3 settings shown in `.env.example` in the backend `.env`.
4. Run `python -m tools.upload_attraction_photos` to validate licenses and file checksums without uploading.
5. Run `python -m tools.upload_attraction_photos --upload --sync-db` from the repository root. This verifies every object, skips identical uploads, and updates only media fields in existing attraction rows in one database transaction. It never deletes destinations or changes bucket access.
6. Restart the backend if necessary and refresh Explore. The standalone planning worker does not need AWS permissions to plan trips.

Photo credit links appear on the Explore cards and map popups. Preserve these credits and the manifest when reusing the assets. CC BY-SA derivative images retain their individual licenses; this does not license unrelated application code under CC BY-SA.


## Expired local AWS login

`LoginRefreshRequired` means the developer login needs renewal, not that the
attraction records or photos have been deleted. Run `aws login --profile masar
--region eu-north-1` in PowerShell, completing sign-in in the AWS browser window.
Restart the local backend afterward, or allow up to 60 seconds for its signing
cooldown to expire. Never paste access tokens or credentials into chat.

A failed signing configuration now enters a 60-second cooldown shared by all
photos, with a single sanitized warning. Concurrent requests use bundled photos
instead of waiting behind credential refresh. A catalogue response spends at
most two seconds waiting for optional image hydration before returning all of
its destination metadata with bundled image paths. The database query itself
is separate from that image budget. Explore also has a 15-second loading
limit and a visible retry action, preserving any already loaded destinations.
