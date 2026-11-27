# Credits

Data and asset sources. Add an entry for every third-party file before it lands.

| Asset / data | Source | Licence |
|---|---|---|
| `public/assets/placeholder.svg` | Made for this project | — |
| `public/assets/figure-person.svg`, `figure-beast.svg` (combat placeholders) | Made for this project | — |
| `public/assets/intro-eclipse.svg` (intro placeholder) | Made for this project | — |
| `src/content/data/roads.json`, `public/geo/rail.json`, site coordinates in `src/content/data/sites.json` | © OpenStreetMap contributors, via the Overpass API (query in `scripts/geo/roads.overpassql`), processed by `scripts/geo/build-geo.mjs` | ODbL 1.0. Attribution is shown on the map. |
| `src/content/data/water.json` (lakes, tanks, ponds, reservoirs, rivers, wells) | © OpenStreetMap contributors, via the Overpass API (query in `scripts/geo/water.overpassql`), processed by `scripts/geo/build-water.mjs` | ODbL 1.0. Attribution is shown on the map. |
| `src/content/data/roads.json` (national highways and motorways, M11) | © OpenStreetMap contributors, via the Overpass API (query in `scripts/geo/highways.overpassql`), processed by `scripts/geo/build-highways.mjs` | ODbL 1.0. Attribution is shown on the map. |
| `src/content/data/backbone.json` (positions of the owner's places) | © OpenStreetMap contributors, via the Overpass API (query in `scripts/geo/places.overpassql`), processed by `scripts/geo/build-backbone.mjs` | ODbL 1.0. Attribution is shown on the map. |
| `src/content/data/water.json` statewide rivers and reservoirs, `src/content/data/forests.json` (protected forests) | © OpenStreetMap contributors, via the Overpass API (queries in `scripts/geo/rivers.overpassql`, `reservoirs.overpassql`, `forests.overpassql`), processed by `scripts/geo/build-statewater.mjs` | ODbL 1.0. Attribution is shown on the map. |
| `src/content/data/rail.json` (railway lines for land cover), the landmark positions in `src/content/data/landmarks.json` | © OpenStreetMap contributors, via the Overpass API (queries in `scripts/geo/terrain.overpassql` and `scripts/geo/town-streets.overpassql`) | ODbL 1.0. Attribution is shown on the map. |
| Radiation icon on the map | Drawn in code for this project (placeholder) | — |
| `src/content/data/tamil-nadu.json` | Natural Earth 1:10m admin-1 states/provinces | Public domain |
| Map rendering | MapLibre GL JS | BSD-3-Clause |
