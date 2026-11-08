# Masar AI

A UAE travel-planning prototype bringing discovery, itinerary planning, local experiences, and a digital travel passport into one visitor journey.

**[Open the live demo](https://masar-ai-zeta.vercel.app/)**

## Inside the project

- Next.js and React frontend with maps, planning interfaces, and multilingual presentation.
- FastAPI backend with PostgreSQL persistence and Alembic migrations.
- LangGraph orchestration, retrieval resources, and travel-provider integrations.
- Attraction discovery, accessibility information, digital passport, and supporting evidence workflows.
- Separate planning worker, deployment configuration, and automated test suites.

The live demo and this source snapshot can differ as the project evolves. Provider integrations require separate credentials and configuration; the repository alone does not enable live travel booking.

## Frontend

Use Node.js 22 or newer.

```sh
git clone https://github.com/Aureum21/masar-ai.git
cd masar-ai/frontend
npm ci
npm run dev
```

Open http://localhost:3000. Set `NEXT_PUBLIC_API_URL` to your backend URL when building a deployed frontend.

```sh
npm test
npm run build
npm start
```

## Backend

Use Python 3.11 and a dedicated virtual environment. From the repository root:

```sh
python -m venv .venv
```

Activate the environment, then:

```sh
pip install -r requirements.txt
cp .env.example .env
```

Configure your own PostgreSQL database, a strong `SECRET_KEY`, and the AI/provider keys needed by the features you enable. The environment template lists the variables. Never commit the completed file.

For a new development database, review the migrations before applying them:

```sh
alembic upgrade head
uvicorn main:app --reload --port 8000
```

Production setup also includes explicit planning-checkpoint initialization, catalogue seeding, and a worker. Follow [the deployment guide](deploy/README.md) for that sequence, container settings, storage, health checks, and rollback. `requirements.lock` is the pinned Linux deployment environment.

## Source map

| Location | Purpose |
| --- | --- |
| `frontend/` | Next.js application and frontend tests |
| `main.py`, `routers/` | HTTP API |
| `MasarAi.py`, `services/` | Agent orchestration and services |
| `domain/`, `config/` | Domain logic and runtime configuration |
| `alembic/` | Database migrations |
| `data/` | Catalogue and retrieval resources |
| `passport/`, `receipts/` | Passport and receipt workflows |
| `tests/` | Python tests |
| `deploy/` | Container and operations guides |

## Development notes

Some backend tests require an isolated PostgreSQL fixture. Test mode restricts its database to `localhost:55432/masar_phase0`; keep it separate from real user data. Provider-backed features require their own configured services. Consult the deployment guides before running database utilities or enabling paid integrations.

Do not commit user evidence, receipts, uploaded files, environment files, or database dumps. The repository contains the source snapshot, not production credentials or private user records.

## Credits

Published by Alazar Wake Kore as a Masar AI team-project source edition, starting with fresh Git history from the supplied archive. Fresh history does not imply sole authorship. Third-party libraries, datasets, provider content, branding, and media retain their respective rights and terms. No new open-source license is asserted.
