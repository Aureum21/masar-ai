# Receipt Assistant: implementation and testing

This is a selective integration of `feature/m-receipt-ocr`, adapted to master authentication, `JourneyShell`, private storage and durable processing. It does not merge the prototype's authentication, public upload directory, guest fallback, GET-side sample inserts or root layout.

## What the user can do

Open **Receipts** from the sidebar or the My Trips header. Choose images or open the camera, preview them, acknowledge the provider/privacy notice, then select **Analyze & save** or **Save without OCR**. Photos are not uploaded merely by selecting them. Camera access starts only after opening the camera and stops on close.

Saved records show uploading/queued/running, review, ready or failed states. Users may leave and return, view their private image, correct details, retry failed analysis, link an owned trip, remove a record, or print selected ready receipts from Summary & print. Processing records poll every four seconds while the tab is visible. Deletion hides the record immediately; the worker permanently deletes its image, with retry after storage failures. A minimal request tombstone prevents accidental replay.

Five synthetic examples are available only through **Try examples**. They do not create database records or enter real totals/exports. Shopping & departure map contains nine curated orientation points, with directions and official guidance; these are not a live directory of participating retailers or confirmed validation counters.

## Architecture and data

- `receipts/models.py`, `schemas.py`, `router.py`: owned records, typed inputs, revision checks, bounded pagination and authenticated image delivery.
- `receipts/service.py`: durable reservation before upload; per-owner idempotency and canonical image deduplication; separate upload/analysis/deletion states, expiring leases and worker-token fencing. Maximum 100 images / 100 MB per account and 20 new uploads per UTC day by default.
- `receipts/storage.py`: fully decodes JPG/PNG/WebP, strips metadata, limits 10 MB / 16 MP, normalizes to a JPEG of at most 2400 px. Private local storage or S3 `receipts/{user_id}/{receipt_id}.jpg`; S3 writes use AES256 and record object version IDs for exact deletion. Images are served through owner-checked API requests with `private, no-store`, not public URLs.
- `receipts/extraction.py`: bounded optional OpenAI image extraction, only invoked by the receipt worker. No retries inside the SDK, 25-second client timeout / 35-second overall extraction timeout, 650 output-token cap. Unknown or invalid fields remain unknown. Original extracted fields and later corrections remain separate.
- `receipts/policy.py`: versioned provisional estimates. Unknown currency, mixed goods/services, missing tax/date or unconfirmed retailer issuance require review. Services are excluded. The conservative AED 250 VAT-exclusive boundary remains explicit because published summaries differ. Possible estimate: 87% of recorded VAT less AED 3.60 per transaction. MASAR does not determine official eligibility, validate export or submit a Planet claim.
- `tools/receipt_worker.py`: a separate lightweight worker; it does not load SigLIP/OCR challenge models or award XP. Start one worker initially to bound provider concurrency.
- `frontend/src/components/receipts/`: scoped collection, editing, camera, private image dialog, summary/print and lazy map. Existing booking prices and Passport rewards are untouched. Trip links organize recorded spending without adding it to booking totals.

The additive revision is **`20261029_receipts`**, following `20261028_scene_evidence`. It creates **`travel_receipts`**. Existing prototype `receipts` / sample initialization tables, if present, are left untouched. Legacy prototype records/images are deliberately not silently imported; inspect ownership and storage before a separate migration. No existing production database was migrated during implementation.

## Local setup

From `C:\Users\efake\Desktop\MasarAI`, use the normal backend environment. First confirm `DATABASE_URL` points to the intended development database; back up any shared database before migrations.

Set in the local backend `.env`:

```ini
RECEIPTS_ENABLED=true
RECEIPT_STORAGE=local
RECEIPT_OCR_ENABLED=true
RECEIPT_OCR_MODEL=gpt-4o-mini
RECEIPT_DAILY_LIMIT=20
```

The existing `OPENAI_API_KEY` is used for analysis. **This OCR provider is paid**, independent of the free local challenge recognition models. Set `RECEIPT_OCR_ENABLED=false` for manual-only testing; use Save without OCR and correct fields. No real provider call was made during automated validation.

Apply the additive revision in the intended development environment:

```powershell
.\.myenv\Scripts\python.exe -m alembic upgrade head
```

Start/restart the normal backend (`fastapi dev .\main.py`) and frontend (`npm run dev` from `frontend`). Start a separate terminal for receipt jobs and deletion cleanup:

```powershell
.\.myenv\Scripts\python.exe -m tools.receipt_worker
```

The existing planning worker and evidence worker continue independently. The new receipt worker does not replace either one. Local photos default to ignored `data/receipt-private`; do not commit that folder. Keep the worker running even in manual-only mode so deleted photos are cleaned up.

Try: open `/receipts`; inspect examples; save a disposable receipt without OCR; review/correct its fields; link a trip; view its image; inspect `/receipts/summary`; delete and refresh. Analyze & save is an explicit paid-provider action. Receipt approval/estimates never grant Passport XP.

## Production preparation — not deployed by this change

Production is disabled by default (`RECEIPTS_ENABLED=false`). Before enabling: database backup, additive migration, private bucket/credentials permissions, worker and a normal frontend deployment. Configure:

```ini
RECEIPTS_ENABLED=true
RECEIPT_STORAGE=s3
RECEIPT_BUCKET=YOUR_PRIVATE_BUCKET
RECEIPT_REGION=eu-north-1
RECEIPT_OCR_ENABLED=true
RECEIPT_OCR_MODEL=gpt-4o-mini
RECEIPT_DAILY_LIMIT=20
```

Bucket/region can fall back to `PASSPORT_EVIDENCE_BUCKET` / `PASSPORT_EVIDENCE_REGION`. The bucket must have **all four S3 Block Public Access protections enabled**; never relax a public attraction-image bucket to make private receipts work. Use the private evidence bucket or another dedicated private bucket. Do not change attraction URLs.

The API and receipt worker need scoped `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:GetObjectVersion`, `s3:DeleteObjectVersion` on `arn:aws:s3:::YOUR_PRIVATE_BUCKET/receipts/*`, plus `s3:GetBucketPublicAccessBlock` on that bucket. HeadObject uses GetObject permission. Use the deployment's existing secure credential mechanism, never frontend variables or committed access keys. This change does not grant IAM permissions or create buckets. Account for retention, backups, bucket versioning and deletion permissions; restrictive retention policies can delay cleanup.

Add **`-f deploy/compose.receipts.yml`** to the usual Compose command, retaining the vision overlay when used:

```bash
masar() {
  sudo docker compose --env-file deploy/compose.env \
    -f deploy/compose.production.yml \
    -f deploy/compose.vision.yml \
    -f deploy/compose.receipts.yml "$@"
}
masar build api
# Inspect the target DB / back it up first. One-off API runs use a dynamic IP:
masar run --rm --no-deps api alembic upgrade head
masar up -d api worker evidence-worker receipt-worker
masar ps
masar logs --tail 40 receipt-worker
curl -fsS https://masar-api.efdronapps.com/health/ready
```

If this host's Compose one-off container still reports a static-IP conflict, use the previously documented `docker run --rm --env-file deploy/production.env -e MASAR_ENV=production --network masar_backend masar-backend:YOUR_TAG alembic upgrade head` procedure. Do not stop or erase the network/volumes to resolve it. The receipt overlay creates no public worker port and uses the same backend image. On a memory-limited host, stop the evidence worker during builds as in the existing deployment guide.

Restart/recreate API and receipt worker after configuration/backend changes. Frontend changes require a new frontend build/deployment. Rollback: disable the feature, stop receipt-worker and return to the prior app image; retain the additive table/private volume and backup rather than downgrading away user data.

## Validation and limits

- Isolated backend tests use temporary SQLite and local images; fake OCR and mocked S3 cover ownership, strict auth, schema/financial boundaries, upload sanitization, quotas, idempotency, recovery/fencing, partial edits, private images, cleanup failure and the additive migration. They do not prove real-model accuracy or live S3 permissions.
- Validation: **20 receipt backend tests passed**; **72 existing Passport/challenge/Time Travel/production backend tests passed**; **9 receipt frontend tests** and **99 existing frontend tests passed**. Production Next.js build passed with all three receipt routes. Focused lint: zero errors, three existing/intended `img` optimization warnings (including local blob/private image previews). `git diff --check` passed.
- The separate PostgreSQL-backed planning/booking suites were not run: their isolated `127.0.0.1:55432` fixture database is unavailable. They were not redirected to the app's configured/shared database. Existing frontend planning/booking regression checks passed; backend booking and planning code was not changed.
- Live browser check: authenticated local shell, explicit examples and image dialog; collection API availability depends on starting the backend/applying the new migration. No user receipt was uploaded or paid inference triggered for that check.
- PDF/multi-page OCR, live FX, guaranteed settlement fees, official Planet status/claims and payments are not implemented. Export is a personal browser print/save-PDF document, not an official claim.
- Lease recovery provides at-least-once processing after crashes. A provider request that succeeded just before a crash can be billed again on recovery; normal repeated clicks/idempotent retries do not start additional jobs. Do not claim exactly-once external provider charges.
- Automated tests do not benchmark real-image OCR. No live PostgreSQL migration, S3 write/IAM change, deployment or push is part of this implementation.
