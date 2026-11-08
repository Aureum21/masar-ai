# MASAR single-host deployment

This package runs one API process and one durable planning worker behind an HTTPS proxy. It does not create AWS resources or enable live travel booking. Tested capacity must be measured before choosing a server size. This is a single-host design, not high availability.

## Before launch

1. Choose the server region and document where Neon, S3 and AI providers process data. Keeping an application server in the UAE does not move the existing Neon database or Stockholm S3 bucket into the UAE.
2. Enable AWS MFA and use a separate administrator identity. Configure a Linux server with current security updates, SSH keys, and restricted administration. Allow public TCP 80/443 only; restrict SSH 22 to the administrator IP or use managed access. Never expose 8000 or a database port. Apply both IPv4 and IPv6 rules. No load balancer or NAT gateway is required for this single-host setup.
3. Install Docker Engine and Compose from Docker's official distribution. Copy the reviewed checkout to the server. Do not transfer `.env`, `.aws`, local evidence or database dumps in the image.
4. Create `deploy/production.env` from the example, fill every required value, and protect it with `chmod 600 deploy/production.env`. Generate a unique secret with `openssl rand -hex 32`. Set the public frontend URL and allowed API host. Set `NEXT_PUBLIC_API_URL=https://YOUR_API_DOMAIN` when building the frontend. Keep travel API credentials in sandbox mode.
5. Configure AWS machine access separately: EC2 instance roles with temporary credentials are preferred. The normal app only needs `s3:GetObject` for `arn:aws:s3:::masarai-pics/attractions/*`; it does not need permission to change bucket policy or upload photos. Lightsail needs a supported, scoped machine-credential method chosen before launch. Do not copy browser login sessions, use root keys, or assume Secrets Manager can be accessed without an AWS identity. Photo fallback paths still work, so confirm S3 access explicitly in the deployment acceptance check.
6. Create `deploy/compose.env` from its example. Point the API hostname to the server's static IP. Use a trusted PostgreSQL TLS endpoint. Restrict server access to secrets and encrypt server disks/backups. The proxy obtains and renews HTTPS certificates automatically after DNS and firewall setup.

## Build, validate, migrate, start

Run from the repository root. Replace the example configuration first. Commands below can modify the configured database; take a database backup/restore point and confirm the migration head before running them. Do not run them against another team's database by accident. Test in staging first.

```sh
docker compose --env-file deploy/compose.env -f deploy/compose.production.yml build api
docker compose --env-file deploy/compose.env -f deploy/compose.production.yml run --rm --no-deps api python -m tools.deployment_check
# One-off schema changes with a migration-capable DB identity:
docker compose --env-file deploy/compose.env -f deploy/compose.production.yml run --rm --no-deps api alembic upgrade head
docker compose --env-file deploy/compose.env -f deploy/compose.production.yml run --rm --no-deps api python -m tools.init_checkpoints
docker compose --env-file deploy/compose.env -f deploy/compose.production.yml run --rm --no-deps api python -m tools.seed_attractions
# After setup, prefer a runtime DB identity with required DML privileges and no DDL.
docker compose --env-file deploy/compose.env -f deploy/compose.production.yml up -d api worker proxy
docker compose --env-file deploy/compose.env -f deploy/compose.production.yml ps
```

Checkpoint migrations are explicit; neither API startup nor worker startup changes schema. Existing photos already attached to the current database remain in place. For a new database, import the reviewed photo records from the local workspace using `tools.upload_attraction_photos`; the production runtime role must not have uploader permissions. The image intentionally excludes the frontend; its fallback photo files are part of the separately built Next.js app.

Only the proxy publishes ports. Its fixed internal address is the sole trusted forwarded-header source for Uvicorn. If `172.30.0.0/24` conflicts with existing networking, change the subnet, proxy address and `--forwarded-allow-ips` together. Do not replace the trusted proxy list with `*` on a directly exposed API.

## Reliability and limits

- The API rejects missing/unsafe production settings, unexpected Host headers and unapproved browser origins. Production access tokens require `type=access`, have a configurable lifetime, and reset tokens cannot authenticate API calls. Existing development tokens without a purpose remain accepted only outside production.
- Authentication, chat, planning and write requests have bounded per-IP counters. Streaming chats are limited to two at once and one per client IP by default. These limits are process-local: use exactly one API process. Shared NAT users share a quota; configure a distributed authenticated limiter before scaling replicas. The existing DB queue permits one active planning request per user, independent of these counters.
- Agent state uses PostgreSQL checkpoints; local/test mode retains memory storage. Plan retries remain explicit and must not silently repeat provider bookings. Restarted planning leases become interrupted according to the existing queue rules; checkpoints are not a promise of automatically replaying a paid tool.
- User evidence is private, decoded/re-encoded before storage and served only through authorization checks. The named `evidence` volume preserves it across container replacement. Back up this volume securely along with database restore points. Never serve it as a public/static directory, copy it into the image, or delete it with `docker compose down -v`. A volume is persistence, not a backup.
- Checkpoint records can contain sensitive conversation/tool state. Limit DB access, back them up securely, and establish retention/deletion procedures before a public launch. Checkpoint IDs are owner-scoped, and deleting a conversation or account also removes its checkpoints. Define backup retention and evidence-erasure procedures before accepting real personal data at scale.
- `/health/live` checks the API process; `/health/ready` checks DB connectivity and required planning/catalogue tables. Worker health checks a heartbeat refreshed only after a successful queue-table read. It does not prove external providers are available. Alert on queue errors, stale jobs and repeated failures. Restart policies restart exited processes, not merely unhealthy containers; health alerts still need operational handling.
- Logs have bounded Docker rotation. No HTTP access logs are enabled by default at Caddy, to avoid logging password-reset query strings. Application errors sent to clients are generic. Keep AI tracing disabled until its data policy is reviewed.

## Acceptance and rollback

Before opening registration, test HTTPS, allowed/blocked origins, login and reset-token isolation, rate-limit responses, one complete sandbox trip with flight/room choices, S3 images, private evidence, backups/restores, graceful worker termination and restart. Use provider budgets and AWS billing alerts; request limits are not a hard spending cap.

Keep the previous tested image tag for rollback. Revert the application image without deleting persistent volumes. Database rollback needs a reviewed compatible migration or restore procedure; do not blindly downgrade. The Python base is pinned by digest and Python dependencies are pinned in the Linux `requirements.lock`; refresh them deliberately for security updates. The proxy is also digest-pinned; refresh both image digests when publishing security updates. Never expose the dev server with `--reload` in production.


## Local verification (no AWS resources)

`deploy/compose.smoke.yml` is a separate disposable project named `masar-deploy-smoke`, with an internal temporary PostgreSQL database, fake provider keys and only a localhost API port (18080). Never substitute the production file when deleting this test environment. The Linux image uses `requirements.lock`; Windows development continues to use `requirements.txt`.

After building `masar-backend:deployment-check`, start its PostgreSQL service, apply Alembic migrations, run `tools.init_checkpoints` and seed the attraction catalogue in that project. Then start the API/worker and probe health. `tools.checkpoint_probe --phase write --thread YOUR_RANDOM_FIXTURE_ID` followed by the matching `--phase read` in a new container verifies cross-process checkpoint recovery and deletes that fixture. It never invokes an AI model. Remove only the `masar-deploy-smoke` project and its fixture volume when finished.
