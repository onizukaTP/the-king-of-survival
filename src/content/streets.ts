import type { Roads, TownStreets } from './schemas';

// D-099: towns are on the world map, so trips inside a town follow its streets at road speed. The
// streets (drawn from OpenStreetMap for each town) join the road graph here, once, at load time.

// Street ends this close to another node are joined to it (a crossing or a road the street meets).
const JOIN_KM = 0.05;
const CELL_DEG = 0.001;

const R = 6371;
function km(a: [number, number], b: [number, number]): number {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function withStreets(roads: Roads, streets: TownStreets): Roads {
  const nodes: [number, number][] = roads.nodes.map((n) => [n[0], n[1]]);
  const edges: [number, number, number][] = roads.edges.map((e) => [e[0], e[1], e[2]]);
  const byKey = new Map<string, number>();
  const key = (p: [number, number]) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
  nodes.forEach((n, i) => byKey.set(key(n), i));
  const grid = new Map<string, number[]>();
  const cell = (p: [number, number], dy = 0, dx = 0) => `${Math.floor(p[0] / CELL_DEG) + dy},${Math.floor(p[1] / CELL_DEG) + dx}`;
  const index = (i: number) => {
    const c = cell(nodes[i]!);
    const list = grid.get(c);
    if (list) list.push(i); else grid.set(c, [i]);
  };
  nodes.forEach((_, i) => index(i));
  const nodeFor = (p: [number, number]) => {
    const k = key(p);
    let i = byKey.get(k);
    if (i === undefined) {
      i = nodes.length;
      nodes.push(p);
      byKey.set(k, i);
      index(i);
    }
    return i;
  };
  const roadCount = nodes.length;

  const ends: { node: number; line: Set<number> }[] = [];
  for (const lines of Object.values(streets)) {
    for (const line of lines) {
      const ids = line.map(([lon, lat]) => nodeFor([lat, lon]));
      for (let i = 1; i < ids.length; i++) {
        const a = ids[i - 1]!, b = ids[i]!;
        if (a !== b) edges.push([a, b, km(nodes[a]!, nodes[b]!)]);
      }
      const own = new Set(ids);
      ends.push({ node: ids[0]!, line: own }, { node: ids[ids.length - 1]!, line: own });
    }
  }

  // Join each street end to the nearest other node close by (another street or a road).
  for (const { node, line } of ends) {
    const p = nodes[node]!;
    let best = -1, bestKm = JOIN_KM;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const j of grid.get(cell(p, dy, dx)) ?? []) {
          if (line.has(j)) continue;
          const d = km(p, nodes[j]!);
          if (d < bestKm) { bestKm = d; best = j; }
        }
      }
    }
    if (best >= 0) edges.push([node, best, bestKm]);
  }

  // A street network still cut off from the roads gets one link from its node nearest a road.
  const parent = nodes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  for (const [a, b] of edges) parent[find(a)] = find(b);
  const roadRoots = new Set<number>();
  for (let i = 0; i < roadCount; i++) roadRoots.add(find(i));
  const cutOff = new Map<number, number[]>();
  for (let i = roadCount; i < nodes.length; i++) {
    const r = find(i);
    if (roadRoots.has(r)) continue;
    const list = cutOff.get(r);
    if (list) list.push(i); else cutOff.set(r, [i]);
  }
  // Searched outwards ring by ring on the grid, up to ~10 km, so a big map stays quick to load.
  const joined = (j: number) => roadRoots.has(find(j));
  for (const members of cutOff.values()) {
    let best: [number, number, number] | null = null;
    for (const i of members) {
      const p = nodes[i]!;
      const r0 = Math.floor(p[0] / CELL_DEG), c0 = Math.floor(p[1] / CELL_DEG);
      for (let ring = 0; ring <= 90 && !(best && best[2] < ring * CELL_DEG * 111); ring++) {
        for (let dy = -ring; dy <= ring; dy++) {
          for (let dx = -ring; dx <= ring; dx++) {
            if (Math.max(Math.abs(dy), Math.abs(dx)) !== ring) continue;
            for (const j of grid.get(`${r0 + dy},${c0 + dx}`) ?? []) {
              if (!joined(j)) continue;
              const d = km(p, nodes[j]!);
              if (!best || d < best[2]) best = [i, j, d];
            }
          }
        }
      }
      if (best && best[2] < JOIN_KM) break;
    }
    if (best) edges.push(best);
  }
  return { nodes, edges };
}
