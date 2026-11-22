import type { Content } from '../../../content/loader';
import { distanceToSegmentKm, samplePath, type LatLon } from '../travel/geo';

/** D-043: inside the band within radiusKm of the Trichy–Villupuram line (rounded ends). */
export function inRadiationZone(p: LatLon, content: Content): boolean {
  const { from, to, radiusKm } = content.scavenging.radiation;
  return distanceToSegmentKm(p, from, to) <= radiusKm;
}

/** Share of a path that lies in the zone, sampled every km. */
export function zoneShare(path: LatLon[], content: Content): number {
  const samples = samplePath(path, 1);
  if (!samples.length) return 0;
  return samples.filter((p) => inRadiationZone(p, content)).length / samples.length;
}
