# Phase 3: Trip Brief checkpoint — 23 October 2026

Branch: `codex/masar-experiences`. Phase 3 remains in progress.

## Implemented

- Authenticated account Trip Brief save/restore, one draft per owner, revision conflicts and explicit account/device version choice. Device autosave remains available while the database schema is pending; account saves are explicit.
- Validated structured handoff from Explore/Trip Brief to chat. Ownership and revision are checked before research.
- Deterministic flight/hotel eligibility for structured briefs. Missing essential choices return clarification without a model/provider call. Eligible planning workers have research-only tools; planning cannot book or send email.
- Typed save results require actual database success and an integer trip ID. Structured brief dates take precedence over model-generated dates.
- Existing plain chat remains compatible; full conversational brief updating is a later increment.

## Migration reconciliation

The configured app database was read-only inspected at `93b1e7c4a602`, with neither `places` nor `trip_briefs` present. The user identified their friend's branch as `alazar`.

Recovered `8f7e4b1d2c90_passport.py` and `93b1e7c4a602_booking_outcomes.py` byte-for-byte from `origin/alazar` (fetched at `949f8cb`). Added additive Trip Brief migration `20261023_briefs` and no-op merge `20261023_join`. The rest of the friend branch was not merged. Future challenge/reward phases must review its Passport functionality before duplicating it. Do not use metadata autogeneration to drop its existing tables.

From the current app revision, upgrading to head adds `places` with seven curated seeds, adds `trip_briefs`, and joins the migration histories. Existing Passport/booking tables are preserved. No stamp, reset, downgrade or data replacement is proposed.

**The configured app database has not been migrated.** Section 9 of the approved roadmap excludes production migrations; request explicit approval before applying this reviewed update. Recheck the current revision and table state first and stop on unexpected drift. Frontend account sync remains disabled until schema is available.

## Validation

- 43 isolated backend tests passed, including owner isolation, stale/conflicting saves, simultaneous first saves, clarification without a model, and worker/tool restrictions.
- 16 frontend Node tests passed. Targeted changed-file lint passed; production build passed for all 14 pages.
- Isolated PostgreSQL upgrades passed from each parent history: exact `93b1e7c4a602` and exact `20261023_briefs`. A booking fixture survived the first upgrade, all eight Passport tables remained, and both histories reached `20261023_join`.
- Exact offline SQL reviewed in experience workspace `planning/phase3-database-upgrade.sql`. The frozen places seed migration requires a process-local JSON literal renderer for offline output; online migrations pass unchanged.
- Browser verified device fallback on `/plan` without changing the user's draft; no browser errors. Screenshot: experience workspace `preview-phase3-trip-brief.png`.
- No live provider, booking or LLM calls; no dependencies installed.

## Remaining Phase 3 work

Durable planning runs/recovery, full structured worker research (including replacement of the existing 2,000-character truncation), validated itinerary synthesis and must-visit constraints, conversational updating, premium Trip Workspace, revision-safe activity/day edits, lifecycle and booking associations remain. This checkpoint does not complete Phase 3 or claim those guarantees.

## Approved app database activation — 23 October 2026

The user explicitly approved applying the update. A guarded preflight confirmed the exact starting revision `93b1e7c4a602` and absence of both new tables. Alembic applied only places, trip briefs, and the merge. A postflight confirmed `20261023_join` and both tables present. Existing Passport/booking migrations were not rerun. The earlier pending-approval notes describe the pre-activation checkpoint.

### Manual acceptance walkthrough

1. With backend on 8000 and frontend on 3000, refresh `/explore`, select two destinations, and open Trip brief.
2. Set travel dates, origin, travellers and explicit Flights/Accommodation choices. Check the destinations and priorities remain.
3. Click **Save to account** and expect the saved-to-account confirmation. Refresh and verify the details remain. For a genuine account restore check, sign into the same account in another browser profile, open `/plan`, and choose **Use account version** when offered.
4. To test conflicts, open the brief in two tabs before saving. Save a change in the first; edit and save in the second. Expect a version-choice message rather than silent overwrite. Choose which copy to keep.
5. Click **Continue in Ask MASAR** to exercise structured handoff. Set Flights/Accommodation to **Decide with MASAR** to test clarification. An explicit **Not needed** must exclude that worker. Ready research can use configured provider/model services; it does not book anything.

Account brief saving is implemented. Durable planning recovery, complete itinerary validation and the new editable Trip Workspace remain subsequent Phase 3 increments.
