import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { distanceKm, insideOutline, samplePath } from './geo';

const { outline } = loadContent();

describe('geo', () => {
  it('measures great-circle distance', () => {
    // One degree of latitude is ~111.2 km.
    expect(distanceKm({ lat: 9, lon: 77 }, { lat: 10, lon: 77 })).toBeCloseTo(111.2, 0);
    expect(distanceKm({ lat: 9.5, lon: 77.6 }, { lat: 9.5, lon: 77.6 })).toBe(0);
  });

  it('knows what is inside Tamil Nadu', () => {
    expect(insideOutline({ lat: 9.9261, lon: 78.1141 }, outline)).toBe(true); // Madurai
    expect(insideOutline({ lat: 13.0827, lon: 80.2707 }, outline)).toBe(true); // Chennai
    expect(insideOutline({ lat: 12.9716, lon: 77.5946 }, outline)).toBe(false); // Bengaluru
    expect(insideOutline({ lat: 9.0, lon: 80.0 }, outline)).toBe(false); // sea / Sri Lanka
  });

  it('samples a path at even spacing including both ends', () => {
    const a = { lat: 9, lon: 77 };
    const b = { lat: 9.05, lon: 77 }; // ~5.6 km
    const points = samplePath([a, b], 1);
    expect(points[0]).toEqual(a);
    expect(points.at(-1)).toEqual(b);
    expect(points).toHaveLength(7);
    for (let i = 1; i < points.length - 1; i++) expect(distanceKm(points[i - 1]!, points[i]!)).toBeCloseTo(1, 1);
  });
});
