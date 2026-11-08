# Private challenge evidence in S3

## What this solves

Previously the shared database stored a photo filename, while the actual file
was on the machine that accepted the upload. A local development upload could
therefore show “Evidence image not found” when viewed on the deployed server.
An S3 reference records its bucket, region, owner-scoped key, content hash and
object version in the submission. Both API and worker use the same object.

This does not reconstruct a missing photo. Existing photos must be copied from
the machine/volume where they still exist. The migration tool reports missing
files and never substitutes another image or changes an award/XP balance.

## Design and changed files

- `passport/evidence_storage.py`: private upload/read/delete, sanitization,
  bucket privacy preflight, SSE-S3 encryption, quotas, safe references, content
  integrity and temporary worker files. No browser-visible S3 URL is generated.
- `passport/models.py`, `alembic/versions/20261028_evidence_s3.py`: nullable
  `Submission.image_storage` JSON plus durable `EvidenceDeletion` outbox.
  Legacy NULL references still mean local files. Stored S3 references continue
  to work even if the default backend/bucket configuration later changes.
- `passport/router.py`, `passport/service.py`, `main.py`: authenticated photo
  bytes, upload compensation, and post-commit cleanup on photo/trip removal.
- `passport/evidence_cleanup.py`: failed remote deletions stay in the database
  with bounded backoff. API background tasks try after responding; the same
  evidence worker retries every 30 seconds while running (after long inference
  completes). No additional worker is introduced.
- `passport/verification.py`, `tools/evidence_worker.py`: private S3 downloads
  exist only inside a request-scoped temporary directory during inference;
  success/error paths remove the temporary copy. Pixel reuse receipts and
  exactly-once awards are unchanged.
- `passport/migrate_evidence.py`, `tools/evidence_storage.py`: dry-run/apply
  migration, exact-byte verification and restart support; originals are kept.
- `config/production.py`, deployment examples and `tests/test_evidence_s3.py`.

## AWS setup

The intended bucket is the existing `masarai-pics` in `eu-north-1`, under:

```text
passport-evidence/<user-id>/<random-photo-id>.png
passport-evidence/<user-id>/<random-photo-id>.jpg
```

All four bucket-level Block Public Access protections must be enabled. Uploads
fail closed if privacy cannot be verified or AWS is unavailable: there is no
silent local fallback. Nothing changes the bucket's policy, public-access
configuration, CORS, attraction photos or other objects automatically.

Grant the backend AND evidence worker a scoped runtime identity using
`deploy/evidence-s3-policy.example.json` as a reviewable identity-policy example.
It allows only the evidence prefix plus bucket privacy inspection. It does not
grant bucket-policy changes, public ACLs or access to unrelated objects. Existing
attraction-read permissions remain separate. No frontend AWS credentials.

Local development uses the existing AWS profile `masar`. On this computer the
CLI is available at:

```powershell
& "C:\Users\efake\Desktop\threeJs_animation\sandbox\aws-cli\extracted\Amazon\AWSCLIV2\aws.exe" login --profile masar --region eu-north-1
```

For Lightsail use the existing supported production credential mechanism with
the policy above. Do not copy expiring desktop login/cache files into Docker or
use root keys. Production validation deliberately rejects `AWS_PROFILE`. The
current attraction-only role may need the explicitly scoped evidence rights.

## Local activation

Stop/restart the API and evidence worker around the additive migration. From
the MASAR repository, using the existing backend environment:

```powershell
.\.myenv\Scripts\python.exe -m alembic upgrade head
```

Expected head: `20261028_evidence_s3`. This keeps existing photos and rewards.
New settings in private local `.env` (one occurrence per setting):

```dotenv
PASSPORT_EVIDENCE_STORAGE=s3
PASSPORT_EVIDENCE_BUCKET=masarai-pics
PASSPORT_EVIDENCE_REGION=eu-north-1
```

Verify AWS access/privacy without uploading any photo:

```powershell
.\.myenv\Scripts\python.exe -m tools.evidence_storage check
```

Preview local photos eligible to copy, then apply:

```powershell
.\.myenv\Scripts\python.exe -m tools.evidence_storage migrate
.\.myenv\Scripts\python.exe -m tools.evidence_storage migrate --apply
```

Both commands print counts only, not private photo names/captions/URLs. Use
`--user-id ID` to scope to one owner or `--limit N` for a larger scan. Run from
the original computer for locally uploaded photos and from the server for
server-local photos. Apply verifies the exact uploaded bytes before changing
the submission reference, checks for concurrent deletion, and retains originals
as a backup. Re-running skips already-linked S3 records and can resume a verified
upload whose database update was interrupted. Missing local files remain missing.

Restart `fastapi dev .\main.py` and the existing
`.\.visionenv\Scripts\python.exe -m tools.evidence_worker`. Frontend refresh
only; no frontend code or extra dependency installation is required.

## Deployment

Set the same three settings in `deploy/production.env`. API and evidence worker
must have S3 credentials/permissions; neither publishes an S3 URL. Rebuild the
API image, then vision image, apply the migration, and recreate both API and
workers using the existing deployment procedure. For an already-running API,
use a separate one-off Docker container to avoid its fixed-IP conflict:

```bash
sudo docker run --rm --env-file deploy/production.env -e MASAR_ENV=production --network masar_backend masar-backend:efa-release alembic upgrade head
```

Keep the existing `evidence` volume: legacy local records still need it until
migrated. No local files, bucket objects, volumes or existing images are purged
by activation/migration. Do not remove the old volume or originals until copies
have been verified on the deployed app.

## Deletion and failure semantics

Photo removal clears the authorized API reference after DB commit while keeping
earned XP/stamps. The durable outbox then deletes the S3 object/version. Versioned
uploads record the exact VersionId and deletion targets that version; this needs
GetObjectVersion/DeleteObjectVersion permissions. Object Lock/retention or denied
permissions can delay physical removal. Such failures remain queued and logged
with sanitized exception class names; API access is already revoked.

Manually retry due deletions with:

```powershell
.\.myenv\Scripts\python.exe -m tools.evidence_storage cleanup
```

The outbox survives deletion of the source trip/submission. A failed DB commit
after a successful upload triggers compensating object deletion; failed cleanup
is persisted where the DB is available. S3 and PostgreSQL are not one atomic
transaction: an ambiguous upload timeout, or simultaneous database and cleanup
outage, can leave an unlinked private object requiring operator reconciliation.
No uploaded object is made public or automatically replaced to hide this failure.

## Verification and limits

Uploads strip EXIF/GPS/comments, use AES256 server-side encryption and private
cache headers, and store no credentials. Owner-scoped keys are validated before
reads/deletes; the API checks owner/operator authorization BEFORE contacting S3.
Sanitized S3 photos are capped at 20 MB and each owner at 100 objects / 100 MB.
Successful legacy migrations do not re-encode photos or change their pixel hashes.

Tests use fake S3 transport with real temporary API/database transactions, not
public AWS calls. They cover privacy rejection, encryption, authorization, quota,
sanitization/legacy behavior, temporary files, integrity, rollback compensation,
durable deletion retry, additive migration and verified copy/restart behavior.
Real AWS verification (2026-10-28): reviewed the existing `masarai-pics`
bucket: no bucket policy and no public ACL grants. Enabled all four bucket-level
Block Public Access protections. Versioning was disabled. Copied and linked five
legacy evidence photos; all five private downloads passed SHA-256 verification,
all five objects reported AES256 encryption, and all five local originals remain.
One pre-existing evidence file was missing locally and could not be recovered.
No real-model recognition accuracy was evaluated by these storage checks.

The local `.env` now selects S3. Restart the local API and evidence worker to
reload configuration. This does not update the deployed server: it still needs
the new code, evidence settings, migration and scoped machine credentials.
The desktop AWS login is temporary and is not a production credential.

Validation: 17 storage tests, 34 existing Passport/boxing tests, 23 scene/worker/
summary/display tests and 13 production configuration tests passed. Real S3
verification also exposed a partial-stream read, now covered by a regression
test; the standalone migration explicitly registers core FK tables before flush.

AWS references: [PutObject](https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/put_object.html),
[Block Public Access inspection](https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/get_public_access_block.html),
[versioned object deletion](https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/delete_object.html).
