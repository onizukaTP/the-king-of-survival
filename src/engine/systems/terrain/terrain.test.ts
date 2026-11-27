import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { terrainAt, terrainCellKey } from './terrain';

// Events have their own tests.
const loaded = loadContent();
const content = { ...loaded, events: { ...loaded.events, events: [] } };
const SANCTUARY = { lat: 9.56, lon: 77.58 }; // inside the wildlife sanctuary, off any road
// M11: land cover is generated; a dry square away from roads, found in the grid.
const PLAIN = (() => {
  const t = content.terrain;
  for (let i = 0; i < t.grid.length; i += 97) {
    if (t.grid[i] !== '.') continue;
    const p = { lat: t.bbox[0] + (Math.floor(i / t.cols) + 0.5) * t.cellDeg, lon: t.bbox[1] + ((i % t.cols) + 0.5) * t.cellDeg };
    if (p.lat > 9.2 && p.lat < 10.5 && p.lon > 77.6 && p.lon < 78.6 && terrainAt(p, content).id === 'dry') return p;
  }
  throw new Error('no dry land found');
})();

function standing(p: { lat: number; lon: number }, seed = 1): GameState {
  const s = createNewGame(content, seed);
  s.player.position = p;
  return s;
}
function ok(state: GameState, command: Command) {
  const r = applyCommand(state, command, content);
  if (!r.ok) throw new Error(`${command.type} failed: ${r.error.code}`);
  return r;
}

describe('actions by terrain (D-101)', () => {
  it('reads the ground: forest in the sanctuary, road along a highway, dry land in the generated grid', () => {
    expect(terrainAt(SANCTUARY, content).id).toBe('forest');
    expect(terrainAt(content.sites['loc.nh744']!, content).id).toBe('road');
    expect(terrainAt(PLAIN, content).id).toBe('dry');
    expect(terrainAt({ lat: 13.5, lon: 82 }, content).id).toBe('dry'); // out at sea
  });

  it('searches the ground with its own table, in 1 hour, and thins a ~1 km square', () => {
    const s = standing(SANCTUARY);
    let found = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const r = ok({ ...structuredClone(s), rngState: seed }, { type: 'scavenge.search', torch: false });
      expect(r.state.clockMinutes).toBe(s.clockMinutes + 60);
      const finds = (r.events[0] as Extract<GameEvent, { type: 'searched' }>).finds;
      const table = content.terrainLoot.byId.forest!.search.map((e) => e.itemId);
      for (const f of finds) expect(table).toContain(f.itemId);
      expect(r.state.sites[terrainCellKey(SANCTUARY, content)]).toMatchObject({ richness: 90 });
      found += finds.length;
    }
    expect(found).toBeGreaterThan(10);
  });

  it('hunts with the ground’s share of the Hunting chance: all of it in forest, a quarter on dry land', () => {
    const rate = (p: { lat: number; lon: number }) => {
      let hits = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const r = ok(standing(p, seed), { type: 'scavenge.hunt' });
        if ((r.events[0] as Extract<GameEvent, { type: 'hunted' }>).success) hits++;
      }
      return hits / 400;
    };
    expect(rate(SANCTUARY)).toBeCloseTo(0.4, 1);
    expect(rate(PLAIN)).toBeCloseTo(0.1, 1);
  });

  it('has no hunt on a road or in a village, and nothing to search on open water', () => {
    const road = standing(content.sites['loc.nh744']!);
    road.player.position = { lat: road.player.position.lat + 0.0005, lon: road.player.position.lon };
    if (terrainAt(road.player.position, content).id === 'road') {
      const r = applyCommand(road, { type: 'scavenge.hunt' }, content);
      expect(r.ok || r.error.code).toBe('cannot_hunt_here');
    }
    const r = applyCommand(standing(content.sites['loc.pilavakkal_dam']!), { type: 'scavenge.hunt' }, content);
    expect(r.ok || r.error.code).toBe('cannot_hunt_here');
  });
});
