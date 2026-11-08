# MASAR AI — implementation roadmap

Status: roadmap approved 23 October 2026; integrity consolidation on 26 October 2026. Continue on `codex/masar-continue`. Phases 1–2 remain delivered checkpoints. Phases 3–5 have usable cores with the remaining gates below; Phase 6 has practice games and demo vouchers, not live redeemable game rewards. Phase 7 is pending. See `INTEGRITY_FIXES_2026_10_26.md` before relying on earlier “complete” handoffs.

The initial planning task changed no application files, database records, branches or experience modules. Subsequent Phase 0 changes are recorded separately in the baseline handoff; later phases remain separate checkpoints.

## 1. Product outcome

MASAR becomes an exploration-first travel companion. A traveller can either select places in Explore or describe a trip in Ask MASAR. Both entry points produce one editable itinerary, saved in My Trips, scheduled on actual travel dates, with suitable optional destination challenges and verified rewards.

Main journey:

**Explore or Ask MASAR → Trip Brief → AI research → Saved draft → Trip Workspace → Activate → Today / Calendar → Challenge → Evidence review → Points → Coupon**

Main navigation: Explore UAE, My Trips, Challenges, Rewards, Ask MASAR. Preferences remains available through the profile. Games are accessible within Challenges through a Play tab and through relevant destination cards. Rewards contains wallet, coupons, achievements, and leaderboard; no additional top-level navigation is necessary.

The public marketing landing page remains a public landing page. Explore becomes the default authenticated destination after login/onboarding and the application's home action. Existing chat links remain valid.

## 2. Current codebase baseline

Main repository: `C:/Users/efake/Desktop/MasarAI`.

Experience workspace: `C:/Users/efake/Desktop/threeJs_animation`.

Historical baseline at initial review: main app was on `master`, commit `9784b89` (`masar ai flow updates`); `git status --short` was empty during review. The experience workspace has no Git repository. No branch was created during that initial review. Current continuation branch is `codex/masar-continue`, created from `codex/masar-experiences`.

This is source-level review, not a runtime certification. Production database schema, provider credentials/availability, live bookings, and live AI outcomes were not exercised. No secrets files were read. Existing integration scripts were inspected rather than executed because some invoke external services or AI.

| Area | What exists | What the new flow needs |
|---|---|---|
| Frontend | Next 16.3.1, React 19.2.8, Leaflet maps, theme/auth contexts | Shared application shell and focused new screens; retain current stack |
| Explore | Local curated `exploreData.js`, filters, map, place cards | Persistent multi-place shortlist, must-visit selections, challenge labels, Trip Brief |
| Explore planning | A place button builds text and redirects to `/chat?prompt=...` | Structured planning request shared with chat |
| Profile | PostgreSQL `travel_preferences` JSON | Canonical preferences plus per-trip overrides; onboarding/preferences currently use different field names |
| AI | LangGraph orchestrator, event, hotel, flight, logistics, planner, parallel research | Structured Trip Brief, catalogue lookup, challenge eligibility, validated dated itinerary, resumable planning run |
| Streaming | `/api/v1/chat`, `useChat`, domain worker cards | Structured trip-ready event and durable trip reference; reconnect/retry behaviour |
| Trips | Persisted itinerary JSON, My Trips, detail modal, agent save/update tools | Actual travel dates, lifecycle, stable activity IDs, revisions, one Trip Workspace |
| Calendar | Interactive calendar for itinerary days and hotel dates | Trip days currently derive from `created_at`; use actual travel dates and challenge/activity links |
| Bookings | Hotel prebook/confirm/history; flight search/book tools | Honest status, explicit trip/activity links; no assumed reservation from a suggestion |
| Challenges | Standalone animations | Backend catalogue, eligible venues, attempts, uploads, review and points |
| Games | Puzzle, Al Fahidi arcade, Golden Roll; local demo scoring | Authenticated sessions, destination mapping and reward validation |
| Rewards | No reward models/endpoints | Transactional points ledger, coupon inventory/redemption, leaderboard |
| Notifications | No notification system | Persistent in-app inbox and scheduled reminders; optional push later |
| Tests | Several live/manual Python scripts and standalone experience verification scripts | Repeatable isolated backend tests, planner fixtures, frontend journey checks |

### Important source findings

- `main.py` chat lookup checks conversation ID without owner before loading history. Enforce ownership before reading or writing.
- `main.py` direct booking ownership mismatch currently executes `pass`. Enforce ownership and normalise the existing string/integer user ID representation.
- `AuthContext` exposes token/email but not a full `user`; My Trips currently destructures `user`. Add a consistent authenticated profile contract.
- API base URLs are inconsistently configured; some auth requests hardcode localhost. Centralise request configuration and error handling.
- The flight search/booking exception paths in `masarAiTools.py` can return mock offers/confirmed bookings. Make fixtures explicitly development-only; provider failure must never become a real confirmation.
- An orchestrator prompt names Duffel although flight implementation uses Nuitee/LiteAPI. Align prompts with actual tools.
- Trip activities are unrestricted dictionaries without required IDs/dates. Planner tools can replace an entire itinerary; preserve references and detect stale updates.
- Saved conversation messages contain text, not durable structured result-card records. Reloads should reopen trips/results through persisted references.
- The current LangGraph checkpoint is process-local `MemorySaver`. It is not a durable planning job system.
- The planner injects only the first 2,000 characters of each worker's research and extracts the saved trip ID from tool-message text using a regular expression. Pass structured relevant research and typed save results instead; a save status must reflect database success rather than the planner merely finishing.
- One migration adds DOB/gender that current User model/schema do not expose. Check migration/model drift in a development database before adding migrations.
- Calendar itinerary dates currently depend on creation time. Undated legacy trips must remain unscheduled until the traveller sets travel dates.
- The My Trips booked-only filter can treat a featured hotel or unrelated user booking as evidence of a booked trip. Replace with explicit booking associations.
- Attraction IDs differ between Explore and experiences. Burj Khalifa At The Top SKY is a ticketed product, so preserve the difference between the attraction and that specific product.
- The shared experience registry currently lists four modules; bowling, heritage, and sunset need registering. Some new demonstrations import shared bowling styles and boxing avatar assets.
- Sunset demonstration time/location are illustrative; the current weather tool does not calculate actual sunset windows.

## 3. Product rules to keep consistent

1. Target one suitable main challenge destination per day when challenges are enabled. Never invent a venue or force an unsuitable challenge. Explain when no suitable option exists and allow a replacement/skip.
   Approved initial scope: landmark capture only at Burj Khalifa, Museum of the Future and Sheikh Zayed Grand Mosque. Boxing and bowling reuse their respective animations only at malls with a verified matching facility. Sunset Seeker can reuse its animation at any suitable beach. No other challenge types or landmark-capture destinations may be selected until explicitly added to the supported catalogue. These reusable animation categories do not establish that a particular venue has been verified.
2. Personality means editable interests, pace, party, budget, accessibility and challenge preferences. Do not infer sensitive traits. Current-trip instructions override stored preferences.
3. Flight/accommodation requirements are explicit `needed`, `already_arranged`, `not_needed`, or `unknown`. Ask only for missing essential details. Nationality is not a substitute for travel origin or flight need.
4. Required user selections must appear in the itinerary or trigger an explained conflict. Optional selections may be omitted with a reason.
5. Real dates, route feasibility, opening hours, event dates, activity duration, travel gaps and challenge windows constrain the plan. Unknown information is labelled and never presented as verified availability.
6. Creating a plan does not book anything. Booking requires a separate explicit action and verified provider result.
7. Watching a preview, its loop finishing, or receiving a rendered demonstration photo never earns real points.
8. Client scores, local storage, EXIF and browser location are supporting inputs, not unquestionable proof. Reward decisions belong to the backend.
9. Trip, calendar, Today, assistant and notifications read the same saved plan. No independent copies of an itinerary in each screen.
10. Draft trips save automatically. Activation enables scheduling; cancellation/rescheduling updates reminders. An unknown-date trip cannot activate reminders.
11. Points values and coupon terms come from versioned server rules. The AI can explain them but cannot create balances, grant points or invent discounts.
12. All catalogues, result states and errors must work on mobile and with keyboard/reduced motion; 3D is optional to understanding a task.

## 4. Architecture and data contracts

Keep Next.js + FastAPI + PostgreSQL + existing LangGraph agents. Add feature-focused components, routers and services incrementally, rather than rewriting existing modules wholesale. Use installed dependencies and bundled Three.js initially; record a reason before adding a package.

### Proposed persisted records

| Record | Minimum responsibility |
|---|---|
| Place | Canonical attraction/venue ID, aliases/provider IDs, coordinates, emirate, source metadata; distinguish attraction from ticketed product |
| Challenge definition/version | Place/venue, animation key, requirements, evidence/quiz rules, eligibility, availability, reward policy, publication state |
| Trip Brief / shortlist | Owner, selected places and priority, dates, origin, party, preferences, flight/stay requirements, challenge settings |
| Planning run | Owner, brief snapshot, request idempotency key, status/progress, errors, resulting trip ID |
| Trip | Owner, dates, destination timezone, lifecycle, active status, brief snapshot and revision |
| Trip day/activity | Stable day/activity IDs, dates/times, place and challenge references, travel gaps, estimated cost, booking association, visit status |
| Challenge attempt | Owner, trip/activity if applicable, definition version, state, evidence, answers, review decision/reason |
| Evidence | Private object reference, type/size, upload metadata, processing state, deletion/retention fields |
| Game session | Owner, game/content version, server-issued session, answer/progress evidence, validation outcome |
| Points transaction | Earn/spend/reversal entry, owner, source, unique award key and applied policy |
| Coupon / redemption | Partner/offer, terms, inventory, eligibility, expiry, owner, redemption state and receipt |
| Notification | Owner, trip/activity reference, schedule, read state and deduplication key |
| Achievement / public ranking preference | Server-derived milestones and opt-in public display identity |

Use versioned, validated itinerary JSON first to preserve old trips and existing UI. Keep stable nested IDs and typed date/lifecycle/revision projections in the existing itinerary JSON, as delivered in the foundation checkpoint; add relational trip columns only when justified by later query needs. Keep attempts, ledger, rewards and notifications relational with constraints. Do not create duplicate activity tables and JSON as simultaneous sources of truth; normalise activities later only if query requirements justify it.

Store evidence outside the relational database in private file/object storage, with authenticated access. Define a storage interface so local development and deployed storage use the same API. Store references, not image data URLs, in database rows.

### Proposed API groups

- Profile: extend current `/users/me` with a normalised preference contract.
- Catalogue: `/places`, `/challenges`, challenge details and eligibility.
- Briefs: create/update/read shortlist and Trip Brief.
- Planning: create/read/cancel planning run, progress stream and trip-ready reference.
- Trips: retain existing read/create/delete routes; add update, revision checks, activation, and activity progress.
- Challenges: start/read attempt, upload evidence, submit, and authorised review.
- Games: create session, record eligible progress/answers, complete session.
- Rewards: wallet/history, available offers, redeem, owned coupons.
- Notifications: list/read preferences and read state.
- Leaderboard: time-bounded, opt-in rankings computed from eligible ledger entries.

Exact request/response schemas are implemented in the phase that introduces each API. All owner identities come from authentication; staff review requires an actual server-side permission.

## 5. Implementation roadmap — seven combined phases

Revised at the user's request on 23 October 2026. Related work is now grouped into **seven phases**, with Phases 1–2 complete at their current checkpoints and **Phase 3 in progress**. The scope, dependencies and completion checks remain; a phase is a product milestone, not a single oversized code change. We will build in small reviewable increments inside each phase.

| Phase | Outcome | Status | Previous numbering |
|---|---|---|---|
| 1. Foundations and reliability | Stable auth, ownership, provider honesty, trip identities and development baseline | Complete | 0 + 1 |
| 2. Explore and Trip Brief | Explore-first UI, shortlist, local brief, shared discovery and compact gold map | Complete for current local-first checkpoint | 2 + 3A + Explore polish |
| 3. AI planning and Trip Workspace | Server-owned brief → reliable AI research → saved editable trip | Complete | Remaining 3 + 4 |
| 4. Daily journey and challenge previews | Calendar, Today, reminders, eligible challenges and embedded animations | Complete | 5 + 6 |
| 5. Challenge completion and points | Actual evidence → review → one verified points award | Complete | 7 + 8 |
| 6. Games and redeemable rewards | Games, saved progress, reward validation and coupon redemption | Complete | 9 + 10 |
| 7. Community and release readiness | Opt-in leaderboard, catalogue tooling, performance and rollout | In Progress | 11 + 12 |

Historical `PHASE_0`, `PHASE_1`, `PHASE_2`, and `PHASE_3A` handoffs and commit names keep their original names. The mapping above explains them; do not rename completed records. The original Phase 3A discovery checkpoint is now grouped under Phase 2. Server persistence of the Trip Brief remains part of Phase 3, so a completed Phase 2 does not imply cross-device draft sync.

### Phase 1 — Foundations and reliability

Complete. See the historical Phase 0 baseline and Phase 1 handoff.

Tasks:

- Create proposed branch `codex/masar-experiences` after approval; preserve `master` and existing branding backups.
- Record the commit, local run instructions and baseline build/lint issues. Read the installed Next documentation required by `frontend/AGENTS.md` before frontend changes.
- Inventory experience assets, hashes, licences, shared imports and existing verification commands; retain standalone demos as the reference copy.
- Use an isolated development database and provider fixtures for migration, booking and AI tests. Do not point test writes at production.
- Add feature flags for new navigation, planning and rewards so incomplete features stay hidden.
- Fix conversation/prebooking ownership checks and add regression tests for another user's IDs.
- Centralise frontend API requests; expose a consistent authenticated user/profile; align preference fields with backwards-compatible reads.
- Separate development mocks from actual booking results and align provider prompts.
- Define canonical Place IDs/aliases and versioned Trip Brief/itinerary schemas.
- Add trip travel dates, timezone, lifecycle, revision and stable day/activity IDs. Audit migration/model drift in a disposable database first.
- Add legacy-trip adapter: retain readable history, label unknown dates, and never schedule from `created_at`.

Done when: branch and baseline are documented, existing flows can be reproduced, and the development database/provider mode is explicit. Existing failures are recorded, not misreported as regressions. old trips still open; one user cannot read/write another's protected records; existing preferences are preserved; provider errors cannot appear as real confirmations; schema migrations work against clean and legacy fixtures.

### Phase 2 — Explore and Trip Brief

Complete for the current local-first checkpoint. See the Phase 2 and Phase 3A handoffs and Explore UI checkpoint.

Tasks:

- Build the shared authenticated shell with MASAR's dark/gold theme and responsive navigation.
- Change authenticated home/login/onboarding destinations to Explore while retaining public landing and chat deep links.
- Add persistent shortlist with add/remove, must-visit/optional priority, map selection and compact summary.
- Implement the Trip Brief screen: actual dates, origin, travellers, interests, pace, budget, flights/stay status, challenge preference and accessibility.
- Keep current single-place planning usable until the new planner is available; clearly present incomplete actions rather than fake generation.
- Share a normalised backend discovery service between Explore and existing agent tools: Google Places directory leads and dated Ticketmaster events, with curated picks as fallback. Hotel rates remain in the existing dated Nuitee flow; official tourism portals/RAG remain research sources.
- Keep provider identities, source links and observation times; retain only provider IDs in the local shortlist. Refresh selected provider details before planning. Do not cache Google result content or plot it on Leaflet; bound the Ticketmaster cache and browsing requests.
- Keep new discovery separate from the closed challenge catalogue. A search result never verifies mall facilities or publishes a challenge.
- Compact the Explore introduction/controls, lead Discover with landmarks, and render a bundled, noninteractive glowing gold UAE outline beneath map markers.

Done when: a traveller can select several places, refresh without losing the draft, edit trip requirements and reach a validated brief. Phone layout and keyboard flow are usable. Shared discovery is accessible without an LLM browsing call, unresolved selections remain recoverable, and the first landmark cards are visible on the initial desktop screen. The real provider quota/credentials were not exercised by offline tests.

### Phase 3 — AI planning and Trip Workspace

Core delivered; remaining: conversational brief reconciliation, activity replacement, geographic route map and independent provider feasibility checks. Revision-safe manual edits and reservation provenance were corrected on 26 October. Account Trip Brief, recoverable planning runs, synthesis validation, and the editable Trip Workspace are delivered; see PHASE_3_BRIEF_CHECKPOINT.md, PHASE_3_PLANNING_RUNS.md, PHASE_3_SYNTHESIS_VALIDATION.md, and PHASE_3_WORKSPACE_HANDOFF.md.

Tasks:

- Add planning-run APIs and persisted status/result references with idempotent creation, cancellation, bounded retries and recovery from interruption.
- Both Explore and conversational planning produce the same Trip Brief; conversational missing-information responses update that brief.
- Gate hotel/flight workers using actual requirements. Keep event agent responsible for attractions/events/dining, logistics for routes/weather, planner for synthesis.
- Add approved place/challenge catalogue tools. Resolve aliases, return eligible candidates and record recommendation reasons.
- Validate required stops, dates, travel gaps, event windows, cost estimates and at most one main challenge per day. Repair a bounded number of times or return an actionable conflict.
- Save the validated plan once as a draft and emit a typed `trip_ready` result. Persist its reference so reconnect/reload does not lose the plan or create duplicates.
- Replace text/regex save-result parsing with a typed success/error result; preserve selected-place identities and relevant research instead of silently truncating essential itinerary inputs.
- Use a small durable job runner with PostgreSQL run records for long planning work; do not rely solely on a browser SSE connection or `MemorySaver`. Deploy it with explicit restart/retry behaviour.
- Add a dedicated trip route with day navigation, overview, timeline, route map, budget summary and challenge stops.
- Open this same workspace from My Trips, AI completion and later calendar/notifications.
- Add replace/move/remove activity and make-day-lighter actions with preview of changes and revision-safe persistence.
- Separate suggestions, rate holds and provider-confirmed bookings; associate bookings with the correct trip/activity and fix booked-only filtering.
- Add activate/archive/cancel and activity progress states. Preserve confirmed bookings and submitted challenges during replanning; flag conflicts for a decision.

Done when: chat and Explore create the same itinerary format; “no hotel/no flight” avoids those workers; must-visits survive; unsuitable challenges are omitted with explanation; failed research is labelled; retry/reconnect creates no duplicate trip. a three-day plan opens by direct URL, survives refresh, can be edited without a second trip being created, and displays correct reservation states. Legacy plans remain accessible.

### Phase 4 — Daily journey and challenge previews

Core delivered; account-owned due reminders corrected on 26 October. Remaining: live verified mall/beach configuration, remaining preview adapters, reminder preferences and any optional push worker. See [PHASE_4A_CHALLENGE_PREVIEW_HANDOFF.md](file:///c:/Users/efake/Desktop/MasarAI/docs/implementation/PHASE_4A_CHALLENGE_PREVIEW_HANDOFF.md) and [PHASE_4B_DAILY_JOURNEY_HANDOFF.md](file:///c:/Users/efake/Desktop/MasarAI/docs/implementation/PHASE_4B_DAILY_JOURNEY_HANDOFF.md). Connected saved plans to the actual day in `Asia/Dubai` time, introduced Today's Journey live companion, and embedded transparent 3D challenge previews.

Tasks:

- Rework calendar mapping around actual trip dates and `Asia/Dubai` destination time; handle undated trips explicitly.
- Add challenge/activity markers and deep links to the exact trip day/activity.
- Add Today summary on Explore and an active-trip selector when more than one journey overlaps.
- Create persistent notification inbox, preferences and deduplicated reminder jobs. Reschedule/cancel jobs on plan edits or cancellation.
- Start with morning plan, upcoming activity/challenge and submission-result messages. Add real sunset-window reminders only when calculations and destination rules exist.
- In-app notifications work without browser permission. Push/background delivery is an optional later increment requiring service-worker support and explicit consent.
- Seed approved destination/challenge records with requirements, sources, publication state and eligible windows.
- Register all seven experience modules; create a Next client adapter with lazy loading, cancellation and cleanup, preserving vendor assets/licences.
- Embed previews in challenge details inside the Trip Workspace and Challenges area. Reuse stage text, connected progress and interactive camera patterns.
- Standardise `preview`/`game` event envelopes; explicitly identify boxing and all other simulated captures as demonstration-only.
- Include static/reduced-motion alternatives, WebGL fallback and pause when hidden. Release the animation's resources when closed.
- Start with Museum of the Future Heritage Detective. Bowling/boxing remain preview-only until an actual venue and challenge rule set are configured. Sunset remains preview-only until a suitable real viewpoint/window is configured.

Done when: a trip created today for next month appears next month; timezone boundaries work; reminders are not duplicated and do not survive cancellation; selecting a reminder opens its activity. a planned challenge opens the correct animation without leaving the trip; repeated open/close does not accumulate active render loops/listeners; looping never creates an attempt, submission or award.

### Phase 5 — Challenge completion and points

Review core delivered; exact supported landmark identity, three-photo evidence/quiz and canonical dates corrected on 26 October. Full spend/reversal ledger and operational review controls remain gates. See [PHASE_5A_CHALLENGE_ATTEMPT_HANDOFF.md](file:///c:/Users/efake/Desktop/MasarAI/docs/implementation/PHASE_5A_CHALLENGE_ATTEMPT_HANDOFF.md) and [PHASE_5B_REVIEW_AND_POINTS_HANDOFF.md](file:///c:/Users/efake/Desktop/MasarAI/docs/implementation/PHASE_5B_REVIEW_AND_POINTS_HANDOFF.md). Delivered authenticated manual evidence review and additive XP/stamp awards. These awards are not a spendable points ledger.

Tasks:

- Add server-owned attempt lifecycle: in progress → submitted → under review → approved / needs another attempt / rejected, plus expired/cancelled where applicable.
- Add real device camera/file selection and per-challenge evidence checklist; preserve unfinished attempt metadata for resuming.
- Enforce file size/type limits, private access, upload finalisation and defined retention/deletion behaviour; remove public location metadata from shareable previews.
- Add versioned quizzes with server-held answer keys and bounded attempts. Do not send all answers to the client as part of the task payload.
- Implement an authenticated staff review queue, reasons and audit trail. Start photo challenges with manual review and clearly communicated pending status.
- Use location/time as supporting checks with an explanation and review fallback when permission is denied. Validate site suitability; do not claim perfect GPS/photo authenticity.
- Configure a real sunset window and viewpoint if enabling Sunset Seeker; venue-specific score rules if enabling bowling/boxing.
- Add transactional points ledger with unique award sources, earn/spend/reversal types and versioned policies.
- Award once from an approved submission, atomically with review processing; prevent duplicate awards across retries and concurrent requests.
- Show available points, pending submissions and history; distinguish demo scores, game scores and actual redeemable points.
- Add basic achievements derived from approved activity, without manually editable client counters.

Done when: a user submits actual evidence, sees its status on refresh and can retry where allowed; reviewers can decide with a reason; another user cannot read the evidence; duplicate submit requests do not create multiple decisions. Museum of the Future can be selected → planned → saved → scheduled → previewed → completed with evidence → reviewed → awarded once. Replayed callbacks, repeated review requests and concurrent submissions cannot increase the award. **First complete journey:** Museum of the Future selection → plan → schedule → preview → real evidence → review → points once. Review this journey before broadening games or redeemable rewards.

### Phase 6 — Games and redeemable rewards

Practice/demo checkpoint only. Server-issued game sessions persist untrusted practice results with zero verified XP. Real offers, points spending, inventory and merchant fulfilment are not implemented. Earlier completion claims are superseded by INTEGRITY_FIXES_2026_10_26.md. See [PHASE_6_GAMES_AND_REWARDS_HANDOFF.md](file:///c:/Users/efake/Desktop/MasarAI/docs/implementation/PHASE_6_GAMES_AND_REWARDS_HANDOFF.md). Delivered cultural mini-games and a fictional voucher wallet. Fake rankings, mock QR verification and unverified game XP have been removed.

Tasks:

- Add Play tab with puzzle, Lost Compass and Golden Roll, plus destination-card entry points.
- Preserve puzzle difficulties and images; map reveal/next-destination and quiz flows; link “Plan this visit” to the shortlist/Trip Brief.
- Persist signed-in progress, completion, version and achievements; scope any local cache by user and clear it appropriately on logout.
- Create server-issued sessions and bounded reward rules. Validate quiz answers/progress on the server and reject duplicate completion.
- Treat browser scores as display-only unless sufficient server validation exists. Keep arcade bests non-redeemable initially; introduce bounded redeemable game rewards only after replay/sequence validation is implemented.
- Preserve source/photo/map attribution and asset licences.
- Add partner offer catalogue, terms, inventory, point price, validity, per-user limits and owned coupon view.
- Implement atomic redemption that reserves inventory and deducts points once; handle retries, concurrent requests and reversals without negative balances.
- Add authorised partner/staff validation and single-use coupon consumption, including expiry and cancellation policy.
- Demonstrate first with clearly labelled test offers. Enable a real offer only with an actual fulfilment arrangement.
- Start with partner/venue redemption. Add hotel/flight checkout discounts only after confirming provider support and reconciling discount, payment and refund behaviour.

Done when: all three games open inside MASAR, relevant next-place actions work, progress resumes appropriately, and replaying a completion payload cannot farm points. one approved offer redeems once, produces a usable owned coupon, consumes once, and failed redemption restores the correct balance/inventory. Expired or unowned coupons cannot be used.

### Phase 7 — Community and release readiness

Planned. Add rankings and complete release checks after the reward pipeline works.

Tasks:

- Add weekly/monthly opt-in rankings using eligible earned ledger entries; spending points must not lower competitive earned-point totals.
- Provide display names, “your position”, milestones and accessible empty/loading states. Never expose itineraries, photo evidence, contact data or live location.
- Exclude demo scores, test accounts and reversed/disallowed awards. Recompute consistently when an award is reversed.
- Add shareable achievement cards only with deliberate user sharing and no automatic publishing.
- Expand verified places and challenges using reusable animation templates and versioned content; add remaining emirates to discovery as content is ready.
- Add a small staff catalogue workflow for publishing/unpublishing challenges, updating source checks and configuring reward rules.
- Measure planning success/time, itinerary changes, activity/challenge engagement, approval outcomes and redemption success without logging private evidence or raw sensitive data.
- Profile mobile network/3D memory; confirm no 3D downloads on initial Explore load, cap rendering quality and reuse cached avatar assets.
- Complete accessibility, error/retry/offline-interruption states, upload retention, monitoring and recovery documentation.
- Roll out behind flags to a small group; keep schema changes additive so the old flow can remain usable during rollout.

Done when: period boundaries and ties have documented rules; opted-out users are absent; displayed totals reconcile to eligible ledger entries. representative desktop/mobile journeys, provider failures, expired auth, cancelled/rescheduled trips, interrupted uploads and reward retries pass; rollback/disable steps are documented.

## 6. Source ownership map

Paths below are relative to `C:/Users/efake/Desktop/MasarAI` unless noted. New paths are proposals, not files already implemented.

| Workstream | Existing files to extend | Proposed additions |
|---|---|---|
| App shell/auth | `frontend/src/components/layout/Sidebar.jsx`, `context/AuthContext.jsx`, login/onboarding pages | Shared shell and API client |
| Explore/shortlist | `frontend/src/app/explore/page.js`, `components/explore/*`, `data/exploreData.js` | Shortlist/Trip Brief components, persisted brief hooks |
| Profile | `frontend/src/app/preferences/page.jsx`, onboarding, `schemas.py` | Preference normalisation shared by both screens/backend |
| Planning | `MasarAi.py`, `masarAiTools.py`, `prompts_orchestrator.py`, `prompts_workers.py`, `hooks/useChat.js` | Planning schemas/service/router, durable job runner and fixtures |
| Trip Workspace | `components/cards/TripDetailModal.jsx`, `ItineraryTimeline.jsx`, `app/trips/page.js`, `hooks/useTrips.js` | `frontend/src/app/trips/[tripId]/page.js`, reusable day/timeline/editor components |
| Calendar/Today | `components/trips/InteractiveTripCalendar.jsx`, Explore | Schedule/date utilities, notification service/inbox |
| Backend | `main.py`, `models.py`, `schemas.py`, `alembic/versions/*` | Focused feature routers/services; incremental migrations |
| Experiences | External workspace `components/*`, `vendor/*`, `INTEGRATION.md` | Versioned asset snapshot in frontend public directory; client mount adapter |
| Challenges/rewards | No existing implementation | Challenge, submission, review, wallet, coupon and leaderboard screens/APIs |

Keep existing endpoints compatible while new feature APIs are introduced. Extract code from large files only where needed for the active phase; avoid unrelated broad refactors.

## 7. Validation and delivery method

- Build one combined phase at a time in small reviewable increments, with a concrete demo and acceptance evidence; review at phase boundaries. Combining phases does not skip dependency, migration, verification or reward-integrity checks.
- Each implementation checkpoint records changed files, migration impact, checks, known limitations and the next phase.
- Backend checks use an isolated PostgreSQL database where transaction/constraint behaviour matters; external tools and LLMs use fixtures by default.
- Planning fixtures cover: international traveller needing flight/hotel; UAE resident needing neither; family/accessibility needs; missing dates; conflicting must-visits; unavailable challenge; failed provider; replan with an existing booking.
- Frontend checks cover both entry points, direct URLs, refresh/back navigation, expired auth, slow/error responses, mobile/keyboard and reduced motion.
- Reward checks cover concurrent approval/redemption, duplicate events, changed policies, expiry, reversals, access control and consistency between wallet/coupon/ranking.
- Experience checks reuse existing verify scripts and add host lifecycle smoke checks. Never connect a demonstration callback directly to award creation.
- Do not run live booking actions or production migrations as tests. Staging validation precedes any real activation.

## 8. Decisions resolved for this plan

- Exploration-first authenticated home; chat remains available.
- Save draft first, activate after review; one active trip selected for Today.
- One main challenge per eligible day by default, configurable and skippable.
- Keep public landing, existing bookings and old trips accessible.
- Use a curated/versioned challenge catalogue rather than unbounded AI-invented tasks.
- Begin with manual photo review plus deterministic quiz checks; richer image verification can follow after measured evidence.
- In-app reminders before optional push; private evidence storage before real uploads.
- Museum of the Future Heritage Detective is the first complete journey. Expand venue challenges only with real venue configuration.
- Do not build more animations until the shared catalogue/host pipeline works; then expand through reusable templates.
- No paid asset/framework service is required by this plan. Infrastructure/provider usage is a separate deployment decision, not an assumed free entitlement.

## 9. Immediate next implementation

Read INTEGRITY_FIXES_2026_10_26.md and verify the three-photo Museum of the Future journey before expanding scope. The next feature increment must explicitly choose among remaining Phase 3–5 gates; do not assume Phase 6 is production-ready from its historical handoff.

No real partner offer, reward debit, public leaderboard or browser-game award may be enabled without its missing server validation/fulfilment work. Never invent venue verification. Current in-app reminders are materialized on authenticated inbox reads; they are account-backed and due-gated, but do not send OS/push notifications while the app is closed.

No production migration, paid provider action, booking or deployment was authorized by this checkpoint.
