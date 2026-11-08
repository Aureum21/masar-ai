# Accessibility continuation audit

Reviewed 30 October 2026 (Asia/Dubai), on integration/optimization-features.
Scope: inspect the existing application and partial work, repair the identified account-sync omission, and define the remaining implementation. This is not a claim that the five requested features are implemented or that WCAG conformance has been established.

## Current application path

MASAR combines a Next.js/React frontend with a FastAPI backend and LangGraph specialists. Explore combines curated attraction identities and external discovery. The planning brief is saved locally, optionally synced as an owner-scoped, revisioned JSON payload, and handed to chat or durable planning runs. Durable runs progress through flight, hotel, room and itinerary research stages. The server validates itinerary identity, required selections, dates, timing and challenge eligibility before saving. Trips have a calendar, reservation tasks, evidence submissions, Passport XP/stamps and rewards; arcade, Time Travel and receipts also exist.

Relevant path:

- frontend/src/app/plan/page.jsx -> useTripDraft / tripDraft.js -> cloudBrief.js / useCloudBrief -> routers/planning.py.
- services/planning_runs.py -> domain/planning_choices.py -> MasarAi.py specialists and synthesis -> masarAiTools.py save tool -> domain/itinerary_validation.py.
- services/nutiee.py supplies hotel search/details/room quotes and hotel booking calls; services/flight_search.py supplies read-only flight search.
- domain/research_preview.py deliberately stores bounded display snapshots. Any new accessibility evidence needs an explicitly bounded contract here, or it will disappear between provider output and durable choices.
- passport/catalogue.py, service.py and evaluators.py govern challenge tasks/evidence/awards, independently of demonstrations.

## Verified partial work and this update

Existing uncommitted changes were preserved in domain/planning.py and frontend/src/lib/tripDraft.js. They add seven support codes, indexed per traveller, essential needs, defaults, draft parsing and a handoff instruction. Backend validation rejects unknown support codes, repeated traveller assignments, assignments outside the party and essentials absent from needs.

This update adds traveller_support to cloudBrief.js's allowlist. Previously both account serialization and inline structured handoffs lost it. The account brief already uses validated JSON payloads, so this field alone does not require a new SQL column or migration. An older deployed backend would reject the new field; frontend/backend releases must be coordinated.

Added frontend round-trip coverage through account payload/restore/inline handoff and five offline backend contract tests. No new support UI, provider filters or planner enforcement was added in this audit.

## Remaining work by feature

| Area | Current state | Required continuation |
| --- | --- | --- |
| Practical travel profile | Plan page exposes three trip-wide comfort chips; per-traveller constants/model exist but have no UI. Preferences has no dedicated support editor. | Add a shared support editor to trip planning, with traveller labels, support selection, essential toggles, accessible error association, removal and party-size changes. Ask what support is needed, without diagnosis. Decide explicitly which personal defaults belong in the profile and which companions belong only to a trip. |
| Validation and compatibility | Backend checks several invariants; frontend parse/validate checks are weaker. profileBrief initializes traveller_support to an empty array. | Match validation across client/server: allowed codes, integer traveller IDs, party bounds, unique travellers, bounded arrays, essential subset, malformed/null objects. Normalize duplicate needs. Preserve support through editing/restoring/resetting. Map legacy comfort strings deliberately; do not silently assign a shared preference as an essential requirement for every traveller. |
| Destination facts | Explore cards/catalogues have identity, descriptions, sources and challenge metadata, without structured per-fact accessibility evidence. | Define facts for entrance, toilets, lift, surface, walking distance, quiet times and assistance contact. Each fact needs value/unit, confirmed/reported/unknown status, source URL/provider, source date when available and last checked timestamp. Add read/display/filter paths for curated and discovered places. Missing data must stay unknown. |
| Planning eligibility | Brief JSON reaches specialists and synthesis. Current routing limits service searches; itinerary validation checks timing/identity/challenges, not support compatibility. | Build a deterministic evidence matcher before synthesis, then repeat essential checks at selection/save. Exclude known conflicts; retain unknown candidates only as clearly labelled confirmation-needed options. An unknown essential need must prevent automatic endorsement/selection until resolved. Resolve incompatible must-visits with the traveller rather than silently omitting them. |
| Schedule and daily notes | Handoff text suggests rests, but there are no quantitative walking/rest limits or required daily accessibility notes. | Capture optional maximum walking distance and preferred rest interval/duration; distinguish estimates from venue facts. Add accessibility_notes to TripItineraryDay, its save/normalization/edit contracts and trip/calendar presentation. Preserve notes through updates. Validate travel/rest allowances and include unresolved confirmations every day. |
| Hotels | Provider adapter drops accessibility metadata. Hotel/room cards show ordinary quotes. Auto-choice ranks price without support constraints. | Request provider evidence, normalize it, preserve it through previews/flow/selected quotes and display it on HotelCard/RoomCard. Separate property facilities, room-specific evidence, live offer availability and confirmation status. Apply essential checks to manual and automatic selections and booking preparation. |
| Flights | Search carries route/dates/passenger count/cabin; no assistance request/status contract. | Carry per-passenger requirements into a visible assistance checklist and booking review. Confirm the supported airline/provider assistance mechanism before implementing API submission. Track requested/pending/confirmed/unavailable with a reference and time; buying a ticket must not imply assistance confirmation. |
| Equivalent challenges | Existing catalogue includes varied evidence methods and some task-specific alternatives. Dynamic boxing/bowling tasks remain physical; there is no general equivalent-task policy linked to support needs. | Add explicitly catalogued equivalent tasks with comparable verification, same reward entitlement and shared deduplication. Update evidence schema, reviewer/evaluator and award service before exposing alternatives. Preview watching must not award XP. Test that original plus alternative cannot earn twice. |
| Controls and WCAG | Calendar has keyboard navigation; evidence dialog has focus handling; JourneyShell has reduced-motion CSS. ChallengePreviewModal loads an iframe for animated tasks and has only Escape handling at the parent level. | Provide text instructions for every challenge and an explicit optional preview control. Add persistent reduced-motion preference respecting OS defaults; embedded animation loops must honor it too. Add dialog naming/focus containment/restore, iframe keyboard controls and equivalent text flows. Audit maps, forms, calendars, checkout and evidence submission with keyboard and screen readers. |

### Concrete validation mismatch reproduced

validateBrief currently returns no errors for either needs: ['bogus'] or two entries with traveller: 1. parseDraft only checks the basic support-array shape; it does not validate support codes or the essential subset. Malformed shapes also need safe handling before planningPrompt calls join(). These are remaining issues, not covered by the passing tests as completed behavior.

## LiteAPI integration to use

Verified against the public official documentation on the review date; no authenticated supplier call was made and account entitlement/data coverage remain unverified.

- Hotel rates POST /v3.0/hotels/rates documents advancedAccessibilityOnly, facilities and strictFacilityFiltering. Default facility matching is any requested facility; essential combinations require strict matching. Property filtering is a discovery aid, not proof of a particular room.
- Hotel listings GET /v3.0/data/hotels document advancedAccessibilityOnly, facilityIds, strictFacilitiesFiltering and accessibilityAttributes. Note the different strict-filter parameter names between listings and rates.
- Hotel details GET /v3.0/data/hotel documents advancedAccessibilityOnly=true to return the accessibility section; rooms can include roomAmenities. Retrieve facility IDs from GET /v3.0/data/facilities rather than inventing IDs.
- The rates schema documents roomId linking a rate to static room details. Preserve this stable mapping when supplied. MASAR's current word-overlap room matching is for photographs and must never establish accessibility. Missing mapping stays unknown. Inspect fixtures from the actual account before defining exact nested field mappings.
- Distinguish a supplier-reported property/room feature from independently confirmed suitability and from confirmation for the exact offer, occupancy and dates. A field named advancedAccessibilityOnly is not an accessible-room availability guarantee. Do not translate missing/empty/zero measurements into a positive claim.
- Current public flight search and ancillary-service docs do not establish a wheelchair/SSR submission contract. The servicing guide mentions special requests, but that is insufficient to invent an API field or claim assistance has been arranged. Confirm with the provider before wiring it; retain an explicit confirmation-needed workflow meanwhile.

Official references:

- [Rates](https://docs.liteapi.travel/reference/post_hotels-rates)
- [Hotel listings](https://docs.liteapi.travel/reference/get_data-hotels)
- [Hotel details](https://docs.liteapi.travel/reference/get_data-hotel)
- [Facility catalogue](https://docs.liteapi.travel/reference/get_data-facilities)
- [Flight search](https://docs.liteapi.travel/reference/post_flights-rates)
- [Flight ancillaries](https://docs.liteapi.travel/reference/post_flights-prebooks-prebookid-services)
- [Flight servicing](https://docs.liteapi.travel/docs/flights-support-billing-model)

## Suggested implementation order and acceptance checks

1. Complete the shared support contract and per-traveller UI. Round-trip different needs for two travellers across refresh/account restore/handoff; reject malformed support without throwing; handle a smaller party without silently losing essential needs. Preserve old briefs.
2. Add a bounded accessibility-evidence contract and LiteAPI adapter. Mock supported/missing/conflicting data, strict filters and missing room IDs. Ensure evidence survives research_preview, choice flow and selected-offer persistence. Require explicit review for unresolved essential room needs even when MASAR chooses automatically. Avoid fetching full static details on every poll: use bounded concurrency and a source-aware metadata cache with visible freshness, while keeping quotes/date availability separate.
3. Add destination facts and deterministic compatibility checks. Start with a small sourced catalogue; do not mark every attraction accessible based on general tourism guidance. Apply checks before generation and when validating a save, including recommendations and must-visits. Include routes/transfers, not just venue entrances. Add quantitative rest/walking preferences and daily notes end to end.
4. Add assistance tracking and equivalent challenges. Verify provider capabilities separately from hotel filtering. Reuse existing owner checks, idempotency and award ledger. Test duplicate awards, retry/review behavior and distinct traveller assignments.
5. Complete the controls audit. Cover focus order/visibility, contrast, zoom/reflow, labels/errors/status announcements, target sizes, dragging alternatives, accessible authentication, and reduced motion. Check Arabic RTL and Hindi/English strings. Existing JSX lint and keyboard tests do not establish WCAG 2.2 AA conformance; run automated checks plus manual keyboard and screen-reader checks on complete journeys, including embedded experiences.

Starting implementation files: frontend/src/app/plan/page.jsx, frontend/src/lib/tripDraft.js, domain/planning.py, services/nutiee.py, domain/research_preview.py, domain/planning_choices.py, services/planning_runs.py, domain/itinerary_validation.py, masarAiTools.py, and frontend/src/components/cards/{HotelCard,RoomCard}.jsx.

Destination/UI follow-through: domain/attractions.py, services/attractions.py, services/discovery.py, frontend/src/components/explore/ExplorePlaceCard.jsx, frontend/src/components/trips/workspace/TripWorkspace.jsx and the itinerary edit/normalization paths. Challenge follow-through: passport/catalogue.py, passport/service.py, passport/evaluators.py, ChallengePreviewModal.jsx and the embedded experiences under frontend/public/masar-experiences.

Source starting points supplied by the user: [Visit Dubai accessibility](https://www.visitdubai.com/en/plan-your-trip/travel-accessibility), [attractions guide](https://www.visitdubai.com/en/articles/accessible-attractions-in-dubai), [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Use venue-specific statements for individual facts; a source-read date is not a physical inspection date.

## Verification for this update

- 25 focused frontend tests passed: cloud-brief, trip-draft, planning-runs and planning-choice-cards.
- 5 offline backend tests passed: tests.test_accessibility_support. Covers legacy default, distinct-traveller JSON round-trip, essential subset, duplicate/out-of-party travellers, unknown support codes and extra diagnosis fields.
- The frontend test run emits existing module-type and rendered jsx-attribute warnings.
- No live provider requests, payments, assistance requests, migration, deployment or push were performed. Account database/API round-trip, full planner integration, browser accessibility and real supplier coverage were not tested by these checks.

Suggested commit message: fix: preserve traveller support in planning account sync
