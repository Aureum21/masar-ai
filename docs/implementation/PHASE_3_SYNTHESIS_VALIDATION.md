# Phase 3: synthesis save checks — 23 October 2026

Phase 3 remains in progress. This checkpoint strengthens new structured planning requests; it does not claim complete real-world feasibility verification.

## Implemented

- New plans cannot save while required selection IDs are missing. Canonical aliases are resolved; Burj Khalifa At The Top SKY keeps a separate product ID. An exact selected product cannot be replaced by the generic attraction.
- Day count/duration must match the inclusive chosen dates, with consecutive ordered day numbers and no empty days. Explicit day/event dates must align with their itinerary day.
- Explicit HH:MM times, durations, nonnegative stated travel gaps and numeric cost estimates are checked. Known intervals cannot overlap or violate the plan’s own stated travel time. Flexible/unknown timing remains a draft with a visible confirmation note rather than invented precision.
- Every omitted optional selection requires a reason, saved with its identity/name for review. Must-visits cannot be excused through optional omissions.
- Closed catalogue lookup tool supplies the 18 existing curated identities and supported capture landmarks. Only the three approved landmark captures qualify automatically. Mall bowling/boxing and beach sunset challenges need trusted venue configuration that has not yet been added; model-supplied verified flags cannot qualify them. At most one main optional challenge/day, and disabled challenges are rejected. Recognized model reward claims are stripped; previews cannot award points.
- All structured research now reaches synthesis; the four arbitrary 2,000-character cuts were removed. Catalogue, exact brief and latest server repair issues are supplied to the planner.
- Validation runs before opening a save transaction. First proposal plus two repairs maximum; a third rejected proposal ends without a fourth model call. Tool argument errors and typed save failures are bounded as well. Actionable conflicts remain in saved run progress/message; a failed validation cannot become a saved-trip success.
- Review metadata lives in existing itinerary JSON. The saved-trip page has compact expandable notes for omitted flexible stops and remaining uncertainties. Existing plans are not rewritten/revalidated, and unstructured legacy chat saves keep their existing path.
- Fixed null planner instructions exposed by the full graph regression. A fixture for repeated durable saves now submits three days to match its three-day brief.

## Validation

- 75 offline backend tests passed, including full LangGraph repair execution, validation before database writes, required/product identities, omission explanations, time conflicts, closed challenge scope, legacy save compatibility, existing owner/recovery/concurrency tests and progressive cards.
- An initial run had an isolated connection timeout during the concurrent frontend build; the full later run passed. The new graph test also exposed a null-instructions case that was fixed before the passing run.
- Final production build passed (14 static pages, 2 dynamic routes). Changed review-note components passed targeted lint.
- Separate API/frontend preview with disposable fixtures verified the review summary and expanded Louvre omission/uncertainty notes; no browser app errors. Screenshot in experience workspace: `preview-phase3-plan-review.png`.
- No new database migration, dependency installation, live model/provider call, booking or reward action. App account/trip records were not used as tests.

## Operational note and remaining work

Restart the separate planning worker before starting a new planning request to load the new save checks. Do not automatically interrupt a traveller’s active worker. Old trips remain accessible; new structured saves receive these checks.

Declared event dates and timing arithmetic are checked, not independently certified against every provider. Current opening hours, inventory, event-source reconciliation, actual route feasibility, hard budget amounts and verified mall/beach configurations still need the next source-validation work. Unknowns are labelled in review notes; no claim of confirmed booking or verified availability is made.

The full editable Trip Workspace, revision-safe day/activity changes, booking associations/lifecycle and conversational brief updating remain Phase 3 work. The preserved live concierge/card interface remains in place.
