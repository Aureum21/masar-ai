# Phase 3: recoverable planning checkpoint — 23 October 2026

Phase 3 remains in progress. This increment follows the account Trip Brief checkpoint.

## What changed

- A saved planning request snapshots the owned brief/revision and has a stable returnable URL. `POST /api/v1/planning/runs` uses a per-owner UUID request key; lost-response retries return the same run. Reusing a key for another revision is rejected.
- Owner-scoped list/detail/cancel/retry APIs. One queued/running request per account. Three attempts maximum, each with a 20-minute execution limit. Only failed/interrupted requests retry; no automatic provider retry loop.
- PostgreSQL queue claims use row locks and SKIP LOCKED. Each attempt has a fenced token and 90-second lease, refreshed every 20 seconds. Worker shutdown/crash is recoverable after lease expiry; a stale attempt cannot save or update a newer attempt.
- The trip insert and run result reference commit atomically. Repeated save-tool calls for the same attempt reuse the saved trip. A crash after save recovers the existing result. Model prose/claimed IDs cannot mark an unsaved run completed.
- Cancelling revokes the lease. It stops future save/progress updates immediately; the worker notices within its heartbeat interval. Already-issued provider requests may finish. A trip committed before cancellation is returned as completed, not discarded.
- Separate worker `python -m tools.planning_worker`, using existing recommendation-only agent bindings. Browser refresh/disconnect does not own the worker task. No new dependency.
- Explore's handoff starts a durable run when its schema is available. Pending-schema fallback retains the previous chat flow. Plain conversational chat remains on the existing SSE flow; converting conversational brief edits is a later increment.
- New `/plan/runs/[runId]` progress page, recent requests on Trip Brief, recovery/cancel controls, and `/trips/[tripId]` read-only day navigation. Editing, map/budget workspace and lifecycle actions are not complete yet.

## Validation

- 55 isolated backend tests passed: owner isolation, simultaneous duplicate request admission, concurrent worker claims, immutable snapshots, cancelled/expired-token rejection, timeout/shutdown recovery, bounded retries, atomic repeated saves, and honest completion. No model/provider calls.
- 18 frontend Node tests passed. Full lint: 0 errors and the unchanged 43 warnings. Changed-file lint passed; production build passed with 14 static pages and the two new dynamic routes.
- Separate API on 8001 and copied frontend on 3001 use disposable fixtures and the isolated PostgreSQL database. Browser checked saved result linking, day navigation, cancellation, recent-run recovery, account-brief restore, explicit handoff creation and refresh of the same queued run. Screenshots in experience workspace: `preview-phase3-saved-planning.png`, `preview-phase3-direct-trip.png`. These screenshots contain fixture data, not a live AI-generated trip.
- An isolated downgrade/upgrade roundtrip preserved every other table and its row count. Exact SQL is in experience workspace `planning/phase3-planning-runs-upgrade.sql`. Current app database was read-only confirmed at `20261023_join` and was not migrated by this increment. Migration `20261023_runs` adds only `planning_runs`, two indexes, owner/request uniqueness, status/attempt constraints and foreign keys. The approved roadmap excludes production migrations; obtain approval before applying it to the configured app database.

## Local operation after migration approval

Keep the API on 8000 and frontend on 3000. Open a third terminal:

```powershell
cd C:\Users\efake\Desktop\MasarAI
.\.myenv\Scripts\python.exe -m tools.planning_worker
```

Keep it running during planning. In deployment, supervise/restart this command with your process manager; it is not an API startup task. Without a worker the saved request honestly stays queued. Starting a worker executes queued user-approved requests with the configured providers/models and can consume their quota.

Manual check: prepare a complete saved brief → Continue in Ask MASAR → Start planning → receive progress URL → refresh/navigate away → reopen via Trip Brief → completed request opens the same saved draft. To check interruption, stop the worker during research, wait for the lease to expire, reopen the request and retry. Do not run this as a live provider test automatically.

## Remaining Phase 3 work

Structured synthesis/must-visit and feasibility validation, challenge catalogue tools, replacement of 2,000-character research truncation, conversational brief updates, full premium editable Trip Workspace, revision-safe activity/day changes, booking associations and lifecycle remain. Research restarts from the immutable brief on explicit retry; it does not resume inside an interrupted provider/model call. No live end-to-end AI/provider result was certified by fixture tests.

## Approved activation — 23 October 2026

The user confirmed the additive migration. Guarded preflight verified exact revision `20261023_join` with no `planning_runs` table. Alembic upgraded only to `20261023_runs`; postflight verified that revision and the new table. Both brief and durable-run availability checks returned true; the run queue contained zero rows. The running backend on port 8000 exposes all planning status/brief/run/cancel/retry endpoints.

Earlier pending-approval notes above describe the pre-activation checkpoint. No existing table was altered by this migration. The worker was not started automatically and no model/provider requests were made. Run the third-terminal command above before testing; without it, new requests remain saved and queued.
