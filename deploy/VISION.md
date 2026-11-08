# Automatic challenge photo checks — optional pilot

The current extension is described in [Shared evaluator guide](../docs/vision-evaluators.md).
It adds coastal sunset, Burj Khalifa and Dubai Frame checks to the same worker.
Apply migration `20261028_scene_evidence` before restarting updated workers.
The boxing setup below remains compatible; new scene checks have a separate flag.

## What changed

The API saves a private photo and durable job, then responds immediately. A
separate evidence worker loads SigLIP 2 and PaddleOCR on CPU. It checks the
scene, matches the user's entered score to a high-confidence standalone OCR
reading above 600, and avoids clearly labelled high-score displays.

Known MASAR demonstration fingerprints and previously awarded exact pixel
fingerprints do not earn points. Novel renders, modified photos and dishonest
claims can still evade these checks. This verifies photo content; it does not
verify attendance, GPS, liveness, date, ownership or venue availability.
The confirmations in the form are user attestations, not independent checks.

High-confidence matches award the existing XP and stamp in one database
transaction. A unique challenge award and image receipt prevent double
awards. Clear scene mismatches fail; uncertainty or model errors request
another attempt. Failed attempts never deduct XP. Results also enter the
account's notification inbox. Existing manual photo submissions remain manual.

Boxing plus the explicitly enabled scene evaluators are covered. Bowling and
unsupported landmarks retain manual review; historical manual submissions are not converted. Coupon redemption is unchanged in this step;
current coupons remain demonstrations and do not spend XP.

## Local setup

Keep the existing API and planner environments unchanged. Create a separate
environment for the evidence worker from the MASAR repository root:

```powershell
python -m venv .visionenv
.\.visionenv\Scripts\python.exe -m pip install -r requirements.txt
.\.visionenv\Scripts\python.exe -m pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
.\.visionenv\Scripts\python.exe -m pip install -r requirements.vision.txt
```

Apply the additive migration using the existing backend environment:

```powershell
.\.myenv\Scripts\python.exe -m alembic upgrade head
```

Add `PASSPORT_AUTO_BOXING=true` to the backend's local `.env`, restart the API,
and start the evidence worker in a separate terminal:

```powershell
.\.visionenv\Scripts\python.exe -m tools.evidence_worker
```

For this computer only, the weights downloaded by Vision Lab can be reused
without downloading again. Set this in the **evidence worker's terminal**:

```powershell
$env:PASSPORT_VISION_CACHE='C:\Users\efake\Desktop\threeJs_animation\vision-lab\.cache'
```

Otherwise weights are cached in `.cache/passport-vision`. Initial downloads
need internet. First inference takes longer; subsequent checks reuse models.
There is no vision API key and no per-request vision provider charge.

## Test yourself

1. Open a trip's supported boxing task and enable/accept it.
2. Enter your own final score above 600 and tick both confirmations.
3. Upload a real, clear machine-and-score photograph and a venue caption.
4. Submit: the dialog shows automatic checking, then approval or retry feedback.
5. Leave and reopen the task: the saved result remains. Check the bell inbox
   and passport XP after approval.
6. Test a wrong scene, a blurred score, a known demo photo, and an already
   awarded photograph from another task. None should earn an extra award.
7. Stop/restart the worker while jobs are queued: queued jobs survive; a
   crashed running job becomes claimable after its five-minute lease expires.

Old submissions already waiting for human review are not silently migrated.
Automatic mode defaults to **off** until configured. If it is on without a
running worker, new jobs stay queued. Switching the flag off affects new
submissions; already queued jobs can still complete.

## AWS / Docker

The optional worker can use up to 3 GB RAM plus the API and planner's memory.
The current 4 GB Lightsail instance may be tight under concurrent planning.
Benchmark memory and inference with representative real photos before
enabling automatic awards publicly. The limit constrains the process; it does
not guarantee all three services fit in 4 GB.

After pushing this code, pull `efa` on the server. Build the normal backend
first, then build the optional vision worker:

```bash
sudo docker compose --env-file deploy/compose.env -f deploy/compose.production.yml build api
sudo docker compose --env-file deploy/compose.env -f deploy/compose.production.yml -f deploy/compose.vision.yml build evidence-worker
sudo docker run --rm --env-file deploy/production.env -e MASAR_ENV=production --network masar_backend masar-backend:efa-release alembic upgrade head
```

Set `PASSPORT_AUTO_BOXING=true` in `deploy/production.env`, then start/recreate:

```bash
sudo docker compose --env-file deploy/compose.env -f deploy/compose.production.yml -f deploy/compose.vision.yml up -d api worker proxy evidence-worker
sudo docker compose --env-file deploy/compose.env -f deploy/compose.production.yml -f deploy/compose.vision.yml logs --tail 50 evidence-worker
```

The worker has no public HTTP port. Only the worker image contains model
runtimes. Its cache and evidence are mounted volumes. Existing planner
health checks are unchanged. The Docker overlay must be supplied when
managing the evidence worker. The Linux vision image needs its own build and
deployment validation; local model checks were performed on Windows.

## Validation

`python -m unittest tests.test_boxing_verification tests.test_passport`
uses temporary SQLite with deterministic model observations and no paid
providers. Real model inference was separately exercised with the Vision Lab
cache; the known rendered sample is filtered before any automatic award.

Keep the default pilot thresholds in `passport/boxing_rules.py` until they
have been evaluated against real positive/negative photos. Match scores are
not calibrated validity probabilities.


## Submission status and connection recovery

My Trips → open the trip → Submission status lists each saved attempt, its
reference, and its last state: queued, checking, approved, or action needed.
Open the entry for feedback. Pending automatic submissions refresh in the
background; a delayed message is not a rejection or proof the worker is online.
Manual submissions remain awaiting review. No need to re-upload while pending.

After updating worker code, stop its old process with Ctrl+C and rerun
`python -m tools.evidence_worker` using the vision environment. Restart the API
if not using reload, and refresh the frontend. No new migration is needed here.
The worker now reports connection success, sanitized failure type, retry delay,
and the short submission reference when picked up. Its health probe allows
15 seconds, including connection acquisition, before retrying. Persistent errors
still require checking the database/network; a timeout cannot be cured by UI.
Model inference does not hold an idle database transaction. Interrupted lease
refreshes retry; expired leases can be reclaimed and token checks prevent an old
worker from awarding after replacement. Reward eligibility is unchanged.


## Strict and light demo evaluation

The original strict evaluator remains `boxing-vision-v1`. A source backup is in
`sandbox/boxing-strict-backup-20261028-084233/` (ignored by Git, no secrets).

Set `PASSPORT_BOXING_DEMO_ALLOWED=true` only on a testing installation to expose
the submission form's **Evaluation mode** selector. Strict remains the default.
This local development copy has the flag enabled in its private `.env`; the
production example defaults to false. Restart the API and evidence worker after
updating. Existing pending submissions retain their captured profile (legacy
submissions are strict); changing the selector does not re-evaluate an old result.

Light demo permits screenshots and known animation images, but does not auto-pass
them. It requires a boxing-machine scene score of at least 0.45, leading the
non-boxing scene labels by at least 0.05, and an exact entered score token read by
OCR with confidence at least 0.70. The score must still be 601–9999. Screenshot,
illustration, display-location and nearby-high-score restrictions are skipped in
this explicitly labelled test profile. These are uncalibrated model thresholds.

The API validates the profile and captures it in the saved submission; the worker
uses that snapshot. Both strict and light evaluation now grant the same **main XP
and stamps** for normal trip challenges. Existing demo-adventure trips still use
their separate demo rewards. New awards record the reward type explicitly;
previously issued demo rewards are not retroactively converted.

Image reuse protection and exactly-once challenge awards apply to both profiles.
A completed challenge cannot award again: use a new trip/challenge to repeat an
approval test. No database migration or new model download is required. Disable
the flag and restart the API to remove the light option. Light evaluation reduces
rejections/retries; it uses the same models and does not shorten model startup.


## Private S3 evidence

See [Private S3 evidence setup](../docs/evidence-s3.md) for shared cloud storage,
legacy-photo migration and scoped runtime permissions. Apply the additive
`20261028_evidence_s3` migration before running the updated API/worker.
