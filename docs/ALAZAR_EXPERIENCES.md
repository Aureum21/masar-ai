# Alazar experiences integrated into master

Scope: selectively imported from `origin/alazar` commit `d0099af` onto master `179f315`. This is not a full merge of Alazar's older application foundations. AR/model-viewer/GLB assets, duplicate game scoring tables, fictional leaderboard payouts, and legacy authentication/planning changes were excluded.

## Where to find the features

- **Challenges → Secret Sikka Run** opens Alazar's Three.js runner with collision obstacles, route choices, optional merchant parcel pickup, coffee-courtyard delivery, audio and touch/keyboard controls. The original three mini-games remain available.
- **Time Travel** is available in the sidebar and the Challenges header. Eleven heritage archives cover all seven emirates. Select a site, choose an era, and drag the before/after divider or use its keyboard-accessible range control.

## Preserved boundaries

- Arcade completion uses existing authenticated Passport practice sessions. Completion is owner-scoped and idempotent; it awards zero redeemable XP, stamps or points. Replays start a fresh session. Existing challenge evidence, strict/light policies, exactly-once awards and S3 storage are unchanged.
- Add-to-trip saves the real Al Fahidi district to the existing shortlist. Stylised game route labels are not inserted as fabricated catalogue destinations. Shortlist identity, duplicate and capacity checks apply.
- Time Travel is a read-only heritage experience, not attendance verification or challenge evidence. It never writes rewards. Sample browsing never calls an AI provider.
- Historical illustrations and Alazar's draft narratives are explicitly labelled. Neither historical accuracy nor image rights/source provenance has been independently established. Source review is required before marketing these as authenticated historical reconstructions.
- Recognition only accepts a supported catalogue ID with a provisional score of at least 0.80. Unknown IDs, unrelated/ambiguous observations and provider errors cannot unlock a manufactured archive. Model scores are not guaranteed accuracy percentages.
- The camera starts only on request, stops after capture/navigation, and is released on unmount. Uploads are bounded to JPEG/PNG, 5 MB and 16 megapixels; EXIF is removed before provider transmission. Requests are limited to five per user per minute and two concurrent model calls per API process, with bounded timeouts. The production API currently runs one process; these are not distributed limits.

## Architecture / files

- `frontend/src/components/game/MasarArcadeRun.tsx`, `sikka/*`: imported rendering/game mechanics, with lifecycle and main-app adapters.
- `frontend/src/components/game/SikkaExperience.jsx`: session creation, idempotent completion, retry, replay and shortlist callback integration.
- `frontend/src/app/challenges/page.jsx`, `passport/catalogue.py`: new `sikka-run` practice game.
- `frontend/src/app/time-travel/`: authenticated MASAR page shell and imported interactive before/after renderer. No AR viewer.
- `data/heritage_archive.v1.json`: Alazar's eleven-site archive, separated from model inference.
- `routers/time_travel.py`, `services/time_travel.py`: authenticated archive browsing and optional bounded recognition; no new database schema.
- `services/api_protection.py`: bounds the recognition request body, including chunked uploads, before JSON decoding.

## Local run / optional configuration

1. In `frontend`, run `npm install` (or `npm ci` on a clean checkout), then `npm run dev`. Three.js and TypeScript support are now included in the lockfile.
2. Restart the FastAPI development server from the project root. Existing planning/evidence workers do not need changes for these experiences.
3. Browse `http://localhost:3000/challenges` and `http://localhost:3000/time-travel` after signing in.
4. Archive browsing works without a vision API call. Photo recognition is **off by default**. To enable it explicitly in the backend environment:

```ini
TIME_TRAVEL_VISION_ENABLED=true
TIME_TRAVEL_VISION_MODEL=gpt-4o-mini
# Use the backend's existing OPENAI_API_KEY; never put it in frontend variables.
```

This optional scanner uses the existing OpenAI provider and may incur API charges; it is separate from the local SigLIP/OCR challenge evidence worker. Restart the API after changing its environment. No keys/environment secrets were changed by this integration. No push, deployment or migration was performed.

## Validation

- Production Next.js build and TypeScript compilation passed.
- 99 frontend Node tests passed, including imported parcel delivery and rendered-scene resource tests. A copied test that duplicated its own implementation was deliberately omitted.
- 59 backend tests passed across `test_time_travel`, `test_passport`, `test_boxing_verification` and `test_scene_verification`. Temporary SQLite and explicitly local test evidence storage were used for the successful regression run.
- Deterministic Time Travel tests cover auth, catalogue/assets, unknown IDs, ambiguous/unrelated recognition, score preservation, invalid images, body-size/rate/concurrency limits, disabled recognition and safe provider errors. These do not establish real-model accuracy.
- 13 production security tests passed. The 12 PostgreSQL planning-run tests could not run: the isolated fixture on port 55432 is offline. Planning behavior was not changed, and no production database was used for that suite.
- Focused experience lint: zero errors; six image-optimization warnings.
- Local browser checks: eleven-site listing, Al Hisn era switching, before/after renderer, arcade loading, optional parcel pickup, countdown/run and saved practice completion with zero XP.
- No paid image inference or browser camera permission was invoked during validation.

## Follow-up work

1. Validate photo recognition against a labelled real-image set, especially visually similar forts; calibrate thresholds before production enablement.
2. Verify archive narratives, dates, image provenance and reuse rights with authoritative tourism/heritage sources.
3. Keep arcade scoring practice-only until a server-validated run protocol is designed; browser scores cannot be trusted for redeemable rewards.
4. AR remains deferred. No new schema migrations, booking flow or trip planner changes are needed for this release.

Suggested commit: `feat: integrate Alazar arcade and Time Travel with master safeguards`
