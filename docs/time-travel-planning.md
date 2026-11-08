# Time Travel visits in new plans

Every newly generated itinerary must contain a Time Travel heritage visit. This
is independent of the optional challenges switch and grants no Passport rewards.
Existing saved itineraries are not rewritten.

`domain/time_travel_planning.py` maps all eleven archive IDs to canonical planning
destinations. The planner receives one server-randomized recommendation per run.
It first reuses a shortlisted supported site; otherwise it draws from sites near
the shortlisted destinations. With no known route, all eligible sites enter the
draw. The planning run UUID seeds the draw so retries keep the same choice and
new runs can choose differently. Consecutive plans may draw the same site.

Known essential accessibility conflicts are excluded. Unknown accessibility
still needs venue confirmation. Required selections, schedules, rest needs,
flight/hotel choices and travel gaps retain their existing validation. The AI
must schedule the chosen visit within the itinerary; the server does not append
an unscheduled activity. A missing chosen visit returns a repairable validation
error before any trip database write. Rest and transport activities do not count.
The chosen activity stores its canonical archive mapping in `time_travel`, and
`planning_review.time_travel_visits` records the scheduled heritage identities.

The catalogue adds Sharjah Fort (Al Hisn), Al Jahili Fort and Bait Al Naboodah.
The planning identity `al-fahidi` covers the historic area around the fort;
instructions require confirmation of museum admission, rather than promising
interior access. All new pins are approximate orientation locations, not verified
entrance or accessibility routes. Venue references:

- https://www.sharjahmuseums.ae/en-US/Visit
- https://sharjahmuseums.ae/en-us/museums/bait-al-naboodah
- https://visitabudhabi.ae/en/things-to-do/culture/heritage/al-jahili-fort

## Deployment

Rebuild/redeploy the backend using `deploy/UPDATE_BACKEND.md`. After the database
is migrated, seed the three new catalogue entries using the same one-off job:

```bash
masar_job python -m tools.seed_attractions
```

The seed inserts missing destinations and preserves existing rows. No new schema
migration or environment variable is required for this change. Restart the API
and planning worker to load the new planning rule. Refresh Explore to load the
new destinations once its catalogue cache expires.

## Offline checks

```powershell
.\.myenv\Scripts\python.exe -m unittest tests.test_time_travel_planning tests.test_itinerary_validation tests.test_attraction_catalogue.CatalogueContracts tests.test_accessibility_planning tests.test_accessibility_catalogue
```

These checks use fixtures and mocks; they do not generate live AI itineraries or
write production data.
