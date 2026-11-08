# Updating the MASAR AI backend on Lightsail

The frontend deploys separately on Vercel. The backend runs on the Ubuntu Lightsail instance `masar-backend`: Caddy serves `https://masar-api.efdronapps.com`, Docker runs the API and workers, and PostgreSQL stores the data. Run these commands in **Lightsail → masar-backend → browser SSH**. Do not put secrets in Git.

## 1. Confirm the release

```bash
cd ~/MasarAI
git status --short
git rev-parse --short HEAD
git fetch origin master
git log -1 --oneline FETCH_HEAD
```

Review the incoming release and any new settings or migrations. A local `deploy/production.env.backup-*` may appear as untracked; never commit it. Stop if tracked files have unexpected changes. On this server, local `master` has no upstream, so update it with:

```bash
git switch master
git merge --ff-only FETCH_HEAD
git log -1 --oneline
```

## 2. Check configuration and back up the database

Keep `deploy/production.env` and `deploy/compose.env` on the server. Compare new options in `deploy/production.env.example` with the server configuration **without printing secret values**. Set up any required private S3 access before enabling a new storage feature. Create a restore point for the production PostgreSQL database before migrations.

## 3. Build images

Define this shortcut in the current SSH session (repeat it after reconnecting):

```bash
masar() {
  sudo docker compose \
    --env-file deploy/compose.env \
    -f deploy/compose.production.yml \
    -f deploy/compose.vision.yml \
    -f deploy/compose.receipts.yml "$@"
}

masar stop evidence-worker
masar build api
masar build evidence-worker
```

Building one image at a time reduces memory pressure on the 4 GB instance. If a future release adds another Compose overlay or image, include it after reviewing that release's instructions.

## 4. Validate and migrate

The API has a fixed Compose network address. Temporary `masar run api` containers can fail with `Address already in use`, so use an ordinary Docker container for one-off checks:

```bash
image_tag=$(sed -n 's/^MASAR_IMAGE_TAG=//p' deploy/compose.env)
masar_job() {
  sudo docker run --rm \
    --env-file deploy/production.env \
    -e MASAR_ENV=production \
    --network masar_backend \
    "masar-backend:${image_tag}" "$@"
}

masar_job python -m tools.deployment_check
masar_job alembic current
masar_job alembic heads
```

Confirm `alembic heads` shows **one head** and the database restore point exists. Then:

```bash
masar_job alembic upgrade head
masar_job alembic current
```

Stop if any check or migration fails. The head changes with releases; do not hard-code an old revision. Do not remove the Docker network or volumes to fix the one-off container error.

## 5. Start and verify

```bash
masar up -d --force-recreate api worker evidence-worker
```

If receipts are enabled and their private storage is configured, also run:

```bash
masar up -d --force-recreate receipt-worker
```

Check the services:

```bash
masar ps
curl -fsS https://masar-api.efdronapps.com/health/ready
masar logs --tail 50 api worker evidence-worker
masar logs --tail 50 receipt-worker
```

The health endpoint should return `{"status":"ready"}`. Newly started workers can show `health: starting` briefly; check `masar ps` again after about a minute. Then test one representative trip, challenge submission, or receipt flow affected by the release. If a check fails, inspect logs and stop rather than repeating the migration blindly.

**Keep:** database backups, `deploy/production.env`, and Docker volumes. Never run `docker compose down -v`. Backend code does not update automatically when GitHub changes; repeat this guide for each backend release. Frontend changes require a separate Vercel deployment from its configured branch.
