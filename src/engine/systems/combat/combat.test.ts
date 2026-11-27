import { describe, expect, it } from 'vitest';
import { loadContent, type Content } from '../../../content/loader';
import type { Ability, Enemy } from '../../../content/schemas';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, type Combatant, type GameState } from '../../core/state';
import { createSave, loadSave } from '../../save/save';
import { addCondition } from '../conditions/conditions';
import { addItems } from '../inventory/inventory';
import { abilityBlocked, odds, performAbility, validTargets } from './abilities';
import { decide } from './ai';
import { fleeChance, rollInitiative, startFight } from './combat';
import { statsOf } from './fighters';
import { bringIn, moveBy, removeFromField, sideOf } from './formation';
import { damage } from './resolve';
import { applyStatus, startTurn } from './statuses';

const base = loadContent();
// Tests count from the run's start time (D-075), not a fixed hour.
const START = base.newGame.startClockMinutes;

// Test-only data: an ability or enemy added here exercises the engine without touching the game's content.
const ab = (a: Partial<Ability> & { id: string }): Ability => ({
  name: a.id, description: 'test', usableFrom: [1, 2, 3, 4], target: { side: 'enemy', ranks: [1, 2, 3, 4], mode: 'single' }, ...a,
});
const dummy = (e: Partial<Enemy> & { id: string }): Enemy => ({
  name: e.id, hp: 20, xp: 0, damage: [3, 3], size: 1, preferredRanks: [1, 2], abilities: [{ id: 'ability.dog_bite', weight: 1 }], ai: { target: 'random' }, corpse: null, loot: [],
  stats: { atk: 0, def: 0, spd: 1, critRate: 0, critDamage: 150, acc: 200, dodge: 0, stunRes: 0, bleedRes: 0, blightRes: 0, debuffRes: 0, moveRes: 0, deathblowRes: 0 },
  ...e,
});
function withData(abilities: Ability[] = [], enemies: Enemy[] = [], patch: (c: Content) => void = () => {}): Content {
  const c: Content = structuredClone(base);
  for (const a of abilities) c.abilities[a.id] = a;
  for (const e of enemies) c.enemies[e.id] = e;
  patch(c);
  return c;
}
const content = withData([
  ab({ id: 'ability.t_hit', damage: 1, accuracy: 500 }),
  ab({ id: 'ability.t_heal', target: { side: 'ally', ranks: [1, 2, 3, 4], mode: 'single' }, heal: [10, 10] }),
  ab({ id: 'ability.t_bleed', accuracy: 500, effects: [{ kind: 'bleed', amount: 4, rounds: 2, chance: 100 }] }),
  ab({ id: 'ability.t_blight', accuracy: 500, effects: [{ kind: 'blight', amount: 3, rounds: 3, chance: 100 }] }),
  ab({ id: 'ability.t_stun', accuracy: 500, effects: [{ kind: 'stun', chance: 100 }] }),
  ab({ id: 'ability.t_pull', accuracy: 500, effects: [{ kind: 'pull', amount: 2, chance: 100 }] }),
  ab({ id: 'ability.t_shuffle', accuracy: 500, effects: [{ kind: 'shuffle', chance: 100 }] }),
  ab({ id: 'ability.t_lunge', usableFrom: [2, 3, 4], damage: 1, accuracy: 500, selfMove: 1 }),
  ab({ id: 'ability.t_haste', target: { side: 'self', ranks: [], mode: 'single' }, effects: [{ kind: 'extra_turn', onSelf: true }] }),
  ab({ id: 'ability.t_burn', accuracy: 500, effects: [{ kind: 'burn', amount: 5, rounds: 2, chance: 100 }] }),
], [
  dummy({ id: 'enemy.t_dummy' }),
  dummy({ id: 'enemy.t_big', size: 2, hp: 40, preferredRanks: [1] }),
  dummy({ id: 'enemy.t_twice', turnsPerRound: 2 }),
  dummy({ id: 'enemy.t_corpse', corpse: { hp: 5 } }),
], (c) => {
  // A status kind that exists only in data: the engine runs it from its flags.
  c.combat.statuses.burn = { name: 'Burning', resist: 'blightRes', damagePerTurn: true };
  // Let Prabu use the test abilities.
  c.characters['character.prabu']!.abilities.push('ability.t_hit', 'ability.t_heal', 'ability.t_bleed', 'ability.t_blight', 'ability.t_stun',
    'ability.t_pull', 'ability.t_shuffle', 'ability.t_lunge', 'ability.t_haste', 'ability.t_burn');
});

/** The test content with a change, for one test. */
function variant(patch: (c: Content) => void): Content {
  const c: Content = structuredClone(content);
  patch(c);
  return c;
}

/** A fight already under way at Prabu's turn, with the enemies in the given order (front first). */
function arena(enemyIds: string[], change: (s: GameState) => void = () => {}, seed = 1): GameState {
  const s = createNewGame(content, seed);
  change(s);
  const combatants: Combatant[] = [{ uid: 'p0', side: 'player', defId: 'character.prabu', protagonist: true, hp: Math.round(s.survival.health), rank: 1, size: 1, statuses: [], deathsDoor: false, corpse: false }];
  let rank = 1;
  enemyIds.forEach((id, i) => {
    const e = content.enemies[id]!;
    combatants.push({ uid: `e${i}`, side: 'enemy', defId: id, protagonist: false, hp: e.hp, rank, size: e.size, statuses: [], deathsDoor: false, corpse: false });
    rank += e.size;
  });
  s.combat = { combatants, round: 1, queue: ['p0'], turnStarted: true, defeated: [], arrowsShot: 0, log: [], result: null };
  return s;
}
const run = (s: GameState, command: Command, c: Content = content) => applyCommand(s, command, c);
function ok(s: GameState, command: Command, c: Content = content) {
  const r = run(s, command, c);
  if (!r.ok) throw new Error(`${command.type} failed: ${r.error.code} ${r.error.message}`);
  return r;
}
const use = (s: GameState, abilityId: string, target?: string) => ok(s, { type: 'combat.act', action: 'ability', abilityId, target });
const err = (s: GameState, command: Command) => { const r = run(s, command); return r.ok ? 'ok' : r.error.code; };
const fighter = (s: GameState, uid: string) => s.combat!.combatants.find((c) => c.uid === uid)!;
const ranks = (s: GameState, side: 'player' | 'enemy') => sideOf(s.combat!, side).map((c) => [c.uid, c.rank]);
const has = (s: GameState, itemId: string) => s.inventory.stacks.filter((st) => st.itemId === itemId).reduce((n, st) => n + st.count, 0);

describe('formation (D-069)', () => {
  it('has four ranks a side; Prabu alone leaves ranks 2–4 empty; a size-2 enemy takes two', () => {
    const s = arena(['enemy.t_big', 'enemy.t_dummy', 'enemy.t_dummy']);
    expect(ranks(s, 'player')).toEqual([['p0', 1]]);
    expect(ranks(s, 'enemy')).toEqual([['e0', 1], ['e1', 3], ['e2', 4]]);
    const extra: Combatant = { ...fighter(s, 'e1'), uid: 'e9' };
    expect(bringIn(s.combat!, extra)).toBe(false);
  });

  it('moving swaps places; a corpse blocks the way; removing a fighter closes the gap', () => {
    const s = arena(['enemy.t_dummy', 'enemy.t_dummy', 'enemy.t_dummy']);
    const c = s.combat!;
    expect(moveBy(c, fighter(s, 'e2'), 2)).toBe(2);
    expect(ranks(s, 'enemy')).toEqual([['e2', 1], ['e0', 2], ['e1', 3]]);
    fighter(s, 'e0').corpse = true;
    expect(moveBy(c, fighter(s, 'e1'), 2)).toBe(0);
    removeFromField(c, fighter(s, 'e0'));
    expect(ranks(s, 'enemy')).toEqual([['e2', 1], ['e1', 2]]);
  });

  it('a newcomer takes an empty back rank, or the place of remains when the ranks are full', () => {
    const s = arena(['enemy.t_dummy', 'enemy.t_dummy', 'enemy.t_dummy', 'enemy.t_dummy']);
    fighter(s, 'e1').corpse = true;
    const newcomer: Combatant = { ...fighter(s, 'e0'), uid: 'e9', corpse: false };
    expect(bringIn(s.combat!, newcomer)).toBe(true);
    expect(ranks(s, 'enemy')).toEqual([['e0', 1], ['e9', 2], ['e2', 3], ['e3', 4]]);
  });

  it('push, pull and shuffle move enemies, against their move resistance', () => {
    let s = use(arena(['enemy.t_dummy', 'enemy.t_dummy']), 'ability.shove', 'e0').state;
    expect(ranks(s, 'enemy')).toEqual([['e1', 1], ['e0', 2]]);
    s = use(arena(['enemy.t_dummy', 'enemy.t_dummy', 'enemy.t_dummy']), 'ability.t_pull', 'e2').state;
    expect(ranks(s, 'enemy')[0]).toEqual(['e2', 1]);
    const moved = new Set<string>();
    for (let seed = 1; seed < 20; seed++) moved.add(JSON.stringify(ranks(use(arena(['enemy.t_dummy', 'enemy.t_dummy', 'enemy.t_dummy'], () => {}, seed), 'ability.t_shuffle', 'e0').state, 'enemy')));
    expect(moved.size).toBeGreaterThan(1);
    // A boar (move resistance 75) is rarely pushed by a shove (100% − 75%).
    let pushed = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const r = use(arena(['enemy.mutated_boar', 'enemy.t_dummy'], () => {}, seed), 'ability.shove', 'e0');
      if (r.state.combat!.log.some((l) => l.kind === 'move' && l.target === 'e0')) pushed += 1;
    }
    expect(pushed / 200).toBeLessThan(0.4);
  });

  it('a big enemy in two target ranks is one target and is hit once by an all-ranks ability', () => {
    const s = arena(['enemy.t_big', 'enemy.t_dummy'], (g) => { g.inventory.weapon = 'item.aruval'; });
    const sweep = content.abilities['ability.sweep']!;
    expect(validTargets(s, fighter(s, 'p0'), sweep).map((c) => c.uid)).toEqual(['e0']);
    const hits = use(s, 'ability.sweep').state.combat!.log.filter((l) => (l.kind === 'hit' || l.kind === 'miss') && l.actor === 'p0');
    expect(hits.map((l) => l.target)).toEqual(['e0']);
  });

  it('remains hold their rank, take no turns, can be struck away, and then the rest close up', () => {
    const s = arena(['enemy.t_corpse', 'enemy.t_dummy']);
    damage(s, fighter(s, 'e0'), 99, content, []);
    expect(fighter(s, 'e0')).toMatchObject({ corpse: true, hp: 5, rank: 1 });
    expect(rollInitiative(s, content, true)).not.toContain('e0');
    expect(validTargets(s, fighter(s, 'p0'), content.abilities['ability.stab']!).map((c) => c.uid)).toEqual(['e0', 'e1']);
    // Abilities that can't touch remains skip them.
    expect(validTargets(s, fighter(s, 'p0'), content.abilities['ability.open_vein']!).map((c) => c.uid)).toEqual(['e1']);
    damage(s, fighter(s, 'e0'), 5, content, []);
    expect(ranks(s, 'enemy')).toEqual([['e1', 1]]);
    expect(s.combat!.log.at(-1)).toEqual({ kind: 'corpse_cleared', target: 'e0', defId: 'enemy.t_corpse' });
  });
});

describe('abilities (D-069)', () => {
  it('can only be used from their ranks, with the reason when not', () => {
    const s = arena(['enemy.t_dummy'], (g) => { g.inventory.weapon = 'item.bow'; addItems(g, 'item.arrow', 2, content); });
    expect(abilityBlocked(s, fighter(s, 'p0'), content.abilities['ability.pinning_shot']!, content)).toBe('Wrong position: usable from rank 2, 3, 4');
    expect(err(s, { type: 'combat.act', action: 'ability', abilityId: 'ability.pinning_shot', target: 'e0' })).toBe('wrong_rank');
    expect(err(arena(['enemy.t_dummy']), { type: 'combat.act', action: 'ability', abilityId: 'ability.t_lunge', target: 'e0' })).toBe('wrong_rank');
  });

  it('only reach their target ranks', () => {
    const s = arena(['enemy.t_dummy', 'enemy.t_dummy', 'enemy.t_dummy']);
    expect(validTargets(s, fighter(s, 'p0'), content.abilities['ability.stab']!).map((c) => c.uid)).toEqual(['e0', 'e1']);
    expect(err(s, { type: 'combat.act', action: 'ability', abilityId: 'ability.stab', target: 'e2' })).toBe('bad_target');
    const one = arena(['enemy.t_dummy']);
    expect(abilityBlocked(one, fighter(one, 'p0'), content.abilities['ability.hook']!, content)).toBe('No target in rank 2, 3');
    // A big enemy in ranks 1–2 can be hooked by its back half.
    const big = arena(['enemy.t_big']);
    expect(abilityBlocked(big, fighter(big, 'p0'), content.abilities['ability.hook']!, content)).toBeNull();
  });

  it('target allies (healing) or enemies; refuse the wrong side', () => {
    const s = arena(['enemy.t_dummy'], (g) => (g.survival.health = 50));
    expect(err(s, { type: 'combat.act', action: 'ability', abilityId: 'ability.t_heal', target: 'e0' })).toBe('bad_target');
    expect(use(s, 'ability.t_heal', 'p0').state.survival.health).toBeGreaterThanOrEqual(50 + 10 - 3);
  });

  it('a multi-target ability hits everyone in its ranks', () => {
    const s = arena(['enemy.t_dummy', 'enemy.t_dummy', 'enemy.t_dummy'], (g) => { g.inventory.weapon = 'item.aruval'; });
    const struck = use(s, 'ability.sweep').state.combat!.log.filter((l) => l.actor === 'p0' && (l.kind === 'hit' || l.kind === 'miss')).map((l) => l.target);
    expect(struck).toEqual(['e0', 'e1']);
  });

  it('can move the user after use', () => {
    const s = arena(['enemy.t_dummy']);
    s.combat!.combatants.push({ uid: 'p1', side: 'player', defId: 'character.prabu', protagonist: false, hp: 30, rank: 2, size: 1, statuses: [], deathsDoor: false, corpse: false });
    s.combat!.queue = ['p1'];
    const after = use(s, 'ability.t_lunge', 'e0').state;
    expect(ranks(after, 'player')).toEqual([['p1', 1], ['p0', 2]]);
  });

  it('refuses unknown abilities, acting out of turn and acting after the fight', () => {
    const s = arena(['enemy.t_dummy']);
    expect(err(s, { type: 'combat.act', action: 'ability', abilityId: 'ability.dog_bite', target: 'e0' })).toBe('bad_choice');
    const notMine = arena(['enemy.t_dummy'], (g) => g);
    notMine.combat!.queue = ['e0'];
    expect(err(notMine, { type: 'combat.act', action: 'pass' })).toBe('bad_choice');
    expect(err(s, { type: 'combat.act', action: 'move', steps: 1 })).toBe('bad_target');
    expect(err(s, { type: 'rest', minutes: 60 })).toBe('in_combat');
  });
});

describe('turns (D-065, D-069)', () => {
  it('initiative is SPD + 1–8, highest first', () => {
    let first = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      const s = arena(['enemy.wild_dog'], () => {}, seed);
      if (rollInitiative(s, content, true)[0] === 'e0') first += 1;
    }
    // Dog SPD 6 vs Prabu SPD 5 (knife): the dog goes first a little more than half the time.
    expect(first / 2000).toBeGreaterThan(0.5);
    expect(first / 2000).toBeLessThan(0.7);
  });

  it('ties go to the player side, then the front rank', () => {
    const tied = variant((c) => { c.combat.dieSides = 1; c.enemies['enemy.t_dummy']!.stats.spd = 5; });
    expect(rollInitiative(arena(['enemy.t_dummy', 'enemy.t_dummy']), tied, true)).toEqual(['p0', 'e0', 'e1']);
  });

  it('one action a turn, then the enemies, then a new round', () => {
    const s = arena(['enemy.t_dummy']);
    s.combat!.queue = ['p0', 'e0'];
    const r = ok(s, { type: 'combat.act', action: 'pass' }).state;
    expect(r.combat!.log.map((l) => l.kind)).toContain('ability');
    expect(r.combat!.round).toBe(2);
    expect(r.combat!.queue).toContain('p0');
    expect(fighter(r, 'p0')).toBeTruthy();
  });

  it('a stunned fighter loses its next turn and is then briefly hard to stun again', () => {
    const s = arena(['enemy.t_dummy']);
    applyStatus(s, fighter(s, 'e0'), { kind: 'stun', chance: 200 }, content);
    expect(startTurn(s, fighter(s, 'e0'), content, [])).toBe(true);
    expect(fighter(s, 'e0').statuses).toEqual([{ kind: 'buff', stat: 'stunRes', amount: 50, rounds: 2 }]);
    expect(statsOf(s, fighter(s, 'e0'), content).stunRes).toBe(50);
    expect(startTurn(s, fighter(s, 'e0'), content, [])).toBe(false);
  });

  it('some enemies act twice a round; an ability can grant an extra turn', () => {
    expect(rollInitiative(arena(['enemy.t_twice']), content, true).filter((u) => u === 'e0')).toHaveLength(2);
    const s = arena(['enemy.t_dummy']);
    s.combat!.queue = ['p0', 'e0'];
    const r = use(s, 'ability.t_haste');
    expect(r.state.combat!.queue[0]).toBe('p0');
    expect(r.state.combat!.round).toBe(1);
  });
});

describe('damage and statuses (D-069)', () => {
  it('hit chance is ACC + the ability\'s accuracy − dodge, kept 5–95; crits use crit damage', () => {
    const s = arena(['enemy.wild_dog']);
    const me = fighter(s, 'p0');
    expect(odds(s, me, content.abilities['ability.stab']!, fighter(s, 'e0'), content)).toEqual({ hit: 70, crit: 15 });
    const seen = { plain: new Set<number>(), crit: new Set<number>() };
    for (let seed = 1; seed <= 300; seed++) {
      const r = use(arena(['enemy.t_dummy'], () => {}, seed), 'ability.stab', 'e0');
      const hit = r.state.combat!.log.find((l) => l.kind === 'hit' && l.actor === 'p0');
      if (hit) (hit.crit ? seen.crit : seen.plain).add(hit.amount!);
    }
    expect([...seen.plain].sort()).toEqual([6, 7, 8, 9]);
    expect([...seen.crit].every((d) => d >= 9 && d <= 14)).toBe(true);
  });

  it('dodge makes misses; defence cuts damage; Weak takes off 25%', () => {
    let misses = 0;
    for (let seed = 1; seed <= 400; seed++) if (use(arena(['enemy.wild_dog'], () => {}, seed), 'ability.stab', 'e0').state.combat!.log.some((l) => l.kind === 'miss' && l.actor === 'p0')) misses += 1;
    expect(Math.abs(misses / 400 - 0.3)).toBeLessThan(0.07);
    const boarHits = new Set<number>();
    const weakHits = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const b = use(arena(['enemy.mutated_boar'], () => {}, seed), 'ability.t_hit', 'e0').state.combat!.log.find((l) => l.kind === 'hit' && !l.crit && l.actor === 'p0');
      if (b) boarHits.add(b.amount!);
      const w = use(arena(['enemy.t_dummy'], (g) => addCondition(g, 'condition.weak', content, []), seed), 'ability.t_hit', 'e0').state.combat!.log.find((l) => l.kind === 'hit' && !l.crit && l.actor === 'p0');
      if (w) weakHits.add(w.amount!);
    }
    expect([...boarHits].every((d) => d >= 5 && d <= 8)).toBe(true);
    expect([...weakHits].every((d) => d >= 5 && d <= 7)).toBe(true);
  });

  it('a status lands when the roll beats chance − resistance', () => {
    const s = arena(['enemy.mutated_boar']);
    const boar = fighter(s, 'e0');
    let landed = 0;
    for (let i = 0; i < 400; i++) {
      boar.statuses = [];
      if (applyStatus(s, boar, { kind: 'stun', chance: 100 }, content)) landed += 1;
    }
    // Boar stun resistance 60: 40% land.
    expect(Math.abs(landed / 400 - 0.4)).toBeLessThan(0.07);
    expect(applyStatus(s, boar, { kind: 'mark', rounds: 2 }, content)).toBe(true);
  });

  it('bleed and blight hurt at the start of each turn, stack, and run out', () => {
    // Through an ability: the bleed lands on a target with no resistance.
    expect(fighter(use(arena(['enemy.t_dummy']), 'ability.t_bleed', 'e0').state, 'e0').statuses.some((x) => x.kind === 'bleed')).toBe(true);
    const t = arena(['enemy.t_dummy']);
    const e = fighter(t, 'e0');
    applyStatus(t, e, { kind: 'bleed', amount: 4, rounds: 2 }, content);
    applyStatus(t, e, { kind: 'bleed', amount: 4, rounds: 2 }, content);
    applyStatus(t, e, { kind: 'blight', amount: 3, rounds: 1 }, content);
    startTurn(t, e, content, []);
    expect(e.hp).toBe(20 - 8 - 3);
    expect(e.statuses.map((x) => x.kind)).toEqual(['bleed', 'bleed']);
    startTurn(t, e, content, []);
    expect(e.hp).toBe(20 - 8 - 3 - 8);
    expect(e.statuses).toEqual([]);
    expect(t.combat!.log.filter((l) => l.kind === 'expired')).toHaveLength(3);
  });

  it('buffs and debuffs change stats until they run out', () => {
    // Take aim lasts through his next turn: by the time that turn has begun the buff still holds; after it, it's gone.
    const s = use(arena(['enemy.t_dummy']), 'ability.take_aim').state;
    const me = fighter(s, 'p0');
    expect(s.combat!.queue[0]).toBe('p0');
    expect(statsOf(s, me, content).acc).toBe(85 + 15);
    startTurn(s, me, content, []);
    expect(statsOf(s, me, content).acc).toBe(85);
    const marked = arena(['enemy.raider_bow']);
    applyStatus(marked, fighter(marked, 'p0'), { kind: 'debuff', stat: 'def', amount: -10, rounds: 3, chance: 300 }, content);
    expect(statsOf(marked, fighter(marked, 'p0'), content).def).toBe(-10);
  });

  it('a status kind defined only in data works without engine code', () => {
    const s = use(arena(['enemy.t_dummy']), 'ability.t_burn', 'e0').state;
    const e = fighter(s, 'e0');
    expect(e.statuses).toEqual([{ kind: 'burn', amount: 5, rounds: 2 }]);
    startTurn(s, e, content, []);
    expect(e.hp).toBe(15);
  });
});

describe('Death\'s Door and Deathblow (D-069)', () => {
  const always = variant((c) => { c.characters['character.prabu']!.stats.deathblowRes = 100; });
  const never = variant((c) => { c.characters['character.prabu']!.stats.deathblowRes = 0; });

  it('Health at 0 puts Prabu at Death\'s Door, with penalties, not dead', () => {
    const s = arena(['enemy.t_dummy'], (g) => (g.survival.health = 5));
    damage(s, fighter(s, 'p0'), 10, content, []);
    expect(s.survival.health).toBe(0);
    expect(fighter(s, 'p0').deathsDoor).toBe(true);
    expect(s.dead).toBe(false);
    expect(statsOf(s, fighter(s, 'p0'), content)).toMatchObject({ acc: 85 - 10, spd: 5 - 2 });
  });

  it('every blow at Death\'s Door is a Deathblow check; failing it kills him for good', () => {
    const s = arena(['enemy.t_dummy'], (g) => (g.survival.health = 0));
    fighter(s, 'p0').deathsDoor = true;
    const events: GameEvent[] = [];
    damage(s, fighter(s, 'p0'), 3, always, events);
    damage(s, fighter(s, 'p0'), 3, always, events);
    expect(s.combat!.log.filter((l) => l.kind === 'deathblow' && l.survived)).toHaveLength(2);
    expect(s.dead).toBe(false);
    damage(s, fighter(s, 'p0'), 3, never, events);
    expect(s.dead).toBe(true);
    expect(events).toContainEqual({ type: 'died', cause: 'killed' });
    expect(err(s, { type: 'combat.act', action: 'pass' })).toBe('dead');
  });

  it('a bleed at Death\'s Door is a Deathblow check too', () => {
    const s = arena(['enemy.t_dummy'], (g) => (g.survival.health = 0));
    const me = fighter(s, 'p0');
    me.deathsDoor = true;
    applyStatus(s, me, { kind: 'bleed', amount: 2, rounds: 3, chance: 300 }, content);
    startTurn(s, me, never, []);
    expect(s.dead).toBe(true);
  });

  it('healing above 0 brings him back from Death\'s Door', () => {
    const s = arena(['enemy.t_dummy'], (g) => { g.survival.health = 0; addItems(g, 'item.old_pills', 1, content); });
    fighter(s, 'p0').deathsDoor = true;
    const r = ok(s, { type: 'combat.act', action: 'use_item', index: s.inventory.stacks.findIndex((st) => st.itemId === 'item.old_pills') }, always);
    expect(r.state.survival.health).toBeGreaterThan(0);
    expect(fighter(r.state, 'p0').deathsDoor).toBe(false);
  });

  it('winning at Death\'s Door leaves him at 1 Health, not dead', () => {
    const s = arena(['enemy.t_dummy'], (g) => (g.survival.health = 0));
    fighter(s, 'p0').deathsDoor = true;
    fighter(s, 'e0').hp = 1;
    const r = use(s, 'ability.t_hit', 'e0');
    expect(r.state.combat!.result?.outcome).toBe('won');
    expect(r.state.survival.health).toBe(1);
  });
});

describe('enemy AI (D-069)', () => {
  it('uses abilities that work from where it stands, on valid targets', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = arena(['enemy.raider_blade', 'enemy.raider_bow'], () => {}, seed);
      for (const uid of ['e0', 'e1']) {
        const c = fighter(s, uid);
        const d = decide(s, c, content);
        expect(d.kind).toBe('ability');
        if (d.kind !== 'ability') continue;
        expect(abilityBlocked(s, c, content.abilities[d.abilityId]!, content)).toBeNull();
        expect(content.enemies[c.defId]!.abilities.map((a) => a.id)).toContain(d.abilityId);
      }
    }
  });

  it('an archer pushed to the front with nothing to use steps back; a fighter at the back steps up', () => {
    const s = arena(['enemy.raider_bow', 'enemy.raider_blade', 'enemy.t_dummy', 'enemy.t_dummy']);
    expect(decide(s, fighter(s, 'e0'), content)).toEqual({ kind: 'move', steps: -1 });
    const back = arena(['enemy.t_dummy', 'enemy.t_dummy', 'enemy.raider_blade']);
    expect(decide(back, fighter(back, 'e2'), content)).toEqual({ kind: 'move', steps: 1 });
  });

  it('picks targets by its rule: marked first for blade raiders', () => {
    const s = arena(['enemy.raider_blade']);
    s.combat!.combatants.push({ uid: 'p1', side: 'player', defId: 'character.prabu', protagonist: false, hp: 30, rank: 2, size: 1, statuses: [{ kind: 'mark', rounds: 2 }], deathsDoor: false, corpse: false });
    for (let seed = 1; seed <= 30; seed++) {
      s.rngState = seed;
      const d = decide(s, fighter(s, 'e0'), content);
      if (d.kind === 'ability' && d.abilityId === 'ability.raider_cut') expect(d.target).toBe('p1');
    }
  });

  it('never stalls: fights where Prabu only passes always end', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = createNewGame(content, seed);
      startFight(s, { enemies: [{ enemyId: 'enemy.raider_blade', min: 1, max: 1 }, { enemyId: 'enemy.raider_bow', min: 1, max: 1 }, { enemyId: 'enemy.wild_dog', min: 1, max: 2 }] }, content, []);
      let state = s;
      for (let turn = 0; turn < 300 && !state.dead && !state.combat?.result; turn++) state = ok(state, { type: 'combat.act', action: 'pass' }).state;
      expect(state.dead).toBe(true);
    }
  });
});

describe('fleeing, loot and the survival game', () => {
  it('flee chance: 50%, +25 with nothing in the enemy front rank, −15 hurt, −15 loaded', () => {
    const s = arena(['enemy.t_dummy']);
    expect(fleeChance(s, content)).toBe(50);
    fighter(s, 'e0').corpse = true;
    expect(fleeChance(s, content)).toBe(75);
    s.survival.health = 20;
    addItems(s, 'item.firewood', 13, content);
    expect(fleeChance(s, content)).toBe(45);
  });

  it('winning hands out loot (merged) and half the arrows shot, and passes a minute a round', () => {
    const s = arena(['enemy.wild_dog', 'enemy.wild_dog'], (g) => { g.inventory.weapon = 'item.bow'; addItems(g, 'item.arrow', 5, content); });
    s.combat!.combatants.forEach((c) => { if (c.side === 'enemy') c.hp = 1; });
    s.combat!.round = 3;
    let state = s;
    for (let i = 0; i < 20 && !state.combat!.result; i++) {
      const target = state.combat!.combatants.find((c) => c.side === 'enemy' && !c.corpse)!.uid;
      state = use(state, 'ability.shoot', target).state;
    }
    const result = state.combat!.result!;
    expect(result.outcome).toBe('won');
    expect(result.found).toContainEqual({ itemId: 'item.raw_meat', count: 2 });
    const arrowsBack = result.found.find((f) => f.itemId === 'item.arrow')?.count ?? 0;
    expect(arrowsBack).toBe(Math.floor(state.combat!.arrowsShot / 2));
    expect(has(state, 'item.arrow')).toBe(5 - state.combat!.arrowsShot + arrowsBack);
    expect(state.clockMinutes).toBe(START + state.combat!.round);
    expect(ok(state, { type: 'combat.close' }).state.combat).toBeNull();
  });

  it('a critical hit on Prabu injures him', () => {
    let injured = false;
    for (let seed = 1; seed <= 300 && !injured; seed++) {
      const s = arena(['enemy.t_dummy'], () => {}, seed);
      const crit = variant((c) => { c.enemies['enemy.t_dummy'] = { ...c.enemies['enemy.t_dummy']!, stats: { ...c.enemies['enemy.t_dummy']!.stats, critRate: 100 } }; });
      performAbility(s, fighter(s, 'e0'), crit.abilities['ability.dog_bite']!, 'p0', crit, []);
      injured = s.survival.injured;
    }
    expect(injured).toBe(true);
  });
});

describe('saves (D-069)', () => {
  it('a fight saved mid-turn reloads to the same turn, formation and statuses', () => {
    const s = createNewGame(content, 4);
    startFight(s, { enemies: [{ enemyId: 'enemy.raider_blade', min: 1, max: 1 }, { enemyId: 'enemy.raider_bow', min: 1, max: 1 }] }, content, []);
    applyStatus(s, fighter(s, 'p0'), { kind: 'bleed', amount: 2, rounds: 3, chance: 300 }, content);
    const loaded = loadSave(JSON.parse(JSON.stringify(createSave(s, 'x'))), content);
    if (!loaded.ok) throw new Error(loaded.error);
    expect(loaded.save.gameState).toEqual(s);
    expect(ok(loaded.save.gameState, { type: 'combat.act', action: 'pass' }).state).toEqual(ok(s, { type: 'combat.act', action: 'pass' }).state);
  });

  it('migrates a v8 band fight into a formation: nearest first, the dead counted for loot, Prabu to act', () => {
    const v8 = createNewGame(content, 1) as unknown as Record<string, unknown>;
    v8.combat = {
      enemies: [{ id: 'enemy.raider_bow', hp: 20, band: 'far' }, { id: 'enemy.wild_dog', hp: 0, band: 'close' }, { id: 'enemy.wild_dog', hp: 7, band: 'mid' }],
      round: 3, order: [-1], aimed: false, arrowsShot: 2, log: [], result: null,
    };
    const r = loadSave({ saveVersion: 8, createdAt: 'x', gameState: v8 }, content);
    if (!r.ok) throw new Error(r.error);
    const c = r.save.gameState.combat!;
    expect(c.combatants.map((x) => [x.defId, x.rank, x.hp])).toEqual([['character.prabu', 1, 100], ['enemy.wild_dog', 1, 7], ['enemy.raider_bow', 2, 20]]);
    expect(c).toMatchObject({ round: 3, queue: ['p0'], turnStarted: true, defeated: ['enemy.wild_dog'], arrowsShot: 2 });
    expect(err(r.save.gameState, { type: 'combat.act', action: 'pass' })).toBe('ok');
  });
});

describe('an encounter end to end', () => {
  it('Prabu with the spear against a blade raider, a bow raider and a dog: abilities, statuses, AI and the end', () => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      let s = createNewGame(content, seed);
      s.inventory.weapon = 'item.bamboo_spear';
      addItems(s, 'item.cloth_bandage', 2, content);
      startFight(s, { enemies: [{ enemyId: 'enemy.wild_dog', min: 1, max: 1 }, { enemyId: 'enemy.raider_blade', min: 1, max: 1 }, { enemyId: 'enemy.raider_bow', min: 1, max: 1 }] }, content, []);
      for (let turn = 0; turn < 200 && !s.dead && !s.combat?.result; turn++) {
        const me = s.combat!.combatants.find((c) => c.protagonist)!;
        const thrust = content.abilities['ability.thrust']!;
        const targets = validTargets(s, me, thrust).filter((c) => !c.corpse);
        s = targets.length && !abilityBlocked(s, me, thrust, content)
          ? use(s, 'ability.thrust', targets[0]!.uid).state
          : ok(s, { type: 'combat.act', action: 'pass' }).state;
      }
      outcomes.add(s.dead ? 'died' : s.combat!.result!.outcome);
      expect(s.dead || Boolean(s.combat?.result)).toBe(true);
    }
    expect(outcomes.has('won')).toBe(true);
  });
});

describe('the bow raider alone in front (P-023)', () => {
  it('punches with bare hands from rank 1, weak as Prabu’s fists, and never instead of shooting from further back', () => {
    const start = createNewGame(base, 3);
    start.introSeen = true;
    const r = applyCommand(start, { type: 'debug.fight', enemies: [{ enemyId: 'enemy.raider_bow', count: 1 }], ambush: false }, base);
    if (!r.ok) throw new Error(r.error.message);
    const archer = r.state.combat!.combatants.find((c) => c.side === 'enemy')!;
    expect(archer.rank).toBe(1);
    for (let i = 0; i < 20; i++) expect(decide(r.state, archer, base)).toMatchObject({ kind: 'ability', abilityId: 'ability.raider_punch' });
    const punch = base.abilities['ability.raider_punch']!;
    expect(punch.usableFrom).toEqual([1]);
    // (4–7 + ATK 0) × 0.4 → about 2–3, like Prabu's bare fists (1–3).
    expect(punch.damage).toBe(0.4);
  });
});
