# Shared challenge evaluators

## Current scope

One durable `EvidenceCheck` queue and `python -m tools.evidence_worker` process
serve all supported photo checks. Existing boxing jobs without registry fields
are interpreted as boxing. Historical manual submissions stay manual.

| Task | Evidence | Automatic check |
| --- | --- | --- |
| Boxing | One photo, score 601–9999, confirmations | Existing strict/light machine and exact OCR score rules |
| Sunset Seeker | One photo, declared capture timestamp with timezone, beach/viewpoint name, confirmation | Beach/coastal sunset scene; declaration format and configured sunset window |
| Burj Khalifa | Three different photos, existing quiz, caption, confirmation | Correct landmark independently in each photo; correct quiz required before enqueue |
| Dubai Frame | Three different photos, rectangle-shape quiz, caption, confirmation | Correct landmark independently in each photo |

Dubai Frame has an evidence-only task view. No frame animation asset exists,
and no other landmark's animation is substituted. It can be activated on a
Dubai Frame stop already in an itinerary. Planner animation eligibility and
catalogue discovery flags are deliberately unchanged.

Other landmarks, bowling, and fictional demo-adventure photo tasks retain their
existing review/simulation flows. Both strict and light approvals on normal
trips award normal main XP. Fictional demo trips retain separate demo rewards.

## File map and lifecycle

- `passport/evaluators.py`: registry and dispatch from trusted saved challenge
  metadata, flag gating, legacy job fallback, policy versions.
- `passport/scene_rules.py`: pure scene rules and user-declaration validation.
  Boxing continues to use `passport/boxing_rules.py` unchanged.
- `passport/vision_models.py`: one in-memory SigLIP2 processor/model shared
  across label sets; PaddleOCR imported/loaded only for boxing. Initial weight
  downloads remain necessary if no cache exists. No new model/API is added.
- `passport/router.py`: original photo-count/quiz validation, declaration
  checks, profile validation and idempotent submission before enqueue.
- `passport/verification.py`: existing claim/lease/heartbeat flow; per-photo
  assessment; final task/token/availability recheck; transactional awards and
  private notification. No DB transaction stays open during inference.
- `passport/models.py` and migration `20261028_scene_evidence`: additive
  `passport_evidence_photo_uses` receipts. Existing queue and receipts remain.
- Shared submission/status components in
  `frontend/src/components/trips/workspace/` plus the legacy Journey entry point.

Three landmark uploads retain the existing sanitized 1000×2250 contact sheet.
The worker crops the three 1000×750 tiles and runs each individually, in order.
Every tile must pass. The original source-photo pixel hashes and the sanitized
sheet hash receive receipts in the same award transaction. Reordering a sheet
or reusing just one previously awarded source photo is blocked for new jobs.
Legacy awards only have their historical whole-image receipt; original
individual photos cannot be reconstructed into historical source receipts.
Modified/re-encoded photos may evade exact pixel hashing. This is not robust
near-duplicate or fraud detection. Database uniqueness and ordered PostgreSQL
advisory locks protect overlapping receipts across simultaneous workers/users.

## Local setup and restart

Stop the API and evidence worker before migrating. From the MASAR repository:

```powershell
.\.myenv\Scripts\python.exe -m alembic upgrade head
```

Expected new head: `20261028_scene_evidence`. This migration only adds a receipt
table/index; it does not change balances, awards, existing jobs or photos.
Use the existing vision environment/dependencies; no reinstall is required.

Set these values in the private local `.env` (one entry per setting):

```dotenv
PASSPORT_AUTO_BOXING=true
PASSPORT_AUTO_SCENES=true
PASSPORT_VISION_LIGHT_ALLOWED=true
```

`PASSPORT_AUTO_SCENES` defaults off. `PASSPORT_VISION_LIGHT_ALLOWED` defaults
off in the production example. If it is absent, the existing
`PASSPORT_BOXING_DEMO_ALLOWED` flag remains a backwards-compatible fallback.
Strict is the default form selection. The API captures the chosen profile and
policy in each job; changing flags affects new submissions, not queued jobs.
Unknown policy versions request a fresh attempt instead of silently changing rules.

Restart:

```powershell
fastapi dev .\main.py
# Separate terminal:
.\.visionenv\Scripts\python.exe -m tools.evidence_worker
# Frontend directory, separate terminal:
npm run dev
```

Keep the planning worker running separately if testing trip generation.
Refresh the frontend. On an existing normal trip containing an eligible stop,
enable challenges and submit a NEW attempt. Sunset fields use UAE time (+04:00).
Existing pending manual submissions do not become automatic.

## Rules and limitations

New scene policies use provisional thresholds: strict subject score >=0.70
with >=0.20 lead over competitors and screenshot/illustration scores <0.35.
Light subject score >=0.45 with >=0.05 lead over unrelated scenes; screenshot
labels are not blockers. Strong unrelated scenes reject; uncertainty retries.
These sigmoid match scores are NOT calibrated validity probabilities.

Landmark checks require the correct landmark to remain recognizable in all
three photographs. Cropped architectural details may be inconclusive. The
model does not separately certify each requested fine architectural feature.
Sunset recognition does not establish season, capture time or real attendance.
Dates/locations are USER DECLARATIONS, not verified EXIF/GPS: sanitization strips
EXIF. When a trusted suggested window is present, the declared time must fall
inside it. Without one, only timestamp/location format is checked.

Strict screenshot recognition and scene identity are fallible. Light mode is
for testing and permits screenshots; it can still award MAIN XP as requested.
Private evidence access, deletion checks and receipt retention are preserved.

## Validation record

`tests/test_scene_verification.py` uses pure deterministic model observations
and real temporary SQLite transactions. It covers scene accept/reject/retry,
strict/light, required photos/quiz, per-photo crops, photo reuse, privacy,
idempotent XP, worker lease recovery, policy compatibility, and lazy shared
model caching. Existing boxing and Passport lifecycle tests also run.

No new real-image inference or model accuracy evaluation was performed for
sunset, Burj Khalifa or Dubai Frame in this implementation. Fake observations
and fake model runtimes prove wiring/rules/caching, NOT recognition accuracy.
Before relying on thresholds, test representative positive, wrong-landmark,
daylight, inland-sunset, cropped-detail and screenshot photographs in both modes.
Do not report benchmark accuracy until such an evaluation has been recorded.

No deployment or push was performed. The existing Lightsail memory/cold-start
limitations still apply; this extension does not add another worker or model.
