import { describe, expect, it } from 'vitest';
import { loadContent, type Content } from '../../../content/loader';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, maxHealth, type GameState } from '../../core/state';
import { createSave, loadSave } from '../../save/save';
import { addCondition, hasCondition } from '../conditions/conditions';
import { addItems } from '../inventory/inventory';
import { passTime } from '../survival/survival';
import { maybeEvent } from './events';

const content = loadContent();
// Tests count from the run's start time (D-075), not a fixed hour.
const START = content.newGame.startClockMinutes;
const quiet: Content = { ...content, events: { ...content.events, events: [] } };
const SRI = 'loc.srivilliputhur';
const at = (day: number, hh: number) => (day - 1) * 1440 + hh * 60;

/** Only these events, every chance at 1, so a test can make one happen. */
function forced(ids: string[]): Content {
  const events = content.events.events.filter((e) => ids.includes(e.id));
  return { ...content, events: { ...content.events, travelChancePerLeg: { road: 1, cross: 1 }, searchChance: 1, restChancePerHour: 1, events } };
}

function ok(state: GameState, command: Command, c: Content = content) {
  const result = applyCommand(state, command, c);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code} ${result.error.message}`);
  return result;
}
const err = (state: GameState, command: Command, c: Content = content) => {
  const r = applyCommand(state, command, c);
  return r.ok ? 'ok' : r.error.code;
};

function game(seed = 1, change: (s: GameState) => void = () => {}) {
  const s = createNewGame(content, seed);
  change(s);
  return s;
}
/** A game with this event's card open. */
const facing = (eventId: string, seed = 1, change: (s: GameState) => void = () => {}) =>
  game(seed, (s) => { change(s); s.event = { id: eventId, result: null }; });
/** Plays one choice over many seeds, returning the first result that matches. */
function firstWhere(eventId: string, choiceId: string, want: (s: GameState) => boolean, change: (s: GameState) => void = () => {}) {
  for (let seed = 1; seed < 200; seed++) {
    const r = ok(facing(eventId, seed, change), { type: 'event.choose', choiceId });
    if (want(r.state)) return r;
  }
  throw new Error('no seed gave that outcome');
}
const has = (s: GameState, itemId: string) => s.inventory.stacks.filter((st) => st.itemId === itemId).reduce((n, st) => n + st.count, 0);

describe('when events fire (D-059)', () => {
  const rate = (t: Parameters<typeof maybeEvent>[1], clock: number) => {
    let n = 0;
    for (let seed = 1; seed <= 4000; seed++) {
      const s = game(seed, (g) => (g.clockMinutes = clock));
      if (maybeEvent(s, t, content, [])) n += 1;
    }
    return n / 4000;
  };

  it('about 5% a 30-minute leg on roads, 10% cross-country, twice that in the dark without light', () => {
    expect(Math.abs(rate({ on: 'travel', minutes: 30, crossShare: 0, unlit: false }, at(1, 9)) - 0.05)).toBeLessThan(0.012);
    expect(Math.abs(rate({ on: 'travel', minutes: 30, crossShare: 1, unlit: false }, at(1, 9)) - 0.1)).toBeLessThan(0.012);
    expect(Math.abs(rate({ on: 'travel', minutes: 30, crossShare: 0, unlit: true }, at(1, 22)) - 0.1)).toBeLessThan(0.012);
    // A short leg is a smaller chance.
    expect(Math.abs(rate({ on: 'travel', minutes: 15, crossShare: 1, unlit: false }, at(1, 9)) - 0.05)).toBeLessThan(0.012);
  });

  it('not again within 2 hours of the last one', () => {
    const c = forced(['event.dead_traveller']);
    const t = { on: 'travel', minutes: 30, crossShare: 0, unlit: false } as const;
    expect(maybeEvent(game(1, (s) => (s.lastEventAt = s.clockMinutes - 60)), t, c, [])).toBe(false);
    expect(maybeEvent(game(1, (s) => (s.lastEventAt = s.clockMinutes - 120)), t, c, [])).toBe(true);
  });

  it('only the events that fit: day events by day, bad footing only in the dark without light', () => {
    const c = forced(['event.dust_storm', 'event.bad_footing']);
    const fired = (clock: number, unlit: boolean) => {
      const s = game(1, (g) => (g.clockMinutes = clock));
      maybeEvent(s, { on: 'travel', minutes: 30, crossShare: 0, unlit }, c, []);
      return s.event?.id ?? null;
    };
    expect(fired(at(1, 9), false)).toBe('event.dust_storm');
    expect(fired(at(1, 22), false)).toBeNull();
    expect(fired(at(1, 22), true)).toBe('event.bad_footing');
  });

  it('pauses a trip at the end of a leg; nothing else until the card is closed; then the trip goes on', () => {
    const c = forced(['event.dead_traveller']);
    let s = ok(game(), { type: 'travel.start', target: { siteId: SRI } }, c).state;
    const r = ok(s, { type: 'travel.advance' }, c);
    s = r.state;
    expect(r.events).toContainEqual({ type: 'event_started', eventId: 'event.dead_traveller' });
    expect(s.event).toEqual({ id: 'event.dead_traveller', result: null });
    expect(s.travel).not.toBeNull();
    expect(err(s, { type: 'travel.advance' }, c)).toBe('event_open');
    expect(err(s, { type: 'rest', minutes: 60 }, c)).toBe('event_open');
    expect(err(s, { type: 'event.close' }, c)).toBe('bad_choice');
    expect(err(s, { type: 'event.choose', choiceId: 'dance' }, c)).toBe('bad_choice');
    s = ok(s, { type: 'event.choose', choiceId: 'leave' }, c).state;
    expect(s.event?.result).toMatchObject({ choiceId: 'leave', outcome: 0 });
    expect(err(s, { type: 'event.choose', choiceId: 'leave' }, c)).toBe('bad_choice');
    s = ok(s, { type: 'event.close' }, c).state;
    expect(s.event).toBeNull();
    expect(ok(s, { type: 'travel.advance' }, c).state.event).toBeNull(); // still within the cooldown
    expect(err(game(), { type: 'event.close' })).toBe('no_event');
  });
});

describe('choices and outcomes', () => {
  it('a choice that needs an item is refused without it, and uses it up', () => {
    expect(applyCommand(facing('event.wild_dogs'), { type: 'event.choose', choiceId: 'throw_meat' }, content))
      .toMatchObject({ ok: false, error: { code: 'missing_item', message: 'Needs raw meat or cooked meat.' } });
    const s = facing('event.wild_dogs', 1, (g) => addItems(g, 'item.raw_meat', 2, content));
    const after = ok(s, { type: 'event.choose', choiceId: 'throw_meat' }).state;
    expect(has(after, 'item.raw_meat')).toBe(1);
    expect(after.event?.result?.lost).toEqual(['item.raw_meat']);
  });

  it('slipping past the roadblock is only for the night', () => {
    expect(applyCommand(facing('event.roadblock'), { type: 'event.choose', choiceId: 'slip_past' }, content))
      .toMatchObject({ ok: false, error: { message: 'Only at night.' } });
    expect(err(facing('event.roadblock', 1, (s) => (s.clockMinutes = at(1, 22))), { type: 'event.choose', choiceId: 'slip_past' })).toBe('ok');
  });

  it('a bite injures; a dirty one infects; any threat at night leaves him shaken (D-061)', () => {
    const bitten = firstWhere('event.wild_dogs', 'back_away', (s) => s.survival.injured);
    expect(bitten.state.survival.health).toBe(85);
    firstWhere('event.wild_dogs', 'back_away', (s) => hasCondition(s.survival, 'condition.infected_wound'));
    expect(hasCondition(bitten.state.survival, 'condition.shaken')).toBe(false);
    const night = ok(facing('event.wild_dogs', 1, (s) => (s.clockMinutes = at(1, 22))), { type: 'event.choose', choiceId: 'back_away' }).state;
    expect(hasCondition(night.survival, 'condition.shaken')).toBe(true);
    expect(night.event?.result?.conditions).toContain('condition.shaken');
  });

  it('finds go into the pack, or onto the ground when too heavy', () => {
    const light = firstWhere('event.abandoned_vehicle', 'search', (s) => s.event!.result!.found.length > 0);
    const f = light.state.event!.result!.found[0]!;
    expect(has(light.state, f.itemId)).toBe(f.count);
    expect(light.state.clockMinutes).toBe(START + 30);
    const heavy = firstWhere('event.abandoned_vehicle', 'search', (s) => s.event!.result!.left.length > 0,
      (g) => addItems(g, 'item.scrap_metal', 49, content));
    expect(heavy.state.ground).toHaveLength(1);
  });

  it('the smoke\'s tracks lead to the nearest place he hasn\'t been to (D-094)', () => {
    const r = firstWhere('event.distant_smoke', 'look', (s) => s.event!.result!.outcome === 2);
    const siteId = r.state.event!.result!.siteId!;
    expect(r.state.map.visitedSiteIds).not.toContain(siteId);
    expect(r.events.some((e) => e.type === 'site_visited')).toBe(false);
  });

  it('bad footing in the dark resolves by itself; a twisted ankle stops the trip (D-048)', () => {
    const c = forced(['event.bad_footing']);
    for (let seed = 1; seed < 50; seed++) {
      const s = game(seed, (g) => {
        g.clockMinutes = at(1, 22);
        g.inventory.stacks = g.inventory.stacks.filter((st) => st.itemId !== 'item.torch');
      });
      const r = ok(ok(s, { type: 'travel.start', target: { siteId: SRI } }, c).state, { type: 'travel.advance' }, c);
      expect(r.state.event?.result).not.toBeNull();
      if (r.state.event!.result!.outcome !== 0) continue;
      expect(r.state.travel).toBeNull();
      expect(r.state.survival.injured).toBe(true);
      expect(hasCondition(r.state.survival, 'condition.sprained_ankle')).toBe(true);
      expect(r.events).toContainEqual({ type: 'travel_stopped', reason: 'event' });
      return;
    }
    throw new Error('never twisted');
  });

  it('dying from an outcome ends the run', () => {
    const r = firstWhere('event.wild_dogs', 'back_away', (s) => s.dead, (g) => (g.survival.health = 10));
    expect(r.events).toContainEqual({ type: 'died', cause: 'injury' });
  });
});

describe('search and rest events', () => {
  // Standing at a town building on the world map (D-099).
  const atBuilding = (typeId: string, s = game()) => {
    const b = content.towns[SRI]!.buildings.find((x) => x.typeId === typeId)!;
    s.player.position = { lat: b.lat, lon: b.lon };
    return s;
  };
  const inHouse = () => atBuilding('btype.house');

  it('an unsteady floor only in houses and apartment blocks; the torch makes it safe', () => {
    const c = forced(['event.unsteady_floor']);
    const s = ok(inHouse(), { type: 'scavenge.search', torch: false }, c).state;
    expect(s.event?.id).toBe('event.unsteady_floor');
    expect(ok(s, { type: 'event.choose', choiceId: 'careful' }, c).state.survival.injured).toBe(false);
    const t = atBuilding('btype.place_of_worship');
    expect(ok(t, { type: 'scavenge.search', torch: false }, c).state.event).toBeNull();
  });

  it('resting outdoors at night can be disturbed, but not at home or beside a fire', () => {
    const c = forced(['event.moving_in_dark']);
    const out = (change: (s: GameState) => void = () => {}) => game(1, (s) => {
      s.clockMinutes = at(1, 20);
      s.player.position = { lat: content.sites[SRI]!.lat, lon: content.sites[SRI]!.lon };
      change(s);
    });
    const r = ok(out(), { type: 'rest', minutes: 240 }, c);
    expect(r.events[0]).toEqual({ type: 'rested', minutes: 60 });
    expect(r.state.event?.id).toBe('event.moving_in_dark');
    const watched = ok(r.state, { type: 'event.choose', choiceId: 'watch' }, c).state;
    expect(watched.survival.rest).toBeCloseTo(r.state.survival.rest - 12.5);
    expect(hasCondition(watched.survival, 'condition.restless')).toBe(true);
    expect(hasCondition(watched.survival, 'condition.shaken')).toBe(true);
    expect(ok(out((s) => (s.fire = { ...s.player.position, outAt: s.clockMinutes + 600 })), { type: 'rest', minutes: 240 }, c).state.event).toBeNull();
    expect(ok(game(1, (s) => (s.clockMinutes = at(1, 20))), { type: 'rest', minutes: 240 }, c).state.event).toBeNull();
    expect(ok(out((s) => (s.clockMinutes = at(1, 9))), { type: 'rest', minutes: 240 }, c).state.event).toBeNull();
  });
});

describe('conditions (D-061)', () => {
  const withCondition = (id: string, change: (s: GameState) => void = () => {}) =>
    game(1, (s) => { change(s); addCondition(s, id, quiet, []); });
  const tick = (s: GameState, minutes: number, activity: 'work' | 'sleep' = 'work') => {
    const events: GameEvent[] = [];
    passTime(s, minutes, activity, quiet, events);
    return events;
  };

  it('a sprained ankle slows every leg to 70% speed, and passes after 12 hours', () => {
    const s = ok(withCondition('condition.sprained_ankle'), { type: 'travel.start', target: { siteId: SRI } }, quiet).state;
    const leg = s.travel!.legs[0]!.minutes;
    expect(ok(s, { type: 'travel.advance' }, quiet).state.clockMinutes).toBe(START + Math.round(leg / 0.7));
    const later = withCondition('condition.sprained_ankle');
    expect(tick(later, 720)).toContainEqual({ type: 'condition_ended', conditionId: 'condition.sprained_ankle' });
    expect(later.survival.conditions).toEqual([]);
  });

  it('the same condition again restarts its timer', () => {
    const s = withCondition('condition.weak');
    s.clockMinutes += 600;
    addCondition(s, 'condition.weak', quiet, []);
    expect(s.survival.conditions).toEqual([{ id: 'condition.weak', until: s.clockMinutes + 1440 }]);
  });

  it('weak lowers maximum Health by 10', () => {
    const s = withCondition('condition.weak');
    expect(maxHealth(s.survival, quiet)).toBe(90);
    expect(s.survival.health).toBe(90);
  });

  it('an infected wound drains Health and blocks healing until the right dressing', () => {
    const s = withCondition('condition.infected_wound', (g) => {
      g.survival.health = 50;
      for (const id of ['item.cloth_bandage', 'item.old_pills', 'item.sterile_bandage']) addItems(g, id, 1, quiet);
    });
    tick(s, 600, 'sleep');
    expect(s.survival.health).toBeCloseTo(40);
    const idx = (g: GameState, id: string) => g.inventory.stacks.findIndex((st) => st.itemId === id);
    expect(err(s, { type: 'item.use', index: idx(s, 'item.old_pills') }, quiet)).toBe('injured');
    const cloth = ok(s, { type: 'item.use', index: idx(s, 'item.cloth_bandage') }, quiet).state;
    expect(hasCondition(cloth.survival, 'condition.infected_wound')).toBe(true);
    expect(cloth.survival.health).toBeCloseTo(40);
    const cured = ok(s, { type: 'item.use', index: idx(s, 'item.sterile_bandage') }, quiet);
    expect(cured.events).toContainEqual({ type: 'condition_cured', conditionId: 'condition.infected_wound' });
    expect(cured.state.survival.health).toBeCloseTo(60);
  });

  it('a wound can kill', () => {
    const s = withCondition('condition.infected_wound', (g) => (g.survival.health = 0.5));
    expect(tick(s, 60)).toContainEqual({ type: 'died', cause: 'injury' });
  });

  it('restless drains Rest 50% faster until a 4-hour sleep', () => {
    const s = withCondition('condition.restless');
    tick(s, 60);
    expect(s.survival.rest).toBeCloseTo(92.5);
    expect(hasCondition(ok(s, { type: 'rest', minutes: 120 }, quiet).state.survival, 'condition.restless')).toBe(true);
    expect(hasCondition(ok(s, { type: 'rest', minutes: 240 }, quiet).state.survival, 'condition.restless')).toBe(false);
  });

  it('shaken makes searches 25% slower; an hour of rest at home ends it', () => {
    const s = withCondition('condition.shaken');
    const house = content.towns[SRI]!.buildings.find((b) => b.typeId === 'btype.house')!;
    s.player.position = { lat: house.lat, lon: house.lon };
    const before = s.clockMinutes;
    expect(ok(s, { type: 'scavenge.search', torch: false }, quiet).state.clockMinutes).toBe(before + Math.round(30 * 1.25));
    expect(hasCondition(ok(withCondition('condition.shaken'), { type: 'rest', minutes: 60 }, quiet).state.survival, 'condition.shaken')).toBe(false);
    const outdoors = withCondition('condition.shaken', (g) => (g.player.position = { lat: 9.6, lon: 77.7 }));
    expect(hasCondition(ok(outdoors, { type: 'rest', minutes: 60 }, quiet).state.survival, 'condition.shaken')).toBe(true);
  });

  it('sleeping to full Rest at home leaves him well rested: Rest drains 25% slower', () => {
    const tired = (change: (s: GameState) => void = () => {}) => game(1, (s) => { s.survival.rest = 40; change(s); });
    const home = ok(tired(), { type: 'rest', minutes: 'until_rested' }, quiet);
    expect(home.events).toContainEqual({ type: 'condition_added', conditionId: 'condition.well_rested' });
    const s = home.state;
    tick(s, 60);
    expect(s.survival.rest).toBeCloseTo(100 - 3.75);
    const away = ok(tired((g) => (g.player.position = { lat: 9.6, lon: 77.7 })), { type: 'rest', minutes: 'until_rested' }, quiet).state;
    expect(hasCondition(away.survival, 'condition.well_rested')).toBe(false);
  });
});

describe('events in saves', () => {
  it('an open card and conditions survive a reload; a v6 save loads with none', () => {
    const s = facing('event.wild_dogs', 1, (g) => addCondition(g, 'condition.weak', content, []));
    const loaded = loadSave(JSON.parse(JSON.stringify(createSave(s, 'x'))), content);
    if (!loaded.ok) throw new Error(loaded.error);
    expect(loaded.save.gameState).toEqual(s);
    // The same choice after a reload gives the same outcome: no re-rolling by reloading.
    expect(ok(loaded.save.gameState, { type: 'event.choose', choiceId: 'run' }).state).toEqual(ok(s, { type: 'event.choose', choiceId: 'run' }).state);

    const v6: Record<string, unknown> = { ...game(), survival: { ...game().survival } };
    delete v6.event;
    delete v6.lastEventAt;
    delete (v6.survival as Record<string, unknown>).conditions;
    const old = loadSave({ saveVersion: 6, createdAt: 'x', gameState: v6 }, content);
    if (!old.ok) throw new Error(old.error);
    expect(old.save.gameState).toMatchObject({ event: null, lastEventAt: null, survival: { conditions: [] } });
    expect(loadSave({ ...createSave(s, 'x'), gameState: { ...s, event: { id: 'event.dragon', result: null } } }, content).ok).toBe(false);
  });
});
