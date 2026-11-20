// Regenerates the map data the game ships with. Run only when the source data changes.
//
//   1. Roads and rail (OpenStreetMap, ODbL): POST scripts/geo/roads.overpassql to
//      https://overpass-api.de/api/interpreter and save the JSON response.
//   2. State outline (Natural Earth, public domain):
//      https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
//
//   node scripts/geo/build-geo.mjs <osm-roads.json> <ne_10m_admin_1_states_provinces.geojson>
//
// Writes src/content/data/roads.json, src/content/data/tamil-nadu.json and public/geo/rail.json.
import { readFileSync, writeFileSync } from 'node:fs';

const [osmPath, nePath] = process.argv.slice(2);
if (!osmPath || !nePath) {
  console.error('usage: node scripts/geo/build-geo.mjs <osm-roads.json> <ne-admin1.geojson>');
  process.exit(1);
}

const ROAD_TYPES = /^(motorway|trunk|primary|secondary|tertiary)(_link)?$/;
// Vertices closer than this along a way are dropped; keeps the shape, shrinks the file several times over.
const MIN_VERTEX_GAP_KM = 0.3;

const km = (a, b) => {
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

const osm = JSON.parse(readFileSync(osmPath, 'utf8'));
const coords = new Map(osm.elements.filter((e) => e.type === 'node').map((e) => [e.id, [e.lat, e.lon]]));
const ways = osm.elements.filter((e) => e.type === 'way');
const roadWays = ways.filter((w) => ROAD_TYPES.test(w.tags?.highway ?? ''));
const railWays = ways.filter((w) => w.tags?.railway === 'rail');

// --- Road graph: junctions and way ends are always kept, so the network stays connected.
const uses = new Map();
for (const w of roadWays) for (const id of w.nodes) uses.set(id, (uses.get(id) ?? 0) + 1);

const index = new Map();
const nodes = [];
const edges = new Map();
const nodeIndex = (id) => {
  if (!index.has(id)) {
    const [lat, lon] = coords.get(id);
    index.set(id, nodes.length);
    nodes.push([round(lat, 5), round(lon, 5)]);
  }
  return index.get(id);
};

for (const w of roadWays) {
  const ids = w.nodes.filter((id) => coords.has(id));
  if (ids.length < 2) continue;
  let last = ids[0];
  let length = 0;
  for (let i = 1; i < ids.length; i++) {
    length += km(coords.get(ids[i - 1]), coords.get(ids[i]));
    const keep = i === ids.length - 1 || uses.get(ids[i]) > 1 || km(coords.get(last), coords.get(ids[i])) >= MIN_VERTEX_GAP_KM;
    if (!keep) continue;
    const a = nodeIndex(last);
    const b = nodeIndex(ids[i]);
    if (a !== b) edges.set(a < b ? `${a}-${b}` : `${b}-${a}`, [Math.min(a, b), Math.max(a, b), round(length, 3)]);
    last = ids[i];
    length = 0;
  }
}

writeFileSync('src/content/data/roads.json', JSON.stringify({ nodes, edges: [...edges.values()] }));
console.log(`roads: ${nodes.length} nodes, ${edges.size} edges`);

// --- Rail: display only.
const rail = railWays.map((w) => {
  const line = [];
  for (const id of w.nodes) {
    const p = coords.get(id);
    if (!p) continue;
    if (!line.length || km([line.at(-1)[1], line.at(-1)[0]], p) >= MIN_VERTEX_GAP_KM) line.push([round(p[1], 5), round(p[0], 5)]);
  }
  return line;
}).filter((l) => l.length > 1);
writeFileSync('public/geo/rail.json', JSON.stringify({ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: rail } }));
console.log(`rail: ${rail.length} lines`);

// --- Tamil Nadu outline as [lon, lat] MultiPolygon.
const ne = JSON.parse(readFileSync(nePath, 'utf8'));
const tn = ne.features.find((f) => f.properties.iso_3166_2 === 'IN-TN');
if (!tn) throw new Error('Tamil Nadu (IN-TN) not found in Natural Earth file');
const polys = tn.geometry.type === 'MultiPolygon' ? tn.geometry.coordinates : [tn.geometry.coordinates];
const tnOut = polys.map((poly) => poly.map((ring) => ring.map(([lon, lat]) => [round(lon, 4), round(lat, 4)])));
writeFileSync('src/content/data/tamil-nadu.json', JSON.stringify({ polygons: tnOut }));
console.log(`tamil nadu: ${tnOut.length} polygons`);
