// Spreads the water and forests across the whole state for the generated map (M11, D-102). Run only when
// the source data changes, after build-water.mjs (which gives the prototype area's detailed water).
//
//   1. POST rivers.overpassql, reservoirs.overpassql and forests.overpassql to an Overpass API server
//      and save each JSON response.
//   2. node scripts/geo/build-statewater.mjs <area-water.json> <osm-rivers.json> <osm-reservoirs.json> <osm-forests.json>
//      where <area-water.json> is a copy of build-water.mjs's output (don't pass water.json itself twice).
//
// Writes src/content/data/water.json: the area's water as it was, plus every named flowing river and
// every reservoir of some size elsewhere in the state; and src/content/data/forests.json: the protected
// forests (national parks, sanctuaries, reserve forests), which the land cover turns into forest.
import { readFileSync, writeFileSync } from 'node:fs';

const [areaPath, riversPath, reservoirsPath, forestsPath] = process.argv.slice(2);
if (!forestsPath) {
  console.error('usage: node scripts/geo/build-statewater.mjs <area-water.json> <osm-rivers.json> <osm-reservoirs.json> <osm-forests.json>');
  process.exit(1);
}

const RIVER_GAP_KM = 0.3; // a river's points this far apart; the walk range to water is far larger
const RESERVOIR_GAP_KM = 0.1;
const MIN_RESERVOIR_KM = 0.25; // smaller tanks are left to the generator's own
const FOREST_GAP_KM = 0.4; // the land cover's squares are ~500 m
// IUCN classes 1–4 and reserve forests are forest; eco-sensitive zones and the rest are not.
const FOREST_CLASSES = new Set(['1', '1a', '1b', '2', '3', '4']);

const km = (a, b) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b[1] - a[1]) * r) / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(((b[0] - a[0]) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
const round = (n) => Math.round(n * 1e5) / 1e5;
const pts = (geometry) => geometry.map((g) => [round(g.lon), round(g.lat)]);
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

function thin(line, gap, closed) {
  const out = [line[0]];
  for (let i = 1; i < line.length - 1; i++) if (km(out[out.length - 1], line[i]) >= gap) out.push(line[i]);
  out.push(line[line.length - 1]);
  if (closed && out.length < 4) return null;
  return out.length >= 2 ? out : null;
}

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

const area = read(areaPath);
// The prototype area keeps its detailed water; statewide data fills in only outside it.
const all = [...area.areas.flatMap((a) => a.ring), ...area.rivers.flat(), ...area.wells];
const box = [Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[0])), Math.max(...all.map((p) => p[1]))];
const inBox = (p) => p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3];

const rivers = [...area.rivers];
let seasonal = 0;
for (const e of read(riversPath).elements) {
  const t = e.tags ?? {};
  if (t.intermittent === 'yes' || t.seasonal === 'yes') { seasonal++; continue; } // not flowing (D-044)
  if (!e.geometry) continue;
  const line = pts(e.geometry);
  if (line.every(inBox)) continue;
  const thinned = thin(line, RIVER_GAP_KM, false);
  if (thinned) rivers.push(thinned);
}

const areas = [...area.areas];
let small = 0;
for (const e of read(reservoirsPath).elements) {
  if (!e.geometry) continue;
  const ring = pts(e.geometry);
  if (!same(ring[0], ring[ring.length - 1]) || ring.some(inBox)) continue;
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  if (km([Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]) < MIN_RESERVOIR_KM) { small++; continue; }
  const thinned = thin(ring, RESERVOIR_GAP_KM, true);
  if (thinned) areas.push({ river: false, ring: thinned });
}

const forests = [];
for (const e of read(forestsPath).elements) {
  const t = e.tags ?? {};
  if (!FOREST_CLASSES.has(t.protect_class ?? '') && t.protection_title !== 'Reserve Forest') continue;
  for (const ring of joinRings((e.members ?? []).filter((m) => m.role === 'outer' && m.geometry).map((m) => pts(m.geometry)))) {
    const thinned = thin(ring, FOREST_GAP_KM, true);
    if (thinned) forests.push(thinned);
  }
}

writeFileSync('src/content/data/water.json', JSON.stringify({ areas, rivers, wells: area.wells }));
writeFileSync('src/content/data/forests.json', JSON.stringify({ rings: forests }));
console.log(`water.json: ${areas.length} areas (${area.areas.length} from the area), ${rivers.length} river lines (${seasonal} seasonal left out), ${area.wells.length} wells; ${small} small reservoirs left out`);
console.log(`forests.json: ${forests.length} rings`);
