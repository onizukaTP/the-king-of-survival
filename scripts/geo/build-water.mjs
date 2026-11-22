// Regenerates the water the game knows about (D-044). Run only when the source data changes.
//
//   1. Water (OpenStreetMap, ODbL): POST scripts/geo/water.overpassql to
//      https://overpass-api.de/api/interpreter and save the JSON response.
//   2. node scripts/geo/build-water.mjs <osm-water.json>
//
// Writes src/content/data/water.json:
//   areas:  lakes, tanks, ponds, reservoirs, canals and river polygons; `river: true` only for flowing rivers.
//   rivers: flowing river centre lines. Seasonal ("intermittent") rivers are left out: not flowing.
// Coordinates are [lon, lat].
import { readFileSync, writeFileSync } from 'node:fs';

const [osmPath] = process.argv.slice(2);
if (!osmPath) {
  console.error('usage: node scripts/geo/build-water.mjs <osm-water.json>');
  process.exit(1);
}

// Points closer than this are dropped; tanks keep their shape, the file stays small.
const MIN_VERTEX_GAP_KM = 0.05;
const SKIP_WATER = new Set(['pool', 'wastewater']);

const km = (a, b) => {
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r;
  const dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
const round = (n) => Math.round(n * 1e5) / 1e5;
const pts = (geometry) => geometry.map((g) => [round(g.lon), round(g.lat)]);

function thin(line, closed) {
  const out = [line[0]];
  for (let i = 1; i < line.length - 1; i++) if (km(out[out.length - 1], line[i]) >= MIN_VERTEX_GAP_KM) out.push(line[i]);
  out.push(line[line.length - 1]);
  if (closed && out.length < 4) return line.length >= 4 ? [line[0], line[Math.floor(line.length / 3)], line[Math.floor((2 * line.length) / 3)], line[0]] : null;
  return out.length >= 2 ? out : null;
}

const same = (a, b) => a[0] === b[0] && a[1] === b[1];

/** Joins a multipolygon's outer member ways end to end into closed rings. */
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
    if (same(ring[0], ring[ring.length - 1]) && ring.length >= 4) rings.push(ring);
  }
  return rings;
}

const osm = JSON.parse(readFileSync(osmPath, 'utf8'));
const areas = [];
const rivers = [];
let skipped = 0;

for (const e of osm.elements) {
  const t = e.tags ?? {};
  const seasonal = t.intermittent === 'yes' || t.seasonal === 'yes';
  if (t.waterway === 'river') {
    if (seasonal || !e.geometry) { skipped++; continue; }
    const line = thin(pts(e.geometry), false);
    if (line) rivers.push(line);
    continue;
  }
  if (SKIP_WATER.has(t.water)) { skipped++; continue; }
  const river = t.water === 'river' && !seasonal;
  let rings = [];
  if (e.type === 'way' && e.geometry && same(pts(e.geometry)[0], pts(e.geometry).at(-1))) rings = [pts(e.geometry)];
  if (e.type === 'relation') rings = joinRings((e.members ?? []).filter((m) => m.role === 'outer' && m.geometry).map((m) => pts(m.geometry)));
  if (!rings.length) { skipped++; continue; }
  for (const ring of rings) {
    const thinned = thin(ring, true);
    if (thinned) areas.push({ river, ring: thinned });
  }
}

const out = 'src/content/data/water.json';
writeFileSync(out, JSON.stringify({ areas, rivers }));
console.log(`${out}: ${areas.length} areas (${areas.filter((a) => a.river).length} river), ${rivers.length} river lines, ${skipped} skipped`);
