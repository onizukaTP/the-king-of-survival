import { describe, expect, it } from 'vitest';
import { nextRandom } from './rng';

describe('nextRandom', () => {
  it('replays the same sequence from the same seed', () => {
    const run = (seed: number) => {
      const out: number[] = [];
      let s = seed;
      for (let i = 0; i < 5; i++) {
        const [v, next] = nextRandom(s);
        out.push(v);
        s = next;
      }
      return out;
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
  });

  it('returns values in [0, 1) and a uint32 state', () => {
    let s = 0xffffffff;
    for (let i = 0; i < 1000; i++) {
      const [v, next] = nextRandom(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(next).toBe(next >>> 0);
      s = next;
    }
  });
});
