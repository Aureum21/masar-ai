# Isolated development checks

Phase 1 introduced `config/runtime.py`: `MASAR_ENV=test` skips dotenv and rejects
database targets outside localhost:55432/masar_phase0. The test terminal must set
both MASAR_ENV and DATABASE_URL explicitly before importing the application.
See `docs/implementation/PHASE_1_HANDOFF.md` for the isolated regression and
migration commands. Do not edit or copy existing secret env files.

## Disposable PostgreSQL

Docker Desktop must be running, and `postgres:17` must already be local.
This configuration never pulls an image. No image was downloaded for Phase 0.

From the repository root in PowerShell:

```powershell
docker compose -f dev/compose.phase0.yml -p masar-phase0 up -d --pull never
docker compose -f dev/compose.phase0.yml -p masar-phase0 ps
docker compose -f dev/compose.phase0.yml -p masar-phase0 exec -T postgres psql -U masar_phase0 -d masar_phase0 -c "SELECT current_database(), current_user;"
```

Only localhost port 55432 is published. Credentials in compose are deliberately
public, disposable local-test values. Storage is tmpfs: stopping/recreating the
container may erase the data. Never use this configuration for real accounts.

Stop only this project:

```powershell
docker compose -f dev/compose.phase0.yml -p masar-phase0 down
```

## Provider test policy

- Phase 0 syntax and frontend build checks do not call backend providers.
- Existing `test_graph.py`, `test_flights.py`, `test_nuitee.py`, `test_rag.py`, and
  `test_stream.py` are manual/live scripts, not a safe automatic regression suite.
- Future isolated tests must supply explicit canned provider results and disable
  real booking, email and AI side effects. Do not rely on current runtime mock
  fallbacks; correcting those is Phase 1 work.
- Run Alembic only after explicitly setting the isolated test configuration and
  checking the target. Phase 1 validated migrations in that disposable database;
  no running-app database migration was applied.

## Future feature switches

All new flags default off. They are scaffolding only; existing screens and routes
do not import them yet. Frontend switches take effect at build time:

```text
NEXT_PUBLIC_MASAR_EXPLORE_FIRST=false
NEXT_PUBLIC_MASAR_STRUCTURED_PLANNING=false
NEXT_PUBLIC_MASAR_REWARDS=false
MASAR_STRUCTURED_PLANNING=false
MASAR_REWARDS=false
```

Future routes must enforce backend gates and ownership independently of UI flags.
