# UAE country outline

`uae-boundary.json` contains the UAE feature (`ADM0_A3=ARE`) from Natural Earth's **1:10m Admin 0 Countries** GeoJSON, retrieved 27 October 2026. It replaces the former 1:50m geometry, whose coastline was too generalized for the Explore map. All 798 coordinates, islands, interior rings and disconnected polygons are retained without simplification or hand-drawn adjustments. Properties are reduced and a bounding box added.

- Dataset: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
- Source: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/
- License: public domain — https://www.naturalearthdata.com/about/terms-of-use/
- Source download SHA256: `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`

This remains a cartographic country outline, rather than survey or street-level coastline data; highly zoomed basemap tiles can show newer reclamation or different generalization. It is bundled locally, requires no API request at runtime, and its attribution is shown on the map. A thin gold edge and restrained halo keep small islands and the Oman enclave boundaries legible. Leaflet simplification is disabled for the outline so zoomed views retain the source geometry. The overlay never captures pointer events.
