# Daily promotional challenge wheel: implementation handoff

Status: plan only, requested 2026-10-30. No promotional feature has been implemented.
Target branch: `integration/optimization-features` in `C:/Users/efake/Desktop/MasarAI`.

## Product intent

Add a daily MASAR AI promotional challenge. The user spins a wheel, which selects either an existing in-app game or a physical venue challenge. A successful completion earns **Daily Challenge Coins** in My Passport. These are a separate balance from XP, levels, existing stamps, and existing rewards. This feature must be independent of attraction-linked and trip-linked challenges.

For a game result: reveal the selected game and objective, let the user play it, validate completion, and award coins once. For a venue result: reveal the relevant existing animation (e.g. boxing), exact supported location, objective, coin amount, and Accept / Reject actions. Acceptance creates an active promotional assignment; it does not grant coins. Watching an animation or spinning earns nothing.

## Findings from the current repository

- Wheel source: `origin/feature/m-challenge-viewer`, inspected local revision `f3c70694947a2ba6ae97febc8bd8f29d7ed189c1`. Files: `frontend/src/components/challenges/FortuneWheelModal.jsx` and the wheel section of `challenges.module.css`. The old wheel uses five hardcoded heritage sectors, always lands on Al Fahidi, and calls a completion callback without a selected ID. Reuse the SVG, rotation easing, pointer tick and reveal styling only. Parameterize sector count/labels and target angle, remove destination constants, skip-to-award behavior and old orchestration. Do not merge/cherry-pick the entire branch.
- That branch's `DailyChallenge.jsx` gates the wheel on saved trips. Do not bring that rule, calendar, old daily service, demo flow or landmark viewer into this feature.
- Existing games live in `frontend/src/app/challenges/page.jsx`: `sikka-run`, `landmark-puzzle`, `tourist-arcade`, `ball-roll`. Sikka uses `frontend/src/components/game/SikkaExperience.jsx`; other experiences use the mount adapter near the bottom of the challenges page and assets under `frontend/public/masar-experiences/`.
- Existing server game sessions: `passport/router.py`, `/api/v1/passport/games/{game_id}/sessions` and `/complete`. They currently save practice results and award **zero XP**. Do not treat a browser score as verified venue evidence or use this endpoint to mint arbitrary coins.
- Existing animation preview: `frontend/src/components/trips/workspace/ChallengePreviewModal.jsx`, loading `/masar-experiences/{boxing|bowling|sunset|heritage}/index.html`. It mixes presentation and trip evidence actions, so extract a reusable presentation component rather than passing fake trip IDs. Preserve optional play, pause, text instructions and reduced-motion handling.
- Existing venue rules/identities: `domain/attractions.py`, `domain/places.py`, `domain/mall_challenges.py`, and `passport/catalogue.py`. A boxing animation is not proof that a location has boxing; only select reviewed eligible venues.
- Passport integration: `passport/models.py`, `passport/service.py`, `passport/router.py`; frontend `frontend/src/app/profile/page.jsx` and `_lib/passportApi.js`. Existing Challenge/Award rows require trip relationships and XP. Add dedicated promotional records rather than forcing this feature into those tables. Use `notifyPassportChanged()` after a successful coin award.

## Proposed defaults (product choices, not existing requirements)

1. One spin per signed-in user per Dubai calendar day, resetting at midnight `Asia/Dubai`. Everyone is eligible without a saved trip. Show the reset time and remaining time.
2. One persisted selection per day, across refreshes/devices/tabs. Rejecting consumes that day's selection; no reroll farming. Closing a dialog preserves the assignment. Games are started voluntarily, with a replay option for the same objective until expiry.
3. Start with **1 Daily Challenge Coin per successful assignment**, with configurable per-template amounts shown before acceptance/play. These are in-app promotional coins; no cash value or redemption is added by this work.
4. Completion/evidence must be submitted before daily expiry. Evidence already submitted may be reviewed later and still earns the original day's coins if approved. An expired assignment cannot be newly accepted or completed. Failed attempts may retry before expiry.
5. Limit the daily eligible pool before spinning to supported games and venue challenges suitable for the user's selected emirate/location preferences. Ask for a preferred emirate when needed; do not require device location. Offer an equivalent accessible objective for venue challenges where supported. No implied access, opening hours, participation fees or venue endorsement.
6. User clarification: the **notification bell is the entry point**, not a dedicated page or a new card on `/challenges`. Show a daily promotional notification with Spin / Resume / View result as appropriate. Selecting it opens an in-app popup over the current page. Keep the wheel, reveal, accept/reject and game/venue flow inside that popup; allow an expanded overlay for games when needed, without route navigation. My Passport displays the coin balance and history within its existing page.

## Backend design

- Add reviewed promotional templates/catalogue, with `kind` (`game` or `venue`), stable ID/version, title, short wheel label, objective, reward coins, eligibility, completion rules, active dates, and media reference. Game templates identify an existing `game_id`; venue templates identify an exact supported `place_id`, location display/map details, animation key and evidence/equivalent rules.
- Add an Alembic migration for `daily_promo_assignments`, with user, Dubai day, template/version snapshot, kind, selected slot, wheel-pool snapshot, lifecycle state, accept/reject/complete timestamps, expiry and optional linked game session/submission. Unique `(user_id, day)` prevents multiple daily draws. No required trip foreign key.
- Add `daily_coin_ledger` with user, assignment ID, positive amount, reason and timestamp. Unique assignment credit key; one transaction updates completion and writes the ledger. Calculate the balance from the ledger (or maintain a transactional cached balance). Existing XP, Award and stamp totals must not change. History remains meaningful after templates change.
- Use server randomness to choose from the frozen eligible pool on `POST /api/v1/passport/daily-promotions/spin`. Resolve concurrent requests through the database unique constraint and return the existing assignment. Do not select on the client, and do not generate a fresh winner after a network retry.
- Suggested endpoints: `GET /daily-promotions/today` (read-only status, pool, server time and expiry); `POST /daily-promotions/spin`; `POST /daily-promotions/{id}/accept`; `/reject`; `/game-sessions`; `/submissions`; `GET /daily-promotions/history`; `GET /daily-promotions/coins`. Every write checks owner, lifecycle, expiry and idempotency. Use established auth/transaction conventions in the passport router.
- For games, attach an unguessable server-created session to the accepted assignment and selected game. Validate mode/objective, session ownership, expiry and completion sequence. Adapt each game's completion callback to send the session, never a reward amount. A bare iframe `postMessage` or client `score` is not proof: validate message source/origin in the UI and use a server-validated objective/progress protocol where feasible. If a game cannot support the required validation, keep it out of the rewarded pool until adapted. Casual client games cannot provide cheat-proof scoring; do not describe their coins as verified travel or redeemable value.
- For physical challenges, reuse evidence validation/review helpers, but create promotional submissions independent of trip Challenge rows. Accept => active; submit => pending review; approved => completed + coin ledger credit once. Do not award on animation completion, acceptance, location alone or an unreviewed photo.

## Frontend flow and components

0. Integrate with `frontend/src/components/notifications/NotificationBell.jsx` and `passport/notifications.py`. Add a typed daily-promotion item and dispatch its action to a shared popup host instead of rendering a navigation link. Close the notification dropdown before opening the dialog; return focus to the bell when the flow closes. Deduplicate by user and Dubai day. Reading, clearing or dismissing a notification must not consume a spin, reject an assignment or grant coins. Preserve a compact Daily Challenge action in the bell menu so the day's result can be resumed even after notification dismissal. Ordinary notifications retain their current behavior. The popup host must survive page-specific bell instances and avoid duplicate overlays. No dedicated promotional route is needed; server logic and persistent state stay in the backend, not inside the bell component.

1. Extract the wheel into `components/daily-promotions/DailyPromotionWheel.jsx` with isolated CSS. Props include server-provided sectors, selected slot, spin state and reveal callback. Calculate sector angles from pool length. Wait for the spin response, then animate several rotations to the selected sector center; verify visual pointer and server result agree. A reduced-motion path reveals the same selection without a spinning animation. Clean up timers and preserve the selected result if the modal closes mid-spin.
2. Add `useDailyPromotion` to load the server state and implement draw/resume/accept/reject flows. Separate server lifecycle from temporary UI phases (spinning/revealing). On timeout, refetch today's assignment before offering retry. On day rollover, fetch the new day without losing a previously pending review.
3. Reveal panel for games: game title, measurable objective, coin reward, Play / Not today; Play accepts and creates a bound session. Extract reusable game launch/completion adapters from the current challenges page. Normal practice mode stays available outside the promotion; only a valid daily session can earn daily coins. Remove misleading XP copy from promotional mode.
4. Reveal panel for venues: exact location, objective, optional animation preview, evidence requirements, coins, expiry, Accept / Reject. After acceptance show directions and Submit evidence. Reject makes the assignment terminal for that day, with no coin change. Do not automatically add a trip or modify an attraction challenge.
5. My Passport: add Daily Challenge Coins balance and activity list, with active/completed/rejected/expired/pending states. Use a distinct coin icon and labels; no XP badge or level bar for this balance. Retain existing passport layout and XP/stamp areas. Refresh on `notifyPassportChanged()`.
6. Match Explore's gold/charcoal surfaces and diffuse amber glow. Lazy-load the wheel/game/3D assets. Use a labelled accessible dialog with focus containment/restoration, Escape, keyboard controls, optional motion and text alternatives. Announce the selected challenge and completion status. Integrate EN/AR/HI localization and RTL layout.

## Implementation order

1. Inventory reusable wheel/animation/game adapters; write catalogue and lifecycle contracts.
2. Add migration, server daily assignment selection, lifecycle and coin ledger; prove daily uniqueness and award idempotency first.
3. Deliver one real end-to-end game promotion (choose a game with an enforceable completion objective), with passport coin credit.
4. Add one reviewed boxing or bowling venue promotion, animation, accept/reject and evidence review path.
5. Add remaining eligible games/templates, passport history and polished wheel reveal.
6. Browser-check desktop/mobile and reduced motion, then run focused API, integration and UI regressions. Do not deploy automatically.

## Acceptance tests

- Wheel lands on the server-selected sector for every pool size/slot. Refresh/close/reopen keeps the same draw.
- Notification bell opens the wheel popup without navigating. Closing and reopening resumes the assignment. Clearing notifications leaves the daily assignment intact and reachable. Other notifications, unread counts, focus restoration and account switching work normally.
- Dubai midnight, server/client clock differences, concurrent tabs, request retries and account switching cannot grant extra draws or credits.
- The selected game launches in promotional mode and a qualifying completion grants exactly the configured coins once. Different game/session, fabricated reward amount, duplicate callbacks and expired sessions fail safely.
- Boxing result shows the boxing animation and a valid supported venue; accept/reject work independently of any trip. Acceptance and watching never grant coins. Approved evidence credits once; pending and rejected evidence do not.
- Rejected and expired assignments cannot be reopened for a new daily draw; timely pending reviews can settle after midnight.
- New users without trips can participate. Unsupported/unavailable venues are filtered before drawing. Accessible equivalents and reduced motion work.
- Coin balance/history persist in My Passport across devices. Existing XP, level, stamps, attraction challenges, trip challenges, ordinary practice games and reward vouchers retain their current behavior.

## Scope boundary

This document authorizes planning only for this turn. The next agent should implement after the user hands over this plan. Do not merge the challenge-viewer branch wholesale or import its demo rewards. The user explicitly permits changing game logic to fit the promotion, but daily promotional rewards must remain separate from existing attraction challenges and XP. The notification bell and an in-app popup are the required entry and presentation; do not build a dedicated page for this feature.
