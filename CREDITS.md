# Credits

Data and asset sources. Add an entry for every third-party file before it lands.

| Asset / data | Source | Licence |
|---|---|---|
| `public/assets/placeholder.svg` | Made for this project | — |
| `src/content/data/roads.json`, `public/geo/rail.json`, site coordinates in `src/content/data/sites.json` | © OpenStreetMap contributors, via the Overpass API (query in `scripts/geo/roads.overpassql`), processed by `scripts/geo/build-geo.mjs` | ODbL 1.0. Attribution is shown on the map. |
| `src/content/data/water.json` (lakes, tanks, ponds, reservoirs, rivers, wells) | © OpenStreetMap contributors, via the Overpass API (query in `scripts/geo/water.overpassql`), processed by `scripts/geo/build-water.mjs` | ODbL 1.0. Attribution is shown on the map. |
| `src/content/data/town-streets.json`, and the positions of the buildings in `src/content/data/towns.json` that sit on mapped points of interest | © OpenStreetMap contributors, via the Overpass API (query in `scripts/geo/town-streets.overpassql`), processed by `scripts/geo/build-town-streets.mjs` | ODbL 1.0. Attribution is shown on the town map. |
| Radiation icon on the map | Drawn in code for this project (placeholder) | — |
| `src/content/data/tamil-nadu.json` | Natural Earth 1:10m admin-1 states/provinces | Public domain |
| Map rendering | MapLibre GL JS | BSD-3-Clause |
