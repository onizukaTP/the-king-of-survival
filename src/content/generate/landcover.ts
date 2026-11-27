import type { Outline, Terrain } from '../schemas';
import { noise } from './rng';
import type { Settlement } from './settlements';

// M11, D-103: generated land cover for the whole state, a letter per ~500 m square (F forest, S scrub,
// A farmland, V village, . dry), aiming at about 15% forest, 40% farmland, 25% scrub, 15% dry and 5%
// village. Forest follows the real protected forests; farmland gathers round settlements and rivers;
// the dry south-east stays drier. Shapes are painted row by row, so the whole state takes a moment.

type Ring = [number, number][];

// D-103: the approved mix of the land (village comes from the settlements' footprints).
const MIX = { forest: 0.15, farmland: 0.4, dry: 0.15 };

/** The x (lon) crossings of a horizontal line with a set of rings, sorted: inside is between pairs. */
function crossings(rings: Ring[], lat: number): number[] {
  const xs: number[] = [];
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
      if ((yi > lat) !== (yj > lat)) xs.push(xi + ((lat - yi) * (xj - xi)) / (yj - yi));
    }
  }
  return xs.sort((a, b) => a - b);
}

export function generateLandCover(
  outline: Outline,
  forests: Ring[],
  rivers: [number, number][][],
  settlements: Settlement[],
  cellDeg: number,
  seed: number,
): Terrain {
  const all = outline.polygons.flat();
  const lons = all.flat().map((p) => p[0]), lats = all.flat().map((p) => p[1]);
  const south = Math.floor(Math.min(...lats) * 100) / 100, north = Math.ceil(Math.max(...lats) * 100) / 100;
  const west = Math.floor(Math.min(...lons) * 100) / 100, east = Math.ceil(Math.max(...lons) * 100) / 100;
  const rows = Math.ceil((north - south) / cellDeg), cols = Math.ceil((east - west) / cellDeg);
  const n = rows * cols;
  const land = new Uint8Array(n), forest = new Uint8Array(n), near = new Float32Array(n), village = new Uint8Array(n);

  const fill = (rings: Ring[], out: Uint8Array) => {
    for (let r = 0; r < rows; r++) {
      const xs = crossings(rings, south + (r + 0.5) * cellDeg);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil((xs[k]! - west) / cellDeg - 0.5)), c1 = Math.min(cols - 1, Math.floor((xs[k + 1]! - west) / cellDeg - 0.5));
        for (let c = c0; c <= c1; c++) out[r * cols + c] = 1;
      }
    }
  };
  fill(all, land);
  fill(forests, forest);

  // Closeness to people and water (1 at the centre, fading to 0 at the radius): farmland grows there.
  const stamp = (lat: number, lon: number, km: number, weight: number, also?: Uint8Array, alsoKm = 0) => {
    const rad = km / 111.32, cosLat = Math.cos((lat * Math.PI) / 180);
    const r0 = Math.floor((lat - rad - south) / cellDeg), r1 = Math.ceil((lat + rad - south) / cellDeg);
    const c0 = Math.floor((lon - rad / cosLat - west) / cellDeg), c1 = Math.ceil((lon + rad / cosLat - west) / cellDeg);
    for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) {
        const dy = (south + (r + 0.5) * cellDeg - lat) * 111.32, dx = (west + (c + 0.5) * cellDeg - lon) * 111.32 * cosLat;
        const d = Math.hypot(dx, dy);
        const i = r * cols + c;
        if (d < km) near[i] = Math.max(near[i]!, weight * (1 - d / km));
        if (also && d < alsoKm) also[i] = 1;
      }
    }
  };
  // Built-up land around each settlement: about 5% of the state together (D-103).
  const footprint = { city: 5, town: 2.6, village: 1.2 };
  for (const s of settlements) stamp(s.lat, s.lon, s.tier === 'city' ? 9 : s.tier === 'town' ? 7 : 5, 1, village, footprint[s.tier]);
  for (const line of rivers) for (let k = 0; k < line.length; k += 2) stamp(line[k]![1], line[k]![0], 4, 0.8);

  // Each land square gets a score per kind; the best-scoring squares take each kind until its share of
  // the land is reached, so the mix comes out as approved whatever the noise does.
  const kind = new Uint8Array(n); // 0 sea, 1 dry, 2 scrub, 3 farmland, 4 forest, 5 village
  const free: number[] = [];
  let landCount = 0;
  for (let i = 0; i < n; i++) {
    if (!land[i]) continue;
    landCount++;
    if (village[i]) kind[i] = 5;
    else if (forest[i]) kind[i] = 4;
    else free.push(i);
  }
  const score = (i: number, which: 'forest' | 'farm' | 'dry') => {
    const r = Math.floor(i / cols), c = i % cols;
    const lat = south + (r + 0.5) * cellDeg, lon = west + (c + 0.5) * cellDeg;
    // The dry south-east (Ramanathapuram, Thoothukudi, Virudhunagar's plains) leans dry.
    const dryBelt = lat < 10 && lon > 77.8 ? 0.35 : 0;
    if (which === 'forest') return noise(seed + 1, lon, lat, 0.3) - near[i]! * 0.6 - dryBelt;
    if (which === 'farm') return near[i]! * 0.8 + noise(seed + 2, lon, lat, 0.12) * 0.5 - dryBelt * 0.5;
    return (1 - near[i]!) * 0.4 + noise(seed + 3, lon, lat, 0.2) * 0.4 + dryBelt;
  };
  // The cut-off score for a share comes from a fixed sample of the free squares (sorting all ~350,000
  // would be slow); the shares land within a fraction of a percent.
  const sample = free.filter((_, k) => k % 17 === 0);
  const take = (share: number, which: 'forest' | 'farm' | 'dry', k: number) => {
    const already = k === 4 ? kind.reduce((a, b) => a + (b === 4 ? 1 : 0), 0) : 0;
    const left = sample.filter((i) => kind[i] === 0);
    const freeLeft = free.reduce((a, i) => a + (kind[i] === 0 ? 1 : 0), 0);
    const want = Math.max(0, landCount * share - already);
    if (!left.length || !freeLeft) return;
    const scores = Float32Array.from(left, (i) => score(i, which)).sort();
    const cut = scores[Math.max(0, Math.min(scores.length - 1, Math.round(scores.length * (1 - want / freeLeft))))]!;
    for (const i of free) if (kind[i] === 0 && score(i, which) >= cut) kind[i] = k;
  };
  take(MIX.forest, 'forest', 4);
  take(MIX.farmland, 'farm', 3);
  take(MIX.dry, 'dry', 1);
  for (const i of free) if (kind[i] === 0) kind[i] = 2;
  const LETTER = ['.', '.', 'S', 'A', 'F', 'V'];
  let grid = '';
  for (let i = 0; i < n; i++) grid += LETTER[kind[i]!];
  return { bbox: [south, west, north, east], cellDeg, rows, cols, grid, rail: [] };
}

