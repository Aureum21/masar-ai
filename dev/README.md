# Isolated development checks

`MASAR_ENV=test` disables dotenv discovery and restricts the database target to `localhost:55432/masar_phase0`. Set both `MASAR_ENV` and `DATABASE_URL` explicitly before importing the application.

## Disposable PostgreSQL

Docker Desktop must be running with the `postgres:17` image already available. From the repository root:

```sh
docker compose -f dev/compose.phase0.yml -p masar-phase0 up -d --pull never
docker compose -f dev/compose.phase0.yml -p masar-phase0 ps
```

Only localhost port 55432 is exposed. The Compose credentials are disposable local-test values. Storage uses tmpfs; this environment is for fixtures, not real accounts. Apply migrations only after checking the isolated database target.

```sh
docker compose -f dev/compose.phase0.yml -p masar-phase0 down
```

## Test boundaries

Tests under `tests/` include isolated fixtures and provider stubs. Root-level scripts such as `test_flights.py`, `test_nuitee.py`, `test_rag.py`, and `test_stream.py` can call real providers; run those manually with appropriate sandbox configuration.

Frontend checks run from `frontend/`:

```sh
npm test
npm run build
```

See `deploy/README.md` for the deployment smoke environment and production configuration. Provider-backed booking, email, and AI calls require explicit service configuration.
