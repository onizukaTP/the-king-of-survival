import type { Content } from '../../../content/loader';
import type { Roads, WorldConfig } from '../../../content/schemas';
import { distanceKm, lerp, type LatLon } from './geo';

export interface Leg {
  minutes: number;
  km: number;
  path: LatLon[];
}

export interface RoutePlan {
  legs: Leg[];
  minutes: number;
  roadKm: number;
  crossKm: number;
}

type Mode = 'road' | 'cross';
interface Step {
  from: LatLon;
  to: LatLon;
  km: number;
  mode: Mode;
}

// How many nearby road nodes to try when stepping on or off the road network.
const ROAD_ACCESS_CANDIDATES = 8;

type Adjacency = Array<Array<[node: number, km: number]>>;
const adjacencyCache = new WeakMap<Roads, Adjacency>();

function adjacency(roads: Roads): Adjacency {
  let adj = adjacencyCache.get(roads);
  if (!adj) {
    adj = roads.nodes.map(() => []);
    for (const [a, b, km] of roads.edges) {
      adj[a]!.push([b, km]);
      adj[b]!.push([a, km]);
    }
    adjacencyCache.set(roads, adj);
  }
  return adj;
}

const nodeAt = (roads: Roads, i: number): LatLon => {
  const [lat, lon] = roads.nodes[i]!;
  return { lat, lon };
};

function nearestNodes(roads: Roads, p: LatLon, k: number): number[] {
  return roads.nodes
    .map((_, i) => [i, distanceKm(p, nodeAt(roads, i))] as const)
    .sort((x, y) => x[1] - y[1] || x[0] - y[0])
    .slice(0, k)
    .map(([i]) => i);
}

/** Minimal binary min-heap of [cost, node]. */
class Heap {
  private items: Array<[number, number]> = [];
  get size() {
    return this.items.length;
  }
  push(item: [number, number]) {
    const a = this.items;
    a.push(item);
    for (let i = a.length - 1; i > 0; ) {
      const parent = (i - 1) >> 1;
      if (a[parent]![0] <= a[i]![0]) break;
      [a[parent], a[i]] = [a[i]!, a[parent]!];
      i = parent;
    }
  }
  pop(): [number, number] {
    const a = this.items;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l]![0] < a[m]![0]) m = l;
        if (r < a.length && a[r]![0] < a[m]![0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top;
  }
}

/** Fastest mix of cross-country and road (D-009): Dijkstra over the road graph plus virtual start and end nodes. */
function fastestSteps(from: LatLon, to: LatLon, roads: Roads, world: WorldConfig): Step[] {
  const adj = adjacency(roads);
  const n = roads.nodes.length;
  const START = n;
  const END = n + 1;
  const crossMin = (km: number) => (km / world.crossCountrySpeedKmh) * 60;
  const roadMin = (km: number) => (km / world.roadSpeedKmh) * 60;

  const cost = new Float64Array(n + 2).fill(Infinity);
  const prev = new Int32Array(n + 2).fill(-1);
  const prevKm = new Float64Array(n + 2);
  const exits = new Map(nearestNodes(roads, to, ROAD_ACCESS_CANDIDATES).map((i) => [i, distanceKm(nodeAt(roads, i), to)]));

  const heap = new Heap();
  const relax = (node: number, via: number, km: number, c: number) => {
    if (c < cost[node]!) {
      cost[node] = c;
      prev[node] = via;
      prevKm[node] = km;
      heap.push([c, node]);
    }
  };
  cost[START] = 0;
  const direct = distanceKm(from, to);
  relax(END, START, direct, crossMin(direct));
  for (const i of nearestNodes(roads, from, ROAD_ACCESS_CANDIDATES)) {
    const km = distanceKm(from, nodeAt(roads, i));
    relax(i, START, km, crossMin(km));
  }

  while (heap.size) {
    const [c, u] = heap.pop();
    if (c > cost[u]!) continue;
    if (u === END) break;
    for (const [v, km] of adj[u] ?? []) relax(v, u, km, c + roadMin(km));
    const exitKm = exits.get(u);
    if (exitKm !== undefined) relax(END, u, exitKm, c + crossMin(exitKm));
  }

  const chain: number[] = [];
  for (let u = END; u !== -1; u = prev[u]!) chain.unshift(u);
  const pos = (i: number) => (i === START ? from : i === END ? to : nodeAt(roads, i));
  const steps: Step[] = [];
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1]!;
    const b = chain[i]!;
    steps.push({ from: pos(a), to: pos(b), km: prevKm[b]!, mode: a === START || b === END ? 'cross' : 'road' });
  }
  return steps;
}

/** Cuts the route into legs of at most `legMaxMinutes` (D-010). Leg minutes are whole and sum to the rounded total. */
function splitIntoLegs(steps: Step[], world: WorldConfig): Leg[] {
  const speed = (m: Mode) => (m === 'road' ? world.roadSpeedKmh : world.crossCountrySpeedKmh);
  const legs: Leg[] = [];
  let path: LatLon[] = [steps[0]!.from];
  let km = 0;
  let legMinutes = 0;
  let elapsed = 0;
  let elapsedAtLegStart = 0;
  const closeLeg = () => {
    legs.push({ minutes: Math.round(elapsed) - Math.round(elapsedAtLegStart), km, path });
    elapsedAtLegStart = elapsed;
    path = [path[path.length - 1]!];
    km = 0;
    legMinutes = 0;
  };

  for (const step of steps) {
    let start = step.from;
    let stepKm = step.km;
    let stepMinutes = (step.km / speed(step.mode)) * 60;
    while (legMinutes + stepMinutes > world.legMaxMinutes + 1e-9) {
      const take = world.legMaxMinutes - legMinutes;
      const frac = take / stepMinutes;
      const cut = lerp(start, step.to, frac);
      path.push(cut);
      km += stepKm * frac;
      elapsed += take;
      closeLeg();
      start = cut;
      stepKm *= 1 - frac;
      stepMinutes -= take;
    }
    path.push(step.to);
    km += stepKm;
    legMinutes += stepMinutes;
    elapsed += stepMinutes;
  }
  if (legMinutes > 0) closeLeg();

  // A sub-minute tail would be a leg that takes no time; fold it into the one before.
  const last = legs[legs.length - 1];
  const before = legs[legs.length - 2];
  if (last && before && last.minutes === 0) {
    before.path.push(...last.path.slice(1));
    before.km += last.km;
    legs.pop();
  }
  return legs;
}

export function planRoute(from: LatLon, to: LatLon, content: Pick<Content, 'roads' | 'world'>): RoutePlan {
  // Copy just the coordinates: callers may pass richer objects (a site), and the path ends up in saved state.
  const steps = fastestSteps({ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon }, content.roads, content.world);
  const legs = splitIntoLegs(steps, content.world);
  const sum = (mode: Mode) => steps.filter((s) => s.mode === mode).reduce((t, s) => t + s.km, 0);
  return { legs, minutes: legs.reduce((t, l) => t + l.minutes, 0), roadKm: sum('road'), crossKm: sum('cross') };
}
