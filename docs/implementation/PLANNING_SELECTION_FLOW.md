# Flight and stay selection workflow — 26 October 2026

## User flow

1. Trip brief: explicitly request flights/accommodation, choose dates/origin/travellers, and choose independently whether to select each service yourself or let MASAR choose.
2. Flight specialist runs first when needed. Its actual returned options appear using the existing chat FlightCard. Manual mode stops for Choose this flight. No booking occurs.
3. Accommodation specialist searches dated hotels. Manual mode stops at the existing HotelCard / Browse Rooms. Selecting a hotel queues the existing provider room lookup for the brief dates and party size.
4. Actual RoomCard gallery/quotes appear with Choose this room instead of prebooking. Choose another hotel returns to the stored hotel list. Manual choices survive leaving/reopening progress.
5. MASAR mode advances automatically, comparing positive AED quote amounts and otherwise using the provider/agent's first returned hotel suggestion. It cannot invent quotes or compare currencies without conversion; if no automatic quoted choice exists it asks the user. Empty results fail with an honest retry message.
6. Places and transport research runs after financial selections. The planner receives only the chosen flight, hotel and room as its financial research context, then saves the itinerary once.
7. The server attaches selected provider quotes to the saved trip. Budget displays selected flight total plus selected full-stay room total, grouped by currency; other costs are excluded, not represented as free. These are estimates from quotes, never confirmed reservations.

## Storage / API

- No migration. Existing planning_runs.workers JSON includes a private planning_state entry with stage, revision, chosen records, and a bounded hotel shortlist. Normal research snapshot extraction ignores that entry.
- Public choice_flow exposes the current stage and selected records. A durable pause uses physical interrupted + awaiting=true internally, presented as awaiting_choice by the API. No worker lease runs while waiting.
- POST /api/v1/planning/runs/{id}/choice accepts stage, expected_revision and option_id OR choose_for_me. Only owner-returned stored options are accepted; posted price/data fields are forbidden. Stale/double selection returns 409.
- POST /{id}/change-hotel returns to the already researched list. Waiting requests count as active for admission and support cancel. Normal choice continuations do not consume retry attempts. Claiming a stage clears only that stage's old research to prevent stale-result reuse on retry.
- Earlier failed/interrupted name-only runs are upgraded to the staged flow when retried. Earlier rows cannot reconstruct cards that were never saved. Restart the planning worker before retrying; its Python imports do not hot reload.
- Hotels/rooms/flights are shown using the same ContextPanel and cards as chat; planning callbacks stay on the progress page. Chat interactions retain their existing behavior. Planning tools remain read-only and cannot prebook, pay, book, or send email.

## Planning review error

The model sometimes copies a canonical place ID into selection_id although that ID is not in the actual shortlist (e.g. Sheikh Zayed Grand Mosque uses a different catalogue shortlist ID). The validator now repairs only unambiguous known aliases to the exact selected ID. Recommended stops with selection_id equal to place_id lose the misleading selection label. Unrelated IDs, missing must-visits, identity conflicts, and wrong ticket products remain rejected. Planner instructions explicitly distinguish recommendations from shortlist choices. Repeated internal errors no longer show raw schema instructions to travellers.

## Verification / local test steps

Offline tests cover manual and automatic flow, real specialist graph card streaming, owner checks, stale/double choices, no early synthesis/save, pause persistence, room lookup dates, another hotel, cancellation, empty responses, safe snapshot galleries and exact quote totals. Provider calls and LLMs are mocked in tests. Existing planner, trip-brief, itinerary, and rendered card checks are included. Production build and focused lint are run separately. No live provider availability or browser end-to-end planning is asserted.

Restart backend if not running with reload, and restart the existing worker from the app root with `.myenv\Scripts\python.exe -m tools.planning_worker`. Frontend dev server on 3000 refreshes normally. No extra terminal or database migration is required.

For manual testing: choose future arrival/departure dates, set needed services, keep I’ll choose modes, save/start the request, select a flight, browse hotel rooms, choose a room, then inspect the resulting trip's Budget tab. Leave/reopen through Trip brief → Pick up your journey while waiting. For automatic mode, repeat with Let MASAR choose on both fields. Live providers can legitimately return no inventory or unavailable errors; these must never result in fabricated options or a confirmed booking.

Final verification: 61 combined backend tests passed, followed by 3 targeted tests after the final hotel-name/provider-origin guard; 23 frontend tests passed; production build passed. Focused lint has no errors and 9 pre-existing image warnings. Browser/live provider end-to-end verification was not performed.

## Long room-offer ID fix
Room provider offer IDs can exceed 1,000 characters. Planning options now expose a short deterministic choice_id tied to the stage and exact stored option. The API matches it only within the authenticated owner's returned options and retains revision checks. Older open pages may still submit raw IDs up to the bounded 32,768-character maximum. Opaque provider IDs are preserved intact in new snapshots; oversized options are omitted instead of silently truncated. Previously truncated bytes cannot be reconstructed without fetching room rates again. Existing text/card-size bounds remain.
Verification: 8 backend checks (including an 8KB ID through persistence and the choice endpoint), 3 rendered-card tests, lint with no errors, and production build passed. No live room selection or provider booking was performed.
