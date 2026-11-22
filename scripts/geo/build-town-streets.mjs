// Regenerates the street plans drawn on the town maps (D-049). Run only when the source data changes.
//
//   1. Streets (OpenStreetMap, ODbL): POST scripts/geo/town-streets.overpassql to
//      https://overpass-api.de/api/interpreter and save the JSON response.
//   2. node scripts/geo/build-town-streets.mjs <osm-streets.json>
//
// Writes src/content/data/town-streets.json: { "<siteId>": [[[lon, lat], ...], ...] }, one list of lines per town.
// The boxes match town-streets.overpassql; Madurai keeps only main roads, since its map spans the airport.
import { readFileSync, writeFileSync } from 'node:fs';

const TOWNS = {
  'loc.srivilliputhur': { box: [9.495, 77.618, 9.528, 77.645], keep: /^(trunk|primary|secondary|tertiary|unclassified|residential)$/ },
  'loc.rajapalayam': { box: [9.424, 77.532, 9.462, 77.578], keep: /^(trunk|primary|secondary|tertiary|unclassified|residential)$/ },
  'loc.madurai': { box: [9.825, 78.08, 9.95, 78.165], keep: /^(trunk|primary|secondary|tertiary)$/ },
};
// Points closer than this are dropped, so the file stays small.
const MIN_VERTEX_GAP_KM = 0.03;

const [osmPath] = process.argv.slice(2);
if (!osmPath) {
  console.error('usage: node scripts/geo/build-town-streets.mjs <osm-streets.json>');
  process.exit(1);
}

const km = (a, b) => {
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r;
  const dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
const round = (n) => Math.round(n * 1e5) / 1e5;
const inBox = ([lon, lat], [s, w, n, e]) => lat >= s && lat <= n && lon >= w && lon <= e;

const osm = JSON.parse(readFileSync(osmPath, 'utf8'));
const out = Object.fromEntries(Object.keys(TOWNS).map((id) => [id, []]));

for (const e of osm.elements) {
  if (e.type !== 'way' || !e.geometry) continue;
  const line = e.geometry.map((g) => [round(g.lon), round(g.lat)]);
  for (const [id, town] of Object.entries(TOWNS)) {
    if (!town.keep.test(e.tags?.highway ?? '')) continue;
    // Clip to the box: keep runs of points inside it.
    let run = [];
    const flush = () => {
      if (run.length >= 2) {
        const thin = [run[0]];
        for (let i = 1; i < run.length - 1; i++) if (km(thin[thin.length - 1], run[i]) >= MIN_VERTEX_GAP_KM) thin.push(run[i]);
        thin.push(run[run.length - 1]);
        out[id].push(thin);
      }
      run = [];
    };
    for (const p of line) {
      if (inBox(p, town.box)) run.push(p);
      else flush();
    }
    flush();
  }
}

const file = 'src/content/data/town-streets.json';
writeFileSync(file, JSON.stringify(out));
console.log(`${file}: ${Object.entries(out).map(([id, lines]) => `${id} ${lines.length} lines`).join(', ')}`);
