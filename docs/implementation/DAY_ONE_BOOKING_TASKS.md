# Day 1 hotel and flight booking tasks

Selected flights and rooms now appear above the Day 1 activity list in the trip workspace. The cards read their operations on return to the page, so prebook/confirmed/unknown states survive navigation. Existing trips recover party size from their saved planning run; new trip JSON also stores travel_party_size.

## Explicit flow

- Hotel: Prebook room obtains a current rate using the saved provider offer ID. Review the returned price/terms, enter holder and every guest name, explicitly accept the provider-account-card charge, then Book. Existing confirm_hotel / BookingOperation fencing handles confirmation and duplicate requests. All guests are assigned to the one room occupancy used by the current planner.
- Flight: enter contact, birthday, nationality and passport data for every adult traveller before prebook. The documented prebook endpoint requires these fields. It receives usePaymentSdk=false for the existing provider-account payment flow. If the account/offer does not support this, the provider can reject it; no payment bypass entitlement is assumed. Book is available only if returned paymentTypes includes ACC_CREDIT_CARD, then requires explicit consent. Card SDK/other payment methods are not implemented here.
- No provider call runs on page load except local operation reads. No booking runs during planning or offer selection. Testing never invokes live purchases.

## API and data integrity

GET /api/v1/trip-bookings/{trip_id}, POST /{trip_id}/prebook, POST /{trip_id}/book. The API obtains selected offer IDs from the owner’s immutable PlanningRun, not browser-submitted or editable trip offers. Long IDs are hashed only for the idempotency key and passed intact to providers. Existing booking_operations and pre_bookings tables are reused; no migration.

Operation records are reserved before contacting providers. Ambiguous/processing outcomes block repeat payment requests. Confirmed status requires the provider status AND a returned booking reference; a successful HTTP response alone is insufficient. Hotel and flight outcomes link to trip_id. Provider sandbox remains labelled and does not count as a verified live reservation.

## Flight search fixes

The tool now delegates to services/flight_search.py. Return legs explicitly use INBOUND; outbound uses OUTBOUND. IATA/date/passenger/cabin validation happens before the provider request, with the documented 11-month date horizon. Provider-returned sandbox airlines are shown with a test label rather than discarded and reported as unavailable. Upstream errors (including the saved 51099 error) stay visible and are not replaced by fabricated flights. The exact live cause of provider 51099 is not proven without a live provider/account check.

The hotel prebook helper uses the documented book.liteapi.travel host. Hotel confirmation now preserves bookingId, which the durable outcomes service needs to verify confirmation.

## Official references

- https://docs.liteapi.travel/reference/post_flights-rates
- https://docs.liteapi.travel/reference/post_flights-prebooks
- https://docs.liteapi.travel/reference/post_flights-bookings
- https://docs.liteapi.travel/reference/post_rates-prebook

## Verification and operation

Mocked tests cover prebook -> explicit book, owner isolation, posted offer tampering, party count, explicit payment consent, exact long provider IDs, idempotent repeats and ambiguous outcomes. Search fixtures cover roundtrip directions, sandbox inventory, provider errors and invalid requests. Frontend SSR checks verify Day 1 tasks appear only for saved selections and cannot book on render. Focused lint/build and planner regressions are run separately. No live provider availability or payment was tested.

Restart the backend and existing planning worker for Python changes; refresh the frontend. Open a trip with selected offers, choose Day 1, then prebook deliberately. For safe manual payment testing use provider sandbox credentials; live ACC_CREDIT_CARD charges the provider account’s saved card, as stated in the form. A rejected or expired offer requires fresh provider rates, not repeated payment attempts.

Final checks: 18 focused backend/planner tests passed, plus the changed-date guard test; 4 rendered frontend tests passed; production build passed. Focused lint has no errors (one existing flight image warning). No live availability request, prebook or purchase was performed.

## Developer sandbox clarification
The current configured key was checked without displaying it and is a sandbox key. GET tasks exposes a server-derived simulation flag. Sandbox UI says Simulate booking, removes saved-card charge consent, and requires confirm_simulation instead. No card data is collected. The existing provider functions behind the hotel tools remain in use; ACC_CREDIT_CARD remains only the provider's internal sandbox simulation parameter. Sandbox flight confirmation does not require returned live-card payment capability. The server refuses confirm_simulation against live credentials or a hold from a different environment; provider responses and references still determine confirmation. Tests use mocked providers; no actual provider simulation was submitted during this code change.

## Readable policies and selected-hotel photos
Raw provider policy JSON is rendered as human-readable cancellation terms. NRFN is Non-refundable rate; RFN remains conditional, and supplied fee amounts/deadlines are shown without assuming free cancellation. Check-in and route cards for the selected hotel prioritize its stored provider image over model-supplied or keyword-based landmark photos. A neutral local hotel placeholder is used when no authentic selected-property or room image exists. Other attractions keep their own image resolution. Nine focused presentation/card tests passed; focused lint and production build passed. Frontend-only change: refresh the trip page; no backend restart or booking retry is required.

## Booked values in trip budgets
The Budget tab separates selected quotes from provider-confirmed booking values. Live and sandbox values appear separately, grouped by currency; simulations are explicitly labelled as no real payment. Hotel confirmation retains the accepted prebook total when the provider omits its own total. Existing confirmed records recover that amount read-only from a hold matching owner, trip, kind, prebook ID and environment. Missing amounts remain unavailable rather than zero. Quotes and holds never inflate confirmed values. Nine focused frontend and nine isolated mocked backend tests passed; production build passed. Restart the backend and refresh the trip to see existing linked booking values; no rebooking or migration is needed.

## Flight search date feedback
Past arrival dates remain saveable for editing but cannot start or retry a planning request. The brief highlights invalid dates and date inputs prevent selecting past dates. Server admission enforces the same rule. Retry checks the immutable saved snapshot and directs the user to update the brief and start a new request. Empty flight responses have flight-specific guidance, failed runs show their current failure instead of stale synthesis progress, and empty research responses are not labelled Research received. Fifteen focused frontend and twenty mocked/isolated backend tests passed; focused lint and production build passed. No real provider call was made. Restart the API and planning worker, refresh the frontend, choose future dates, and start a new request.
