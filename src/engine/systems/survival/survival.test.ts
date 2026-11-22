import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { addItems } from '../inventory/inventory';
import { passTime, type Activity } from './survival';

const content = loadContent();

function fresh(change: (s: GameState) => void = () => {}) {
  const state = createNewGame(content, 1);
  change(state);
  return state;
}

function pass(state: GameState, minutes: number, activity: Activity, c = content) {
  const events: GameEvent[] = [];
  passTime(state, minutes, activity, c, events);
  return events;
}

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code}`);
  return result;
}

describe('survival drain (D-023, D-035)', () => {
  it('drains Food 1.5/h, Water 3/h and Rest 5/h while awake', () => {
    const s = fresh();
    pass(s, 600, 'work');
    expect(s.survival.food).toBeCloseTo(85);
    expect(s.survival.water).toBeCloseTo(70);
    expect(s.survival.rest).toBeCloseTo(50);
    expect(s.survival.health).toBe(100);
    expect(s.clockMinutes).toBe(360 + 600);
  });

  it('doubles Food and Water drain once Rest is at 0', () => {
    const s = fresh((g) => (g.survival.rest = 0));
    pass(s, 60, 'work');
    expect(s.survival.food).toBeCloseTo(97);
    expect(s.survival.water).toBeCloseTo(94);
  });

  it('charges the overload cost while travelling only (D-036)', () => {
    const heavy = fresh();
    // 0.65 kg starting kit + 18 × 2 kg firewood = 36.65 kg → ×1.466.
    ok(heavy, { type: 'item.unequip' });
    if (!addItems(heavy, 'item.firewood', 18, content).ok) throw new Error('add failed');
    const working = structuredClone(heavy);
    pass(heavy, 60, 'travel');
    pass(working, 60, 'work');
    expect(heavy.survival.water).toBeCloseTo(100 - 3 * (1 + (36.65 - 25) / 25));
    expect(working.survival.water).toBeCloseTo(97);
  });

  it('takes 5 Health an hour for each empty meter, then kills him', () => {
    const one = fresh((g) => (g.survival.food = 0));
    pass(one, 60, 'work');
    expect(one.survival.health).toBeCloseTo(95);

    const both = fresh((g) => Object.assign(g.survival, { food: 0, water: 0, health: 10 }));
    const events = pass(both, 600, 'work');
    expect(both.dead).toBe(true);
    expect(both.clockMinutes).toBe(360 + 60);
    expect(events).toContainEqual({ type: 'died', cause: 'hunger_and_thirst' });
    expect(applyCommand(both, { type: 'rest', minutes: 60 }, content)).toMatchObject({ ok: false, error: { code: 'dead' } });
  });

  it('reports a meter crossing the warning level and emptying', () => {
    const s = fresh((g) => Object.assign(g.survival, { water: 26, rest: 1 }));
    const events = pass(s, 60, 'work');
    expect(events).toContainEqual({ type: 'meter_low', meter: 'water', empty: false });
    expect(events).toContainEqual({ type: 'meter_low', meter: 'rest', empty: true });
  });

  it('runs the stomach illness for 24 h with Water draining twice as fast, then recovers (D-027)', () => {
    const s = fresh((g) => (g.survival.illUntil = 360 + 120));
    pass(s, 60, 'work');
    expect(s.survival.water).toBeCloseTo(94);
    const events = pass(s, 60, 'work');
    expect(s.survival.illUntil).toBeNull();
    expect(events).toContainEqual({ type: 'recovered' });
  });

  it('spoils food when its time is up, mercifully (D-028)', () => {
    // No drain, so three days pass without him dying of thirst.
    const calm = { ...content, survival: { ...content.survival, drainPerHour: { food: 0, water: 0, rest: 0 } } };
    const s = fresh();
    addItems(s, 'item.raw_meat', 2, content);
    addItems(s, 'item.tinned_food', 1, content);
    expect(pass(s, 3 * 1440 - 1, 'work', calm).some((e) => e.type === 'item_spoiled')).toBe(false);
    expect(pass(s, 1, 'work', calm)).toContainEqual({ type: 'item_spoiled', itemId: 'item.raw_meat', count: 2 });
    expect(s.inventory.stacks.map((st) => st.itemId)).toContain('item.tinned_food');
  });
});

describe('rest command', () => {
  it('restores Rest 12.5/h and heals 2/h when fed (D-035)', () => {
    const s = fresh((g) => Object.assign(g.survival, { rest: 50, health: 80 }));
    const result = ok(s, { type: 'rest', minutes: 'until_rested' });
    expect(result.events[0]).toEqual({ type: 'rested', minutes: 240 });
    expect(result.state.survival.rest).toBeCloseTo(100);
    expect(result.state.survival.health).toBeCloseTo(88);
  });

  it('does not heal while injured or hungry (D-039)', () => {
    const injured = ok(fresh((g) => Object.assign(g.survival, { health: 80, injured: true })), { type: 'rest', minutes: 240 });
    expect(injured.state.survival.health).toBe(80);
    const hungry = ok(fresh((g) => Object.assign(g.survival, { health: 80, food: 20 })), { type: 'rest', minutes: 240 });
    expect(hungry.state.survival.health).toBe(80);
  });

  it.each([
    ['while travelling', (g: GameState) => (g.travel = { destination: g.player.position, siteId: null, legs: [{ minutes: 1, km: 0, path: [g.player.position, g.player.position] }], nextLeg: 0 }), 60, 'travel_in_progress'],
    ['for zero minutes', () => {}, 0, 'bad_duration'],
    ['for more than a day', () => {}, 1441, 'bad_duration'],
    ['until rested when already rested', () => {}, 'until_rested', 'already_rested'],
  ] as const)('rejects resting %s', (_, change, minutes, code) => {
    expect(applyCommand(fresh(change), { type: 'rest', minutes }, content)).toMatchObject({ ok: false, error: { code } });
  });
});

describe('travel with survival', () => {
  it('uses legs of at most 30 minutes (D-035)', () => {
    expect(content.world.legMaxMinutes).toBe(30);
  });

  it('stops the trip by itself at the end of a leg when a meter falls to the warning level', () => {
    let state = ok(fresh((g) => (g.survival.rest = 26)), { type: 'travel.start', target: { siteId: 'loc.nh744' } }).state;
    const result = ok(state, { type: 'travel.advance' });
    state = result.state;
    expect(result.events).toContainEqual({ type: 'meter_low', meter: 'rest', empty: false });
    expect(result.events.at(-1)).toEqual({ type: 'travel_stopped', reason: 'meter' });
    expect(state.travel).toBeNull();
  });

  it('ends the trip if Prabu dies on the road', () => {
    const start = fresh((g) => Object.assign(g.survival, { food: 0, water: 0, health: 1 }));
    const result = ok(ok(start, { type: 'travel.start', target: { siteId: 'loc.nh744' } }).state, { type: 'travel.advance' });
    expect(result.state.dead).toBe(true);
    expect(result.state.travel).toBeNull();
    expect(result.events).toContainEqual({ type: 'died', cause: 'hunger_and_thirst' });
  });
});
