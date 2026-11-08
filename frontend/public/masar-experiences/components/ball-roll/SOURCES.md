# Golden Roll: map and educational content

## Map

© OpenStreetMap contributors — Open Database License (ODbL 1.0).
https://www.openstreetmap.org/copyright

Local data: `assets/al-fahidi.json`, copied from the project's existing Al Fahidi
extract, dated 2026-10-21. Original raw extract: `tools/map/al-fahidi-osm.json`.
Conversion/simplification: `tools/build_arcade_map.py`. The source field remains
in the JSON. This game's data copy keeps the source geometry and attribution;
rendered architecture and decorative elements are procedural interpretations.
The view labels the OSM source visibly and links the copyright page.

## Quiz facts

Checked 2026-10-22. Questions and explanations are original paraphrases. Sources
are bundled with every question and linked after the player answers. No source
fetch is needed during play. Review facts periodically before production use.

- UAE National Cultural Map, Al Fahidi Historical Neighbourhood:
  https://culturalmap.gov.ae/en/facilities/al-fahidi-historical-neighbourhood
  Barajeel; the mid-19th-century-to-1970s period; alleys, pathways and squares.
- Visit Dubai, Al Fahidi Historical Neighbourhood:
  https://www.visitdubai.com/places-to-visit/al-fahidi-historical-neighbourhood
  Traditional gypsum/wood/stone materials; heritage identity; Dubai Creek; Dubai.
- Dubai Culture on Google Arts & Culture, Al Fahidi Historical Neighborhood:
  https://artsandculture.google.com/story/zAWRZ_j5CQugJw
  Wind towers and adaptation to the hot climate / cooling by airflow.
- Visit Dubai, Discover Dubai's Old Town:
  https://www.visitdubai.com/en/articles/discover-dubais-old-town
  The Coffee Museum and coffee history in the district.

All plaster textures, geometry, signs and cover illustration are generated in
project code. No external photographs, remote fonts or model downloads are used.
Three.js is MIT-licensed; preserve `vendor/LICENSE.three.txt` when integrating.
