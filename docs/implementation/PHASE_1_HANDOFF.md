# Phase 1 — shared foundations

Branch: `codex/masar-experiences`. Previous checkpoint: `101b8d4`.

## Changes

- Conversation ownership is checked before loading/appending history. Hotel
  prebooking ownership is checked by both REST and the agent tool before calling
  the provider. Unowned resources return not-found without revealing ownership.
- Provider errors no longer generate mock flight offers or confirmed bookings.
  Demo offers cannot be booked. Missing explicit provider confirmation is pending;
  an ambiguous failure is unknown, with instructions to check before retrying.
- All existing frontend API origins come from `src/lib/api.js`. Auth and trip
  requests use its shared request/error handling; streaming retains its reader.
- Auth context now provides a full `user` profile, handles expired sessions,
  subscribes to storage changes, and cancels stale profile loads. Changing email
  returns/replaces the email-subject JWT so the current session remains valid.
- Interests/vibes and dietary aliases are normalised while preserving custom
  preferences. Each editing screen explicitly identifies the fields it edits.
- Added validated Trip Brief and version 2 itinerary contracts: actual dates,
  destination timezone, lifecycle, revision, stable day/activity IDs, and place/
  ticket-product references. Agent save/read/update tools use the same adapter.
- Legacy trips stay readable and undated unless actual dates are supplied. Reading
  them does not rewrite records. Calendar no longer uses `created_at` as travel time.
- Added seven canonical place identities, frozen seed migration, and a tested
  initial challenge compatibility policy. Burj Khalifa SKY remains a distinct
  product of the attraction. The AI prompt now states the closed challenge scope.
- Fixed the original lint errors: conditional hooks in messages/checkout,
  undefined ShieldCheck, impure render-time thread IDs, escaped JSX text,
  hydration/storage state, request lifecycle, and animation-effect resets.

## Compatibility decision: JSON first

Dates/status/revision live in the existing `Trip.itinerary_data` JSON, exposed as
typed top-level API fields. No extra Trip SQL columns are required. This adjusts
the roadmap's initial column proposal to keep the running backend compatible
without an immediate migration. There is one source of truth, not mirrored SQL
columns plus JSON. Normalising those fields into indexed columns can happen later
when actual queries require it, with an explicit migration/deployment checkpoint.

The new `places` migration is prepared/tested, but was NOT applied to the running
app's database. Its table is not queried by current screens. The initial identity
resolver is bundled and does not require the new table. Existing DOB/gender DB
columns were verified in the test migration chain and left untouched; current
profile models still do not expose them. Do not autogenerate a migration dropping
those columns just because they are unmapped.

## Environment / testing

All application dotenv loading uses explicit root loading with `override=False`.
`MASAR_ENV=test` skips dotenv entirely and refuses database URLs outside
`localhost:55432/masar_phase0`. This fixes the Phase 0 isolation blocker. No secret
files were changed. The normal existing .env is still used in development unless
a process variable deliberately overrides it.

The regression suite uses real isolated PostgreSQL with per-test rolled-back
transactions, dependency overrides and canned provider failures/results. No LLM,
flight, hotel booking or email was sent during tests. The existing live scripts
at repository root are separate and must not be used for automatic test discovery.

From the repository root, with the disposable Docker database started:

```powershell
$env:MASAR_ENV='test'
$env:DATABASE_URL='postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0'
.\.myenv\Scripts\python.exe -m alembic upgrade head
.\.myenv\Scripts\python.exe -m unittest tests.test_phase1 -v
.\.myenv\Scripts\python.exe -m tools.check_phase1_migration
```

Use a separate terminal for tests; do not set these variables in the terminal
running your normal backend. The migration checker downgrades/upgrades only the
disposable database and verifies a legacy trip survives plus seven place seeds.
There is no instruction here to migrate production.

## Validation record

- 16 backend regression tests passed in the isolated database.
- Clean migration chain and migration downgrade/upgrade with a legacy row passed.
- Staged frontend ESLint: zero errors, 45 warnings. Rules were not disabled.
- Python source AST checks passed.
- Installed frontend production build passed: all 13 static pages generated.
- Installed frontend ESLint passed: zero errors, 45 remaining warnings.
- All 16 tests also passed from the installed repository, including URL-encoded
  login, refreshed JWT claims, and both agent/REST ownership checks.
- Running frontend at localhost:3000: landing/login screens rendered, no browser
  console errors observed. Authenticated UI flows were not exercised with a real
  account; the profile/login API flows were tested using isolated fixtures.
- Running backend at localhost:8000 exposed the new trip-date and token-refresh
  schema, confirming it reloaded this phase. No authenticated live data was read.
- The disposable database was stopped after tests. No application database
  migrations, real bookings, emails or external AI calls were performed.

Warnings include existing image optimisation/accessibility and hook dependency
advice; they remain visible. Avoid broad image or landing-page rewrites in this
foundation checkpoint.

## What to expect in the running app

This phase improves correctness, not the visual design. Existing login/chat/trips
remain in place. Profile-based checkout defaults can now use the actual user.
Undated legacy trips remain in My Trips but are not placed on arbitrary calendar
dates. A new itinerary carrying real dates can be scheduled correctly.

Frontend `npm run dev` should refresh these source changes automatically. Backend
Uvicorn needs `--reload`, otherwise restart the process. No environment-variable
change or database migration is required to keep the current app working.

Explore-first UI and shortlist are Phase 2. Full challenge-aware AI curation is
Phase 3; animation embedding, submissions and point awards are later phases.
