# Deployment preparation verification — 27 October 2026

Branch: `efa`. No AWS resources were created. No production/Neon schema migrations, real AI requests, or travel-provider calls were made during these checks.

Passed:

- 97 explicit regression tests covering production configuration, access/reset token isolation, CORS, bounded rate limits, streaming admission, durable planning leases, flight/room choices, passport evidence and attraction eligibility. Tests used isolated local PostgreSQL on port 55432 and disposable SQLite fixtures.
- Clean Linux Docker build from pinned Python dependencies, including explicit Pillow and PostgreSQL checkpoint dependencies; `pip check` reported no broken requirements.
- Production Compose syntax and Caddy HTTPS proxy configuration validation. Python and proxy base images are digest-pinned. Public TLS issuance has not been attempted because no production domain/server has been configured.
- A separate disposable Linux deployment stack: complete Alembic migration chain, explicit checkpoint migrations, catalogue seed, API readiness, allowed/blocked origins, unexpected Host rejection, disabled production API docs, signup/login and graceful API/worker restart.
- PostgreSQL checkpoint write in one container and read/deletion in another after API/worker restart, using a fixture graph without model calls.
- Runtime user UID 10001, developer `.env`/`.aws` absent from the image, and private evidence volume persistence across process replacement.
- Worker heartbeat after restart and successful access to its local queue table.

The temporary `masar-deploy-smoke` containers, network and fixture evidence volume were removed after verification. The temporary `masar-backend:deployment-check` image was removed after verification to save space; rebuild it from the committed Dockerfile when needed.

Before public launch: configure real domains, TLS/DNS, server credentials and scoped AWS machine identity; verify S3 access and email delivery; test sandbox providers end-to-end; measure memory/concurrency; configure backup/restore, health/billing alerts and data retention/erasure policy. This is a verified single-host deployment package, not a claim of high availability or a complete security audit.
