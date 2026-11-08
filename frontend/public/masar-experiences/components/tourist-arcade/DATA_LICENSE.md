# Al Fahidi map data and references

Map data © OpenStreetMap contributors, available under the Open Database
License (ODbL) 1.0: https://www.openstreetmap.org/copyright
Full license: https://opendatacommons.org/licenses/odbl/1-0/

The raw extract is retained in `tools/map/al-fahidi-osm.json`. The derived game
database is `assets/al-fahidi.json`, distributed here in editable JSON under
ODbL 1.0. The generated preview SVG uses the same attributed data. This license
applies to map data, not to the independently authored game source code.

Extracted on 2026-10-21 from the public Overpass API, bounding box:
south 25.2626, west 55.2978, north 25.2657, east 55.3015.
Buildings and footways are projected to local coordinates and simplified;
footprints are slightly inset to keep narrow passages playable. Only the
largest connected walking network is used. Game checkpoint names and obstacles
are fictional additions. The teal creek accent is illustrative, not a surveyed
shoreline. No live map requests, geolocation or routing services are used.

Tourism context and next-stop reference:

- Visit Dubai, Al Fahidi Historical Neighbourhood:
  https://www.visitdubai.com/en/places-to-visit/dubai-old-town/al-fahidi-historical-neighbourhood
- UAE National Cultural Map, Al Fahidi:
  https://culturalmap.gov.ae/en/facilities/al-fahidi-historical-neighbourhood
- Visit Dubai, Al Seef:
  https://www.visitdubai.com/en/explore-dubai/dubai-neighbourhoods/al-seef

Architecture in the diorama is a procedural interpretation, not a reconstruction
of individual buildings' facades. No operating-hour, admission-price or venue
availability claims are made by the game.
