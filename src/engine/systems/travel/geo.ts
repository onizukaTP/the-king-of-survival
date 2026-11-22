import type { Outline } from '../../../content/schemas';

export interface LatLon {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371;
const RAD = Math.PI / 180;

/** Great-circle distance (haversine). */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// shortcut: linear interpolation in lat/lon; fine at Tamil Nadu scale, upgrade to great-circle if routes get much longer.
export function lerp(a: LatLon, b: LatLon, t: number): LatLon {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
}

/** Points every `stepKm` along a path, including both ends. */
export function samplePath(path: LatLon[], stepKm: number): LatLon[] {
  const first = path[0];
  if (!first) return [];
  const out: LatLon[] = [first];
  let carried = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const d = distanceKm(a, b);
    let at = stepKm - carried;
    while (at < d) {
      out.push(lerp(a, b, at / d));
      at += stepKm;
    }
    carried = d - (at - stepKm);
  }
  out.push(path[path.length - 1]!);
  return out;
}

/** Ray casting over one ring of [lon, lat] points. */
export function insideRing(p: LatLon, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > p.lat !== yj > p.lat && p.lon < xi + ((p.lat - yi) * (xj - xi)) / (yj - yi)) inside = !inside;
  }
  return inside;
}

/** Ray casting over every ring, so holes work too. */
export function insideOutline(p: LatLon, outline: Outline): boolean {
  return outline.polygons.some((polygon) => polygon.reduce((inside, ring) => (insideRing(p, ring) ? !inside : inside), false));
}

// shortcut: flat (equirectangular) maths around p; accurate to well under 1% at these distances.
/** Shortest distance from p to the segment a–b, in km. */
export function distanceToSegmentKm(p: LatLon, a: LatLon, b: LatLon): number {
  const kx = 111.32 * Math.cos(p.lat * RAD);
  const ky = 110.57;
  const ax = (a.lon - p.lon) * kx, ay = (a.lat - p.lat) * ky;
  const bx = (b.lon - p.lon) * kx, by = (b.lat - p.lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Shortest distance from p to a line of [lon, lat] points, in km. */
export function distanceToLineKm(p: LatLon, line: [number, number][]): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1]!;
    const [bx, by] = line[i]!;
    best = Math.min(best, distanceToSegmentKm(p, { lat: ay, lon: ax }, { lat: by, lon: bx }));
  }
  return best;
}
