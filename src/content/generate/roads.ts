import type { Roads } from '../schemas';
import { streamFor } from './rng';
import { km, offset, type Settlement } from './settlements';

// D-102: generated roads. Each generated town gets a road to the nearest highway (or to its city when
// no highway is close), each village a road to its town, an owner's place far from any highway a road
// to the nearest one, and some towns a link to a neighbouring town. Roads wander a little.

const HIGHWAY_REACH_KM = 30;
const OWNER_HIGHWAY_KM = 1;
const LINK_KM = 30;

type P = { lat: number; lon: number };

/** A gently wandering line from a to b, [lon, lat], through two nudged points. */
function wander(a: P, b: P, seed: number, key: string): [number, number][] {
  const r = streamFor(seed, `road:${key}`);
  const d = km(a, b);
  const pts: P[] = [a];
  for (const f of [1 / 3, 2 / 3]) {
    const mid = { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f };
    const across = Math.atan2(b.lat - a.lat, (b.lon - a.lon) * Math.cos((a.lat * Math.PI) / 180)) + Math.PI / 2;
    pts.push(offset(mid, (r() - 0.5) * 0.2 * d, across));
  }
  pts.push(b);
  return pts.map((p) => [Math.round(p.lon * 1e5) / 1e5, Math.round(p.lat * 1e5) / 1e5]);
}

export function generateRoads(settlements: Settlement[], highways: Roads, seed: number): [number, number][][] {
  const byId = new Map(settlements.map((s) => [s.id, s]));
  // Highway nodes bucketed by 0.25° for the nearest-node search.
  const buckets = new Map<string, number[]>();
  const cell = (lat: number, lon: number) => `${Math.floor(lat / 0.25)},${Math.floor(lon / 0.25)}`;
  highways.nodes.forEach(([lat, lon], i) => {
    const c = cell(lat, lon);
    const list = buckets.get(c);
    if (list) list.push(i); else buckets.set(c, [i]);
  });
  const nearestHighway = (p: P): { at: P; d: number } | null => {
    let best: { at: P; d: number } | null = null;
    const [cr, cc] = cell(p.lat, p.lon).split(',').map(Number) as [number, number];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      for (const i of buckets.get(`${cr + dr},${cc + dc}`) ?? []) {
        const [lat, lon] = highways.nodes[i]!;
        const d = km(p, { lat, lon });
        if (!best || d < best.d) best = { at: { lat, lon }, d };
      }
    }
    return best;
  };

  const roads: [number, number][][] = [];
  for (const s of settlements) {
    if (s.owner) {
      const h = nearestHighway(s);
      if (h && h.d > OWNER_HIGHWAY_KM) roads.push(wander(s, h.at, seed, `${s.id}>highway`));
      continue;
    }
    const parent = byId.get(s.parent!)!;
    if (s.tier === 'village') {
      roads.push(wander(s, parent, seed, `${s.id}>parent`));
      continue;
    }
    const h = nearestHighway(s);
    roads.push(h && h.d <= HIGHWAY_REACH_KM ? wander(s, h.at, seed, `${s.id}>highway`) : wander(s, parent, seed, `${s.id}>parent`));
    // Some towns link to their nearest neighbouring town, so not every trip goes through a city.
    const r = streamFor(seed, `link:${s.id}`);
    if (r() < 0.5) {
      const other = settlements.filter((o) => o.tier === 'town' && o.id !== s.id && o.id !== s.parent)
        .map((o) => ({ o, d: km(s, o) })).sort((a, b) => a.d - b.d)[0];
      if (other && other.d <= LINK_KM) roads.push(wander(s, other.o, seed, `${s.id}>${other.o.id}`));
    }
  }
  return roads;
}
