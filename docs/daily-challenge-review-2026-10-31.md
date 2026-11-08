# Daily challenge review — 31 October 2026

Reviewed and updated latest `master` at `b6e02d3`. Changes are local and have not been deployed.

## Fixed

- The spin response previously populated `assignment` immediately, which unmounted the wheel before rotation. The wheel now remains mounted until the animation ends, holds on the selected segment for 450 ms, then reveals the challenge.
- Rotation previously depended on its own state and an unstable completion callback, repeatedly scheduling turns. Animation effects now depend on the selected slot and motion settings; callback updates and pointer ticks do not restart the spin. All eight server slots are covered by regression tests.
- The challenge overlay now unmounts while the expanded game plays. Returning from a game restores the challenge dialog and its focus. Non-Sikka game hosts now have dialog semantics and focus containment.
- Daily Sikka now uses the promotional assignment/session callback instead of creating and completing an unrelated practice session. Score, elapsed time and parcel delivery reach the daily completion endpoint. Replaying preserves the daily session. Normal practice retains its existing API.
- Other games now submit their actual elapsed-time field (`elapsedSeconds`, `elapsed` or `time`). Updating parent callbacks no longer disposes and remounts a running experience every countdown tick.
- The challenge presentation uses charcoal surfaces, muted gold, lighter typography, an objective panel, a dedicated next-draw countdown row and responsive actions. Completion displays the API's `reward_coins` and actual coin balance.
- Countdown uses the server clock with client elapsed time and reloads the daily assignment at Dubai midnight when no game/spin is active. An uncertain spin response is reconciled by fetching the persisted daily draw. The popup remounts when the signed-in token changes.
- Completion rejects expired game sessions and expired/unaccepted venue submissions. Parcel delivery can only satisfy the Sikka objective. Starting an expired session returns a client error. History presents elapsed, unfinished assignments as expired.
- Successful completion applies the returned assignment and balance before refreshing Passport data, preserving the success screen if the follow-up refresh fails.

## Wiring confirmed

Notification bell → shared popup host → server-selected daily assignment → expanded game → daily completion endpoint → separate daily coin ledger → Passport balance/history and cache refresh are connected in source. The API tests use a temporary SQLite database and cover persisted one-draw-per-day behavior, game completion/retry, sequential duplicate credit, owner isolation, expiry, notifications and separate XP.

The card was visually inspected from the actual component's rendered markup on desktop and at 390 px width. The mobile DOM had 390 px scroll width and no horizontal overflow. Interaction verification uses component regression tests; no signed-in production playthrough or live reward credit was performed.

## Remaining gaps: the complete feature is not production-verified

1. **Venue evidence is not verified.** The existing submission endpoint approves any reflection of at least 15 characters and accepts photo metadata without processing an uploaded image. The daily modal only offers a text area; there is no photo upload/review flow. Accessible-equivalent selection changes the displayed prompt but is not sent as a distinct evidence mode. These need a separate evidence/review implementation before describing venue coins as verified attendance or objective completion.
2. **Venue eligibility/location quality needs review.** `build_wheel_pool(emirate)` currently ignores its emirate argument and always offers the same Dubai catalogue. The boxing entry identifies an arts-area place and a loosely named boxing district; exact supported venue/location and activity availability are not established by this implementation.
3. **Game scores are client reported.** The server checks owner, bound session, expiry and the objective threshold, but does not independently replay or validate gameplay. Daily coins remain promotional in-app points; these checks do not establish cheat-proof scoring.
4. **Concurrent credit requests need database-level stress coverage.** Ledger uniqueness exists and sequential duplicate completion is tested. Simultaneous completion requests may still surface a uniqueness error rather than an idempotent response; concurrency across processes was not validated here.
5. **Localization is incomplete in this feature.** Most daily-modal strings are plain English rather than routed through the app's translation components. RTL and translated full-flow QA remain outstanding.
6. **Persistent daily notifications can accumulate.** Inbox cleanup currently preserves previous persistent daily notices. The permanent bell action still opens today's assignment, but old daily notices should eventually be retired/deduplicated.

## Validation

- `node --test frontend/tests/daily-promotion-flow.test.mjs frontend/tests/daily-promotions.test.mjs`: 7 passing tests. Component regressions cover actual animation lifecycle/landing, reduced motion, timer cleanup, reveal timing, game handoff and Sikka's bound-session payload.
- `.myenv/Scripts/python.exe -m unittest tests.test_daily_promotions -v`: 9 passing tests.
- Focused ESLint for daily-promotions and the two modified Sikka components: passed.
- `next build`: compiled successfully, TypeScript passed and all 24 static pages generated.

The existing daily-promotions migration is already on master. Deploy frontend and backend changes together; production schema/migration state was not inspected or changed.
