# Phase 0 baseline and handoff

Completed 23 October 2026. Scope: branch, development isolation, baseline checks,
supported-challenge policy, feature-gate scaffolding and experience inventory.
No feature screens, existing routes, agent prompts, database schema or booking
behaviour were changed. No packages, images or avatar assets were downloaded.

## Repository and rollback

- Working branch: `codex/masar-experiences`.
- Original clean baseline: `9784b897e540042609dad37f0af4cc68c9321c5d` on `master`.
- Existing application flow remains active. New flags default off and have no
  imports in existing application routes yet.
- Additive Phase 0 files are listed below. Preserve local changes before switching
  branches; no reset/clean is necessary. Existing branding backups remain intact.
- The external experience workspace has no Git repository. Its modules remain
  untouched. `experience-assets.json` records 124 reference files, SHA-256 hashes,
  10,240,589 bytes, licence references and statically detected relative imports.
  No missing statically detected references were found. This is a manifest, not
  an asset backup or a complete browser/runtime dependency analysis. Existing
  workspace `versions/` backups remain in place; integration will copy assets later.

## Checks and honest baseline

| Check | Result |
|---|---|
| Existing Next production build | PASS: all 13 static pages generated, including not-found |
| Frontend ESLint, original `src` tree | Existing failure: 24 errors, 45 warnings across 65 files |
| Python AST syntax | PASS: 32 existing source files; no application imports |
| Nine standalone experience verification scripts | PASS, including local performance server check |
| Isolated PostgreSQL connection/transaction | PASS: `masar_phase0`, user `masar_phase0`, PostgreSQL 17.2; probe table/write rolled back |
| Isolated database cleanup | Test container stopped successfully; no app migrations applied |
| Real auth, bookings, provider availability and live AI | Not exercised; require separate controlled checks |

The first performance test failed because the sandbox denied localhost access
(`EACCES 127.0.0.1:4174`). Its authorised rerun outside the sandbox passed.
The test server exited after the check. This was an environment restriction,
not an experience regression.

ESLint errors were recorded before the new configuration files were introduced.
Do not disable rules or fix unrelated screens as part of Phase 0. Full messages,
locations and warnings are retained in `eslint-baseline.json`.

| Existing file | Errors | Error rules |
|---|---:|---|
| `src/app/login/page.jsx` | 1 | `react/no-unescaped-entities` (1) |
| `src/app/onboarding/page.jsx` | 1 | `react/no-unescaped-entities` (1) |
| `src/components/cards/RoomCard.jsx` | 1 | `react-hooks/set-state-in-effect` (1) |
| `src/components/chat/HeroIllustration.jsx` | 1 | `react/no-unescaped-entities` (1) |
| `src/components/chat/MessageBubble.jsx` | 3 | `react-hooks/rules-of-hooks` (2), `react-hooks/set-state-in-effect` (1) |
| `src/components/landing/HeroInteractiveStage.jsx` | 1 | `react-hooks/set-state-in-effect` (1) |
| `src/components/landing/WorkflowOrchestrationStage.jsx` | 1 | `react-hooks/set-state-in-effect` (1) |
| `src/components/layout/ContextPanel.jsx` | 1 | `react/jsx-no-undef` (1) |
| `src/components/layout/LandingPage.jsx` | 2 | `react/no-unescaped-entities` (2) |
| `src/components/layout/Sidebar.jsx` | 1 | `react-hooks/set-state-in-effect` (1) |
| `src/components/trips/BookingVoucherModal.jsx` | 1 | `react/no-unescaped-entities` (1) |
| `src/components/trips/DirectCheckoutModal.jsx` | 5 | `react-hooks/rules-of-hooks` (5) |
| `src/context/AuthContext.jsx` | 1 | `react-hooks/set-state-in-effect` (1) |
| `src/context/ThemeContext.jsx` | 1 | `react-hooks/set-state-in-effect` (1) |
| `src/hooks/useChat.js` | 2 | `react-hooks/purity` (2) |
| `src/hooks/useTrips.js` | 1 | `react-hooks/set-state-in-effect` (1) |

The undefined JSX component and conditional-hook errors are relevant correctness
items to address when their owning screens are changed. The production build
passing is not evidence that those interactions are error-free.

## Runtime versions checked

- Node 22.23.2; Python 3.11.8; Next 16.3.1; React 19.2.8.
- FastAPI 0.141.1; Uvicorn 0.52.3; SQLAlchemy 2.0.52; asyncpg 0.31.0;
  Alembic 1.19.1; Pydantic 2.13.4; LangGraph 1.2.11;
  langchain-core 1.5.5; langchain-openai 1.5.1; httpx 0.28.1;
  python-dotenv 1.2.2.
- Read installed Next installation and server/client component guides as required
  by `frontend/AGENTS.md`. No dependency upgrades performed.

## Local run / repeat commands

Existing application (uses its existing configuration, NOT the isolated test DB):

```powershell
cd C:\Users\efake\Desktop\MasarAI
.\.myenv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

In a separate terminal:

```powershell
cd C:\Users\efake\Desktop\MasarAI\frontend
npm.cmd run dev
```

Build/lint using installed packages only:

```powershell
cd C:\Users\efake\Desktop\MasarAI\frontend
npm.cmd run build
npm.cmd run lint
```

Offline backend syntax/installed dependency inventory (no .env or app imports):

```powershell
cd C:\Users\efake\Desktop\MasarAI
.\.myenv\Scripts\python.exe tools/check_phase0_baseline.py
```

Standalone animation/game reference:

```powershell
cd C:\Users\efake\Desktop\threeJs_animation
node serve.mjs
```

Reference checks: `node verify-arcade.mjs`, `verify-avatar.mjs`,
`verify-ball-roll.mjs`, `verify-bowling.mjs`, `verify-heritage.mjs`,
`verify-museum.mjs`, `verify-performance.mjs`, `verify-puzzle.mjs`,
`verify-sunset.mjs` (prefix each filename with `node`).

## Development database / provider safety

See `dev/README.md` and `dev/compose.phase0.yml`. Docker Desktop was started;
an existing local `postgres:17` image was used with `pull_policy: never`.
Local image ID:
`sha256:3267c505060a0052e5aa6e5175a7b41ab6b04da2f8c4540fc6e98a37210aa2d3`.

Only `127.0.0.1:55432` is published while running. The project name is
`masar-phase0`; unrelated containers/volumes were not modified. The test container
was stopped after a successful SQL probe. Its tmpfs data is disposable.

IMPORTANT: current `database.py` calls `load_dotenv(override=True)`. A shell
DATABASE_URL override is not sufficient. The app has NOT been pointed at this
test DB, and no migrations were run. Phase 1 must introduce explicit isolated
configuration before importing the app in backend tests. Current live Python
test scripts were deliberately not run. No provider fixture adapter is claimed
to be implemented yet; Phase 1/3 will introduce fixtures for their tests.

## Approved challenge compatibility

`supported-challenges.json` records user-approved scope, not live venue data:

- Heritage/landmark capture: Burj Khalifa, Museum of the Future, Sheikh Zayed
  Grand Mosque only, matching the three existing animated landmarks.
- Boxing: any mall with a verified punching-machine facility.
- Bowling: any mall with a verified bowling venue.
- Sunset Seeker: any suitable beach with valid access and an appropriate actual
  sunset window. The current preview is illustrative.
- No unsupported challenge types or capture landmarks may be invented by the AI.
  Venue eligibility must be checked; a matching animation does not verify a venue.
- This policy is not connected to the current AI yet. Catalogue tools and backend
  enforcement are later phases. Games have their own supported destination lists.

## Added files

- `docs/implementation/IMPLEMENTATION_PLAN.md`
- `docs/implementation/PHASE_0_BASELINE.md`
- `docs/implementation/supported-challenges.json`
- `docs/implementation/experience-assets.json`
- `docs/implementation/eslint-baseline.json`
- `dev/compose.phase0.yml`, `dev/README.md`
- `config/__init__.py`, `config/feature_flags.py`
- `frontend/src/config/featureFlags.js`
- `tools/check_phase0_baseline.py`

## Next checkpoint

Phase 1 only: correct ownership checks and mock-result handling; centralise API
configuration/profile/preferences; introduce canonical places and versioned,
dated itinerary contracts; establish isolated backend tests and migrations.
No Explore redesign, game embedding or reward issuing belongs to Phase 0.
