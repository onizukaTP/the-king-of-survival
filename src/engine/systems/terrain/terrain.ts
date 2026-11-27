import type { Content } from '../../../content/loader';
import type { TerrainKind } from '../../../content/schemas';
import { distanceToSegmentKm, type LatLon } from '../travel/geo';

// D-101: whatever ground Prabu stands on decides what he can do. The land cover is a grid of ~500 m
// squares from OpenStreetMap (scripts/geo/build-terrain.mjs); roads, town streets and railways are
// found from their lines, since they are narrower than a square.

const LETTERS: Record<string, string> = { F: 'forest', S: 'scrub', A: 'farmland', V: 'village', '.': 'dry' };
const LINE_CELL_DEG = 0.01;

type LineIndex = Map<string, [LatLon, LatLon][]>;
const lineIndexes = new WeakMap<object, LineIndex>();

/** Road, street and railway segments bucketed by ~1 km square, built once per content. */
function lineIndex(content: Content): LineIndex {
  let index = lineIndexes.get(content.roads);
  if (!index) {
    index = new Map();
    const add = (a: LatLon, b: LatLon) => {
      const cells = new Set<string>();
      for (const p of [a, b, { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 }]) cells.add(`${Math.floor(p.lat / LINE_CELL_DEG)},${Math.floor(p.lon / LINE_CELL_DEG)}`);
      for (const c of cells) {
        const list = index!.get(c);
        if (list) list.push([a, b]); else index!.set(c, [[a, b]]);
      }
    };
    const { nodes, edges } = content.roads;
    for (const [i, j] of edges) add({ lat: nodes[i]![0], lon: nodes[i]![1] }, { lat: nodes[j]![0], lon: nodes[j]![1] });
    for (const line of content.terrain.rail) {
      for (let k = 1; k < line.length; k++) add({ lat: line[k - 1]![1], lon: line[k - 1]![0] }, { lat: line[k]![1], lon: line[k]![0] });
    }
    lineIndexes.set(content.roads, index);
  }
  return index;
}

function nearLine(p: LatLon, km: number, content: Content): boolean {
  const index = lineIndex(content);
  const r = Math.floor(p.lat / LINE_CELL_DEG), c = Math.floor(p.lon / LINE_CELL_DEG);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      for (const [a, b] of index.get(`${r + dr},${c + dc}`) ?? []) if (distanceToSegmentKm(p, a, b) <= km) return true;
    }
  }
  return false;
}

/** The kind of ground at p: road or railway nearby, else the land-cover square; dry outside the mapped area. */
export function terrainAt(p: LatLon, content: Content): TerrainKind {
  const t = content.terrain;
  const id = nearLine(p, content.terrainLoot.roadKm, content) ? 'road' : (() => {
    const [south, west, north, east] = t.bbox;
    if (p.lat < south || p.lat >= north || p.lon < west || p.lon >= east) return 'dry';
    const row = Math.floor((p.lat - south) / t.cellDeg), col = Math.floor((p.lon - west) / t.cellDeg);
    return LETTERS[t.grid[row * t.cols + col] ?? '.'] ?? 'dry';
  })();
  return content.terrainLoot.byId[id]!;
}

/** The stock key for the ground at p: one ~1 km square (D-101). */
export function terrainCellKey(p: LatLon, content: Content): string {
  const d = content.terrainLoot.stockCellDeg;
  return `cell.terrain.${Math.floor(p.lat / d)}.${Math.floor(p.lon / d)}`;
}
