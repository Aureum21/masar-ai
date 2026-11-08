# UAE attraction catalogue and dated event planning

The event agent was already part of final research. It previously shared one tool round across dining, attractions and live events. Structured-trip research now always performs an exact-date Ticketmaster query before the event agent researches dining/catalogue options. Queries cover each shortlisted emirate (all UAE when none can be identified). Provider events are retained through the extractor, streamed cards, planner context and saved research notes. The specialist can run up to four tool rounds. Suitable live events should be scheduled on their real event_date; no-results/unavailable responses are recorded honestly. A note highlights returned events not scheduled. No fictional event is substituted.

## Data and access

- `data/attractions.v1.json`: 58 editorial destinations: Dubai 10; Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah and Umm Al Quwain 8 each. Names, stable IDs, emirates, orientation pins, interests, source references and eligibility metadata. New places without a reviewed photograph use a visible neutral placeholder; existing photos are preserved.
- `attractions` PostgreSQL table stores ID/name/emirate/kind and editorial metadata. No trip/user/booking table is altered. API reads never seed or mutate the table.
- Authenticated GET `/api/v1/catalogue?region=ajman&q=museum&offset=0&limit=12` supports bounded pagination and escaped text search. POST `/resolve` restores up to 30 saved IDs. All regions, query sizes and limits are validated.
- The event agent and orchestrator can call the async `get_planning_catalogue` tool against this database. The planner also receives the compact versioned identity/challenge registry. Catalogue additions should be reviewed into that registry before enabling their challenges.
- Explore combines catalogue entries with existing picks, preserves photographs, collapses the legacy mosque alias, paginates 12 per page, and keeps all filtered destinations on the map. Picks remain shortlistable across pages and reloads. Live provider discovery remains separate.

## Challenges

Landmark capture remains exclusive to Burj Khalifa, Museum of the Future and Sheikh Zayed Grand Mosque. SOCO at City Centre Mirdif and Ground Control at Dubai Festival City Mall/Palm Jumeirah Mall are bowling candidates backed by venue references. Ground Control boxing is a conditional demo lead from an operator-feed mirror: the user must ask staff about the working scoring machine; it is never labelled a verified machine installation. Beaches support Sunset Seeker with a date/location-specific approximate solar window in Asia/Dubai. Access, weather, rules and the view still need checking; east-coast beaches do not imply an ocean-facing sunset. Pins are approximate orientation aids, not surveyed entrances.

The deterministic validator rejects mismatched challenges and morning sunset tasks. One explicit main quest per day takes priority over an incidental earlier landmark. Existing animations use separate heritage/boxing/bowling/sunset routes. All previews earn zero points. Mall/beach evidence uses the private single-photo + caption review flow; heritage retains three photos + quiz. No image, attendance, score, GPS or booking is automatically verified, and existing authorized review rules determine awards.

## Operation

Applied the additive `20261026_attractions` migration after checking the configured database was at its parent `20261023_runs`. The seed inserts missing reviewed destinations only; existing records are never overwritten or deleted. For another environment:

```powershell
.\.myenv\Scripts\python.exe -m alembic upgrade 20261026_attractions
.\.myenv\Scripts\python.exe -m tools.seed_attractions
```

Restart API and planning worker. Refresh Explore. New plans use the new research path; saved trips are preserved. Use future dates and try a mall/beach plus one or two nearby attractions. No live model run, provider booking or challenge approval was triggered during implementation.

## Editorial references

- https://www.visitdubai.com/en/places-to-visit
- https://visitabudhabi.ae/en/things-to-do-home
- https://www.visitsharjah.com/en/regions/sharjah-city/
- https://visit-ajman.ae/en/destinations
- https://visitrasalkhaimah.com/
- https://tourism.fujairah.ae/
- https://culturalmap.gov.ae/en/emirate/umm-al-quwain
- https://u.ae/en/about-the-uae/the-seven-emirates/Umm-Al-Quwain
- https://www.citycentremalls.com/en-ae/city-centre-mirdif/entertain/soco
- https://groundcontrolsocial.com/contact-us/
- https://www.localgymsandfitness.com/AE/Dubai/486593241202503/Ground-Control-GCC (secondary boxing lead only)
- https://gml.noaa.gov/grad/solcalc/calcdetails.html (approximate solar calculations; no weather/attendance proof)

## Verification completed
52 isolated/mocked backend tests and 25 frontend tests passed, including mall/beach activation, private single-photo submissions, no automatic XP, daily quest priority, API authentication, page boundaries, region filtering, exact dated-event searches and planner regressions. Focused ESLint and production build passed. In the running app, Explore displayed 73 combined picks and seven pages; Ajman filtering displayed eight destinations, and Ajman Corniche Beach opened its corresponding map popup. The configured event-provider key is present (value never displayed). API/model/provider end-to-end itinerary generation was not triggered. The reviewed catalogue schema and 58 records have been applied to the configured database.
