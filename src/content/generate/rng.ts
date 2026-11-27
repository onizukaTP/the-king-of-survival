// The generated map's randomness (D-102, D-103). Every part of the world draws from its own stream, keyed
// by what it is ("towns:loc.madurai"), so the world is the same every time from the world seed, and a
// change in one place doesn't reshuffle the rest. Separate from the game's RNG in GameState.

/** FNV-1a: a stable 32-bit hash of a string. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type Rand = () => number;

/** A mulberry32 stream for one part of the world: numbers in [0, 1). */
export function streamFor(seed: number, key: string): Rand {
  let a = (seed ^ hashString(key)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from lo to hi, both included. */
export const between = (r: Rand, [lo, hi]: readonly [number, number]) => lo + Math.floor(r() * (hi - lo + 1));

export const pick = <T>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length)]!;

/** A key from a weight table, by weight. */
export function weighted(r: Rand, weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  let left = r() * entries.reduce((n, [, w]) => n + w, 0);
  for (const [k, w] of entries) if ((left -= w) < 0) return k;
  return entries[entries.length - 1]![0];
}

/** Smooth value noise in [0, 1) at (x, y), with features about `scale` units across (land cover). */
export function noise(seed: number, x: number, y: number, scale: number): number {
  const fx = x / scale, fy = y / scale;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const sx = fx - x0, sy = fy - y0;
  const corner = (i: number, j: number) => {
    let h = (seed ^ Math.imul(i, 374761393) ^ Math.imul(j, 668265263)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const ease = (t: number) => t * t * (3 - 2 * t);
  const u = ease(sx), v = ease(sy);
  const a = corner(x0, y0), b = corner(x0 + 1, y0), c = corner(x0, y0 + 1), d = corner(x0 + 1, y0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
