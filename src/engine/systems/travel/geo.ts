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

/** Ray casting over every ring, so holes work too. */
export function insideOutline(p: LatLon, outline: Outline): boolean {
  return outline.polygons.some((polygon) => {
    let inside = false;
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!;
        const [xj, yj] = ring[j]!;
        if (yi > p.lat !== yj > p.lat && p.lon < xi + ((p.lat - yi) * (xj - xi)) / (yj - yi)) inside = !inside;
      }
    }
    return inside;
  });
}
