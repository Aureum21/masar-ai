# Journey integrity corrections — 26 October 2026

Branch: `codex/masar-continue`. This supersedes “complete” claims in the earlier Phase 3–6 handoffs where they conflict with this document.

## Corrected behaviour

- Real challenge activation uses only the three supported heritage landmarks, resolved by canonical place identity (or an exact full-name match for legacy stops). One main task per eligible day. Unknown malls/beaches get no invented task. The fictional Sharjah pilot remains explicitly demo-only.
- Evidence resolves the exact trip activity; no first-challenge fallback or silent enablement. Current heritage tasks require all three discovery photographs plus the corresponding quiz answer. Photos are privately re-encoded into one contact sheet using the existing Submission image field; authorized human review is required. No GPS/attendance authenticity claim is made.
- Itinerary JSON is authoritative for dates. Existing sidecar dates migrate into undated legacy JSON once; subsequent sidecar reads mirror JSON. Passport scheduling and Workspace edits use revisions and the same owner-row lock. Source activity IDs survive normalization.
- Core PATCH edits require expected_revision, lock before reading the revision, reject stale requests, and protect reservation references and pending/completed evidence against unsafe move/removal/rescheduling. Explicit timing overlaps and dated-event mismatches are rejected.
- Move/reorder/remove/day-lightening first show a change review. Required selections and commitments are not auto-removed by day-lightening. Moving flexible stops clears stale time slots and invalidates old planning-check claims. Travel feasibility still needs independent provider verification.
- Trip reservation badges/filtering use linked provider outcome records. Sandbox confirmations and itinerary prose cannot claim a live booking. The budget remains an estimate; provider payment totals remain in Bookings.
- Reminders are account-owned PassportEvent records. The API materializes due reminders on inbox reads in Asia/Dubai time, retains up to seven days, deduplicates, preserves read/dismiss state and invalidates notices on cancellation/rescheduling. Morning notices appear from 07:00 GST; activity notices from 30 minutes before a known time. No browser-local notification store remains. No push/background delivery is claimed.
- Games start owner-scoped server sessions and persist idempotent practice completions. Browser results earn zero verified XP/stamps/redeemable points; no cross-account Award source collision remains. Historical browser-game awards are excluded from verified XP/levels and stamp display rather than being deleted from the database.
- Destination actions persist supported destinations to the actual trip shortlist instead of only displaying a toast. Game callback updates do not remount the WebGL scene. In-flight trip/booking reads are token-scoped.
- All offers remain fictional, marked as demo, using DEMO-prefixed codes with no merchant entitlement. Stamp eligibility remains separate from real reviewed awards. Fake QR art and fabricated leaderboard rows have been removed. No points are spent, no live inventory exists, no merchant integration is asserted.

## Schema / activation

No new tables, columns or migrations. Existing `passport_events` holds due notices and practice sessions. Existing production award rows are preserved. No production data migration, provider booking, purchase or deployment was performed.

Restart the backend if it is not running with reload, then refresh the frontend. The planner worker code was unchanged; no extra worker or terminal is needed for these fixes.

## Verification

The focused Passport/journey/trip suite includes private uploads, three-photo/quiz enforcement, exact catalogue scope, cross-account game sessions, due/read/reschedule inbox behaviour, shared dates and a real isolated PostgreSQL two-tab revision race. The existing planning/privacy suite uses fixtures and the guarded localhost:55432 database. Frontend tests cover timezones, shortlist contracts, manual edit helpers and honest reservation filtering. Production build and targeted lint are checked for this checkpoint; Final results: 75 existing planning/ownership tests, 32 focused journey/Passport/trip tests and the additional midnight-window regression pass (108 backend checks total); all 41 frontend tests pass; production build passes; targeted lint has zero errors and one existing image warning. No live provider requests were used.

## Manual review path

1. Plan a dated trip containing Museum of the Future, open `/trips/{id}`, and verify date/day navigation. Mark it active to receive due reminders.
2. Open its Heritage preview and submission form. Explicitly enable supported challenges if requested. Capture three discovery photos, answer the quiz and add observations. Incorrect or incomplete evidence must not award anything.
3. Submit, refresh and confirm pending status. An authenticated operator reviews the private contact sheet at `/profile/review`; approval awards once. Another account cannot access the evidence.
4. Open a game from Challenges. Completion saves practice progress only; no verified XP or stamp is created. A second account can play the same game independently.
5. Open two tabs on the same trip, save one edit, then attempt the stale edit. Expect a conflict. Review activity changes before applying; a future trip must not create early reminders.

## Still gated

Conversational brief reconciliation; replacement/map workflows; independent travel/opening-hours feasibility; verified mall/beach configuration; full point debit/reversal/inventory accounting; real partner fulfilment; server-validated redeemable gameplay; opt-in real rankings; operational review roles/retention and release/mobile audits. The present practice/demo features do not complete these gates.
