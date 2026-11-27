// Builds the real highway network of the generated map's backbone (D-102, D-107): motorways and national
// highways (trunk) across Tamil Nadu and Puducherry; state roads are left to the generator. Run only when
// the source data changes.
//
//   1. POST scripts/geo/highways.overpassql to an Overpass API server and save the JSON response.
//   2. node scripts/geo/build-highways.mjs <osm-highways.json>
//
// Writes src/content/data/roads.json: the graph, nodes [lat, lon], edges [a, b, km]. Generated roads and
// town streets join it when the game loads (src/content/generate).
import { readFileSync, writeFileSync } from 'node:fs';

const [osmPath] = process.argv.slice(2);
if (!osmPath) {
  console.error('usage: node scripts/geo/build-highways.mjs <osm-highways.json>');
  process.exit(1);
}

// Points closer than this along a road are dropped; junctions and road ends always stay.
const MIN_VERTEX_GAP_KM = 2;

const km = (a, b) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
const round = (n) => Math.round(n * 1e5) / 1e5;
const key = (p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;

const ways = JSON.parse(readFileSync(osmPath, 'utf8')).elements.filter((e) => e.type === 'way' && e.geometry?.length >= 2 && /^(motorway|trunk)$/.test(e.tags?.highway ?? ''));
const lines = ways.map((w) => w.geometry.map((g) => [g.lat, g.lon]));

// A point used by more than one road, or a road's end, is a junction and is always kept.
const uses = new Map();
for (const line of lines) line.forEach((p, i) => uses.set(key(p), (uses.get(key(p)) ?? 0) + (i === 0 || i === line.length - 1 ? 2 : 1)));

const index = new Map();
const nodes = [];
const edges = new Map();
const nodeFor = (p) => {
  const k = key(p);
  if (!index.has(k)) { index.set(k, nodes.length); nodes.push([round(p[0]), round(p[1])]); }
  return index.get(k);
};
for (const line of lines) {
  let last = line[0], length = 0;
  for (let i = 1; i < line.length; i++) {
    length += km(line[i - 1], line[i]);
    const end = i === line.length - 1;
    if (end || (uses.get(key(line[i])) ?? 0) > 1 || length >= MIN_VERTEX_GAP_KM) {
      const a = nodeFor(last), b = nodeFor(line[i]);
      if (a !== b) edges.set(a < b ? `${a},${b}` : `${b},${a}`, [a, b, Math.round(length * 1000) / 1000]);
      last = line[i];
      length = 0;
    }
  }
}
// OpenStreetMap splits roads into many short pieces: a point joining exactly two pieces is merged away
// while the joined piece stays under the gap, so only real junctions and the shape remain.
const adj = nodes.map(() => new Map());
for (const [a, b, d] of edges.values()) { adj[a].set(b, d); adj[b].set(a, d); }
for (let v = 0; v < nodes.length; v++) {
  if (adj[v].size !== 2) continue;
  const [[a, da], [b, db]] = [...adj[v]];
  if (a === b || da + db >= MIN_VERTEX_GAP_KM || adj[a].has(b)) continue;
  adj[a].delete(v); adj[b].delete(v); adj[v].clear();
  adj[a].set(b, da + db); adj[b].set(a, da + db);
}
const keep = nodes.map((_, i) => adj[i].size > 0);
const renum = []; const outNodes = [];
nodes.forEach((n, i) => { if (keep[i]) { renum[i] = outNodes.length; outNodes.push(n); } });
const outEdges = [];
adj.forEach((m, a) => m.forEach((d, b) => { if (a < b) outEdges.push([renum[a], renum[b], Math.round(d * 1000) / 1000]); }));
writeFileSync('src/content/data/roads.json', JSON.stringify({ nodes: outNodes, edges: outEdges }));
console.log(`${ways.length} roads → ${outNodes.length} nodes, ${outEdges.length} edges`);
