import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, maxHealth, type GameState } from '../../core/state';
import { addItems } from '../inventory/inventory';
import { passTime } from '../survival/survival';
import { inRadiationZone } from '../survival/radiation';
import { groundHere, waterAt } from './scavenging';

const content = loadContent();
// Tests count from the run's start time (D-075), not a fixed hour.
const START = content.newGame.startClockMinutes;
const site = (id: string) => ({ lat: content.sites[id]!.lat, lon: content.sites[id]!.lon });

function at(id: string | { lat: number; lon: number }, seed = 1, change: (s: GameState) => void = () => {}) {
  const state = createNewGame(content, seed);
  state.player.position = typeof id === 'string' ? site(id) : id;
  change(state);
  return state;
}

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code}`);
  return result;
}

const err = (state: GameState, command: Command) => {
  const r = applyCommand(state, command, content);
  return r.ok ? 'ok' : r.error.code;
};

describe('search (P-013)', () => {
  it('takes an hour, finds things from the site table, and leaves them on the ground here', () => {
    let found = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = at('loc.srivilliputhur_station', seed);
      const r = ok(s, { type: 'scavenge.search', torch: false });
      expect(r.state.clockMinutes).toBe(s.clockMinutes + 60);
      const searched = r.events[0] as Extract<GameEvent, { type: 'searched' }>;
      const tableItems = content.loot['loc.srivilliputhur_station']!.search.map((e) => e.itemId);
      for (const f of searched.finds) expect(tableItems).toContain(f.itemId);
      expect(groundHere(r.state)).toHaveLength(searched.finds.length);
      expect(r.state.inventory).toEqual(s.inventory);
      found += searched.finds.length;
    }
    expect(found).toBeGreaterThan(20);
  });

  it('is reproducible from the same save', () => {
    const s = at('loc.srivilliputhur_station', 7);
    expect(ok(s, { type: 'scavenge.search', torch: false }).state).toEqual(ok(s, { type: 'scavenge.search', torch: false }).state);
  });

  it('depletes 10 points a search down to 10%, and refreshes 7 days after the first search', () => {
    let s = at('loc.nh744');
    for (let i = 0; i < 12; i++) s = ok(s, { type: 'scavenge.search', torch: false }).state;
    expect(s.sites['loc.nh744']).toMatchObject({ richness: 10 });
    const refreshAt = s.sites['loc.nh744']!.refreshAt!;
    expect(refreshAt).toBe(START + 7 * 1440);
    // Keep him alive through the wait.
    s.clockMinutes = refreshAt;
    s = ok(s, { type: 'scavenge.search', torch: false }).state;
    expect(s.sites['loc.nh744']).toEqual({ richness: 90, refreshAt: refreshAt + 7 * 1440 });
  });

  it('with the torch: 45 minutes and 5% battery (D-037)', () => {
    const s = at('loc.srivilliputhur_station');
    const r = ok(s, { type: 'scavenge.search', torch: true });
    expect(r.state.clockMinutes).toBe(s.clockMinutes + 45);
    expect(r.state.inventory.stacks.find((st) => st.itemId === 'item.torch')!.charge).toBe(45);
    const flat = at('loc.srivilliputhur_station', 1, (g) => (g.inventory.stacks.find((st) => st.itemId === 'item.torch')!.charge = 4));
    expect(err(flat, { type: 'scavenge.search', torch: true })).toBe('no_torch_charge');
  });

  it('refuses at home, on open ground and while travelling', () => {
    expect(err(at('loc.home'), { type: 'scavenge.search', torch: false })).toBe('nothing_to_search');
    // A town's finds are in its buildings (P-014): nothing to search at its point on the world map.
    expect(err(at('loc.madurai'), { type: 'scavenge.search', torch: false })).toBe('nothing_to_search');
    expect(err(at({ lat: 9.6, lon: 77.7 }), { type: 'scavenge.search', torch: false })).toBe('not_at_site');
    const moving = ok(at('loc.home'), { type: 'travel.start', target: { siteId: 'loc.nh744' } }).state;
    expect(err(moving, { type: 'scavenge.search', torch: false })).toBe('travel_in_progress');
  });
});

describe('hunt (D-046)', () => {
  it('takes an hour in the forest and rolls meat and hide independently', () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const r = ok(at('loc.sanctuary_forest', seed), { type: 'scavenge.hunt' });
      expect(r.state.clockMinutes).toBe(START + 60);
      for (const f of (r.events[0] as Extract<GameEvent, { type: 'hunted' }>).finds) kinds.add(f.itemId);
    }
    expect([...kinds].sort()).toEqual(['item.animal_hide', 'item.raw_meat']);
    expect(err(at('loc.srivilliputhur'), { type: 'scavenge.hunt' })).toBe('cannot_hunt_here');
  });
});

describe('ground: take or leave, 96 hours (D-045)', () => {
  it('takes chosen finds into the pack and leaves the rest', () => {
    const s = at('loc.home', 1, (g) => {
      addItems(g, 'item.bamboo', 1, content);
      addItems(g, 'item.cloth', 2, content);
    });
    const dropped = ok(ok(s, { type: 'item.drop', index: 2, count: 1 }).state, { type: 'item.drop', index: 2, count: 2 }).state;
    expect(dropped.ground).toHaveLength(2);
    const took = ok(dropped, { type: 'ground.take', indexes: [0] }).state;
    expect(took.inventory.stacks.map((st) => st.itemId)).toContain('item.bamboo');
    expect(took.ground.map((p) => p.itemId)).toEqual(['item.cloth']);
  });

  it('keeps piles for 96 hours, then they are gone', () => {
    const calm = { ...content, survival: { ...content.survival, drainPerHour: { food: 0, water: 0, rest: 0 } } };
    const s = at('loc.home', 1, (g) => addItems(g, 'item.bamboo', 1, content));
    const dropped = ok(s, { type: 'item.drop', index: 2, count: 1 }).state;
    passTime(dropped, 96 * 60 - 1, 'work', calm, []);
    expect(dropped.ground).toHaveLength(1);
    passTime(dropped, 1, 'work', calm, []);
    expect(dropped.ground).toHaveLength(0);
  });

  it('only takes what is here, and refuses past 50 kg as a whole', () => {
    const s = at('loc.home', 1, (g) => addItems(g, 'item.firewood', 2, content));
    const dropped = ok(s, { type: 'item.drop', index: 2, count: 2 }).state;
    const away = structuredClone(dropped);
    away.player.position = site('loc.srivilliputhur');
    expect(err(away, { type: 'ground.take', indexes: [0] })).toBe('bad_item');
    const loaded = structuredClone(dropped);
    addItems(loaded, 'item.firewood', 24, content);
    expect(err(loaded, { type: 'ground.take', indexes: [0] })).toBe('too_heavy');
    expect(err(dropped, { type: 'ground.take', indexes: [] })).toBe('bad_item');
  });
});

describe('water (D-044)', () => {
  it('finds still water at the dam, nothing at home, and a flowing river somewhere in the data', () => {
    expect(waterAt(site('loc.pilavakkal_dam'), content)).toBe('still');
    expect(waterAt(site('loc.home'), content)).toBeNull();
    const [x, y] = content.water.rivers[0]![0]!;
    expect(waterAt({ lat: y, lon: x }, content)).toBe('river');
    // D-050: a mapped well is clean.
    const [wx, wy] = content.water.wells[0]!;
    expect(waterAt({ lat: wy, lon: wx }, content)).toBe('well');
  });

  it('fills every empty bottle: unsafe at still water, clean at a river, 5 minutes each', () => {
    const add = (g: GameState) => addItems(g, 'item.empty_bottle', 3, content);
    const still = ok(at('loc.pilavakkal_dam', 1, add), { type: 'water.fill' });
    expect(still.state.inventory.stacks.find((st) => st.itemId === 'item.unsafe_water')!.count).toBe(3);
    expect(still.state.clockMinutes).toBe(START + 15);
    const [x, y] = content.water.rivers[0]![0]!;
    const river = ok(at({ lat: y, lon: x }, 1, add), { type: 'water.fill' });
    expect(river.state.inventory.stacks.find((st) => st.itemId === 'item.clean_water')!.count).toBe(3);
    expect(err(at('loc.pilavakkal_dam'), { type: 'water.fill' })).toBe('no_empty_bottles');
    expect(err(at('loc.home', 1, add), { type: 'water.fill' })).toBe('no_water');
  });

  it('drinks to 100: safe at a river, a 1-in-5 illness chance at still water', () => {
    let ill = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const r = ok(at('loc.pilavakkal_dam', seed, (g) => (g.survival.water = 30)), { type: 'water.drink' });
      expect(r.state.survival.water).toBe(100);
      if (r.state.survival.illUntil !== null) ill++;
    }
    expect(ill).toBeGreaterThan(20);
    expect(ill).toBeLessThan(60);
    const [x, y] = content.water.rivers[0]![0]!;
    for (let seed = 1; seed <= 50; seed++) {
      expect(ok(at({ lat: y, lon: x }, seed), { type: 'water.drink' }).state.survival.illUntil).toBeNull();
    }
  });
});

describe('radiation zone (D-043)', () => {
  const trichy = { lat: 10.7905, lon: 78.7047 };
  const midway = { lat: 11.3653, lon: 79.0954 };

  it('covers 30 km around the Trichy–Villupuram line, not Madurai or home', () => {
    expect(inRadiationZone(trichy, content)).toBe(true);
    expect(inRadiationZone(midway, content)).toBe(true);
    expect(inRadiationZone({ lat: midway.lat, lon: midway.lon + 0.25 }, content)).toBe(true);
    expect(inRadiationZone({ lat: trichy.lat - 0.35, lon: trichy.lon }, content)).toBe(false);
    expect(inRadiationZone(site('loc.madurai'), content)).toBe(false);
    expect(inRadiationZone(site('loc.home'), content)).toBe(false);
  });

  it('rolls once per full hour inside: about 1 in 4 hours adds 5 radiation, lowering maximum Health', () => {
    const s = at(midway);
    const calm = { ...content, survival: { ...content.survival, drainPerHour: { food: 0, water: 0, rest: 0 } } };
    const events: GameEvent[] = [];
    passTime(s, 200 * 60, 'work', calm, events);
    const hits = events.filter((e) => e.type === 'irradiated').length;
    expect(hits).toBeGreaterThan(30);
    expect(hits).toBeLessThan(70);
    expect(s.survival.radiation).toBe(Math.min(100, hits * 5));
    expect(s.survival.health).toBeLessThanOrEqual(maxHealth(s.survival, content));
  });

  it('carries part-hours over, and sleeping cannot heal past the maximum', () => {
    const s = at(midway, 1, (g) => Object.assign(g.survival, { radiation: 30, health: 60 }));
    passTime(s, 30, 'work', content, []);
    expect(s.survival.zoneMinutes).toBe(30);
    const home = at('loc.home', 1, (g) => Object.assign(g.survival, { radiation: 30, health: 65 }));
    passTime(home, 8 * 60, 'sleep', content, []);
    expect(home.survival.health).toBe(70);
  });

  it('kills him when radiation reaches 100', () => {
    // Try seeds until the next roll is a hit; the rest of the test is then deterministic.
    for (let seed = 1; seed < 100; seed++) {
      const t = at(midway, seed, (g) => Object.assign(g.survival, { radiation: 95, health: 5, zoneMinutes: 59 }));
      const events: GameEvent[] = [];
      passTime(t, 1, 'work', content, events);
      if (!t.dead) continue;
      expect(events).toContainEqual({ type: 'died', cause: 'radiation' });
      return;
    }
    throw new Error('no seed produced a hit');
  });
});
