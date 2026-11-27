// Builds the land-cover grid for actions by terrain (D-101). Run only when the source data changes.
//
//   1. Land cover (OpenStreetMap, ODbL): POST scripts/geo/terrain.overpassql to an Overpass API
//      server (https://overpass-api.de/api/interpreter) and save the JSON response.
//   2. node scripts/geo/build-terrain.mjs <osm-terrain.json>
//
// Writes src/content/data/terrain.json: a grid of ~500 m squares over the area the game's roads and
// water cover, one letter per square, rows from south to north:
//   V village (residential land, or within reach of a village or hamlet point)
//   A farmland and orchards (farmland, orchard, plantation, meadow, farmyard)
//   S scrub and grassland (scrub, grassland, heath, grass)
//   F forest and woods (forest, wood, and the wildlife sanctuaries' protected land)
//   . dry, open land: nothing mapped (the owner's rule, D-101)
// plus the railway lines (from public/geo/rail.json), since railway land counts as road terrain.
import { readFileSync, writeFileSync } from 'node:fs';

const [osmPath] = process.argv.slice(2);
if (!osmPath) {
  console.error('usage: node scripts/geo/build-terrain.mjs <osm-terrain.json>');
  process.exit(1);
}

// Same box as the road and water queries.
const BBOX = { south: 9.35, west: 77.40, north: 10.0, east: 78.2 };
const CELL_DEG = 0.0045;
const VILLAGE_KM = 0.4;
const HAMLET_KM = 0.25;

const kindOf = (t) => {
  if (t.landuse === 'residential') return 'V';
  if (['farmland', 'orchard', 'plantation', 'meadow', 'farmyard'].includes(t.landuse)) return 'A';
  if (['scrub', 'grassland', 'heath'].includes(t.natural) || t.landuse === 'grass') return 'S';
  if (t.landuse === 'forest' || t.natural === 'wood') return 'F';
  if (t.boundary === 'protected_area' || t.leisure === 'nature_reserve') return 'P';
  return null;
};
// Where kinds overlap, the more specific one wins; protected land counts as forest last.
const PRIORITY = ['V', 'A', 'S', 'F', 'P'];

const same = (a, b) => a[0] === b[0] && a[1] === b[1];
function joinRings(segments) {
  const rings = [];
  const left = segments.map((s) => [...s]);
  while (left.length) {
    let ring = left.shift();
    let grew = true;
    while (!same(ring[0], ring[ring.length - 1]) && grew) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        const s = left[i];
        const end = ring[ring.length - 1];
        if (same(s[0], end)) ring = ring.concat(s.slice(1));
        else if (same(s[s.length - 1], end)) ring = ring.concat([...s].reverse().slice(1));
        else continue;
        left.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (ring.length >= 4 && same(ring[0], ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}

const osm = JSON.parse(readFileSync(osmPath, 'utf8'));
const shapes = []; // { kind, ring: [lon, lat][], box }
const points = []; // { lat, lon, km }
for (const e of osm.elements) {
  const t = e.tags ?? {};
  if (e.type === 'node' && (t.place === 'village' || t.place === 'hamlet')) {
    points.push({ lat: e.lat, lon: e.lon, km: t.place === 'village' ? VILLAGE_KM : HAMLET_KM });
    continue;
  }
  const kind = kindOf(t);
  if (!kind) continue;
  let rings = [];
  if (e.type === 'way' && e.geometry) {
    const ring = e.geometry.map((g) => [g.lon, g.lat]);
    if (ring.length >= 4 && same(ring[0], ring[ring.length - 1])) rings = [ring];
  } else if (e.type === 'relation' && e.members) {
    rings = joinRings(e.members.filter((m) => m.type === 'way' && m.role !== 'inner' && m.geometry).map((m) => m.geometry.map((g) => [g.lon, g.lat])));
  }
  for (const ring of rings) {
    const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
    shapes.push({ kind, ring, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
  }
}

function inside(x, y, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const km = (lat1, lon1, lat2, lon2) => {
  const r = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const rows = Math.ceil((BBOX.north - BBOX.south) / CELL_DEG);
const cols = Math.ceil((BBOX.east - BBOX.west) / CELL_DEG);
let grid = '';
const counts = {};
for (let r = 0; r < rows; r++) {
  const lat = BBOX.south + (r + 0.5) * CELL_DEG;
  for (let c = 0; c < cols; c++) {
    const lon = BBOX.west + (c + 0.5) * CELL_DEG;
    let best = null;
    if (points.some((p) => Math.abs(p.lat - lat) < 0.01 && Math.abs(p.lon - lon) < 0.01 && km(p.lat, p.lon, lat, lon) <= p.km)) best = 'V';
    for (const s of shapes) {
      if (best && PRIORITY.indexOf(s.kind) >= PRIORITY.indexOf(best)) continue;
      const [x0, y0, x1, y1] = s.box;
      if (lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
      if (inside(lon, lat, s.ring)) best = s.kind;
    }
    const letter = best === 'P' ? 'F' : best ?? '.';
    grid += letter;
    counts[letter] = (counts[letter] ?? 0) + 1;
  }
}

const rail = JSON.parse(readFileSync('public/geo/rail.json', 'utf8')).geometry.coordinates;
const out = { bbox: [BBOX.south, BBOX.west, BBOX.north, BBOX.east], cellDeg: CELL_DEG, rows, cols, grid, rail };
writeFileSync('src/content/data/terrain.json', JSON.stringify(out));
const total = rows * cols;
console.log(`${rows} × ${cols} squares:`, Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, `${n} (${Math.round((n / total) * 100)}%)`])));
