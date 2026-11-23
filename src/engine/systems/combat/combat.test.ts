import { describe, expect, it } from 'vitest';
import { loadContent, type Content } from '../../../content/loader';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { createSave, loadSave } from '../../save/save';
import { addCondition, hasCondition } from '../conditions/conditions';
import { addItems } from '../inventory/inventory';
import { attackOdds, fleeChance, startFight } from './combat';
import { playerStats } from './stats';

const content = loadContent();
const quiet: Content = { ...content, events: { ...content.events, events: [] } };

function ok(state: GameState, command: Command, c: Content = content) {
  const result = applyCommand(state, command, c);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code} ${result.error.message}`);
  return result;
}
const err = (state: GameState, command: Command) => {
  const r = applyCommand(state, command, content);
  return r.ok ? 'ok' : r.error.code;
};
const has = (s: GameState, itemId: string) => s.inventory.stacks.filter((st) => st.itemId === itemId).reduce((n, st) => n + st.count, 0);

type Spec = { enemyId: string; min: number; max: number };
/** A game in a fight, waiting for Prabu's turn. `change` runs before the fight starts. */
function fighting(enemies: Spec[], seed = 1, change: (s: GameState) => void = () => {}, ambush = false) {
  const s = createNewGame(content, seed);
  change(s);
  const events: GameEvent[] = [];
  startFight(s, { enemies, ambush }, content, events);
  return { s, events };
}
const dog = (n = 1): Spec => ({ enemyId: 'enemy.wild_dog', min: n, max: n });
const boar: Spec = { enemyId: 'enemy.mutated_boar', min: 1, max: 1 };
/** Puts every enemy in a band and gives them lots of HP, so one attack can be studied. */
const pin = (s: GameState, band: 'close' | 'mid' | 'far', hp = 999) => s.combat!.enemies.forEach((e) => { e.band = band; e.hp = hp; });
const attack = (s: GameState, target = 0) => ok(s, { type: 'combat.act', action: 'attack', target });
const equip = (s: GameState, itemId: string) => { s.inventory.weapon = itemId; };

describe('stats (D-065, D-066)', () => {
  it('are Prabu\'s base plus what the weapon adds', () => {
    const s = createNewGame(content, 1);
    expect(playerStats(s, content)).toEqual({ atk: 2, def: 0, spd: 5, critRate: 10, critDamage: 150, acc: 85, dodge: 10, hunting: 40, luck: 0 });
    equip(s, 'item.bow');
    expect(playerStats(s, content)).toMatchObject({ spd: 4, critRate: 10, hunting: 55 });
    equip(s, 'item.bamboo_spear');
    expect(playerStats(s, content)).toMatchObject({ acc: 90, hunting: 50 });
  });
});

describe('a fight', () => {
  it('starts from the Fight choice: the card gives way to the fight, which waits for Prabu', () => {
    const s = createNewGame(content, 3);
    s.event = { id: 'event.wild_dogs', result: null };
    const r = ok(s, { type: 'event.choose', choiceId: 'fight' });
    expect(r.state.event).toBeNull();
    const c = r.state.combat!;
    expect(c.enemies.length).toBeGreaterThanOrEqual(2);
    expect(c.enemies.length).toBeLessThanOrEqual(4);
    expect(c.enemies.every((e) => e.id === 'enemy.wild_dog')).toBe(true);
    expect(r.events).toContainEqual({ type: 'combat_started', enemies: c.enemies.length });
    expect(c.order[0]).toBe(-1);
    expect(err(r.state, { type: 'rest', minutes: 60 })).toBe('in_combat');
    expect(err(r.state, { type: 'combat.close' })).toBe('bad_choice');
  });

  it('an ambush starts at Close and the enemies take the whole first round', () => {
    const { s } = fighting([{ enemyId: 'enemy.raider_blade', min: 2, max: 2 }], 1, () => {}, true);
    expect(s.combat!.round).toBe(2);
    expect(s.combat!.log.filter((l) => l.actor >= 0).length).toBeGreaterThanOrEqual(2);
  });

  it('weapons reach their bands: the knife only Close, the spear Mid, the bow anything with arrows', () => {
    const { s } = fighting([dog()]);
    pin(s, 'mid');
    expect(err(s, { type: 'combat.act', action: 'attack', target: 0 })).toBe('out_of_reach');
    equip(s, 'item.bamboo_spear');
    expect(err(s, { type: 'combat.act', action: 'attack', target: 0 })).toBe('ok');
    pin(s, 'far');
    equip(s, 'item.bow');
    expect(err(s, { type: 'combat.act', action: 'attack', target: 0 })).toBe('no_arrows');
    addItems(s, 'item.arrow', 3, content);
    expect(has(attack(s).state, 'item.arrow')).toBe(2);
    expect(err(s, { type: 'combat.act', action: 'attack', target: 7 })).toBe('bad_target');
  });

  it('damage: weapon roll + ATK, ×1.5 on a crit, less the target\'s DEF; Weak takes off 25%', () => {
    const seen = (target: string, change: (s: GameState) => void = () => {}) => {
      const out = { plain: new Set<number>(), crit: new Set<number>() };
      for (let seed = 1; seed <= 150; seed++) {
        const { s } = fighting([{ enemyId: target, min: 1, max: 1 }], seed, change);
        if (s.dead || s.combat!.order[0] !== -1) continue;
        pin(s, 'close');
        const hit = attack(s).state.combat!.log.find((l) => l.actor === -1 && l.kind === 'hit');
        if (hit) (hit.crit ? out.crit : out.plain).add(hit.damage!);
      }
      return { plain: [...out.plain].sort((a, b) => a - b), crit: [...out.crit].sort((a, b) => a - b) };
    };
    const dogs = seen('enemy.wild_dog');
    expect(dogs.plain).toEqual([6, 7, 8, 9]);
    expect(dogs.crit.every((d) => d >= 9 && d <= 14)).toBe(true);
    expect(seen('enemy.mutated_boar').plain.every((d) => d >= 5 && d <= 8)).toBe(true);
    expect(seen('enemy.wild_dog', (g) => addCondition(g, 'condition.weak', content, [])).plain.every((d) => d >= 5 && d <= 7)).toBe(true);
  });

  it('aiming adds ACC +15 and crit +10 to the next attack, then wears off', () => {
    const { s } = fighting([dog()]);
    pin(s, 'close');
    const before = attackOdds(s, 0, content);
    const aimed = ok(s, { type: 'combat.act', action: 'aim' }).state;
    if (aimed.combat!.order[0] !== -1) return;
    expect(attackOdds(aimed, 0, content)).toEqual({ hit: Math.min(95, before.hit + 15), crit: before.crit + 10 });
    expect(attackOdds(attack(aimed).state, 0, content)).toEqual(before);
  });

  it('closing in and stepping back move the bands; melee enemies come back in', () => {
    const { s } = fighting([dog(2)]);
    pin(s, 'far');
    const closer = ok(s, { type: 'combat.act', action: 'close_in', target: 0 }).state;
    expect(closer.combat!.log[0]).toMatchObject({ actor: -1, kind: 'move', band: 'mid' });
    expect(err(s, { type: 'combat.act', action: 'step_back' })).toBe('bad_target');
    pin(s, 'close');
    const back = ok(s, { type: 'combat.act', action: 'step_back' }).state;
    expect(back.combat!.log[0]).toMatchObject({ kind: 'step_back' });
    // The dogs then come one band nearer on their turns.
    expect(back.combat!.log.filter((l) => l.kind === 'move' && l.actor >= 0).length).toBeGreaterThan(0);
  });

  it('flee chance: 50%, +10 from Mid, +25 from Far, −15 hurt, −15 loaded, kept 10–90', () => {
    const { s } = fighting([dog()]);
    pin(s, 'close');
    expect(fleeChance(s, content)).toBe(50);
    pin(s, 'mid');
    expect(fleeChance(s, content)).toBe(60);
    pin(s, 'far');
    expect(fleeChance(s, content)).toBe(75);
    s.survival.health = 20;
    addItems(s, 'item.firewood', 13, content);
    expect(fleeChance(s, content)).toBe(45);
  });

  it('fleeing ends the fight when it works; when it fails every enemy in reach gets a free hit', () => {
    let fled = false;
    let failed = false;
    for (let seed = 1; seed <= 40 && !(fled && failed); seed++) {
      const { s } = fighting([dog(2)], seed);
      if (s.combat!.order[0] !== -1) continue;
      pin(s, 'close', 12);
      const r = ok(s, { type: 'combat.act', action: 'flee' });
      if (r.state.combat!.result?.outcome === 'fled') {
        fled = true;
        expect(r.events).toContainEqual({ type: 'combat_ended', outcome: 'fled' });
        expect(ok(r.state, { type: 'combat.close' }).state.combat).toBeNull();
      } else {
        failed = true;
        const log = r.state.combat!.log;
        expect(log[0]).toMatchObject({ actor: -1, kind: 'flee_failed' });
        expect(log.slice(1, 3).every((l) => l.actor >= 0 && (l.kind === 'hit' || l.kind === 'miss'))).toBe(true);
      }
    }
    expect(fled && failed).toBe(true);
  });

  it('winning hands out the loot and half the arrows; the trip can carry on', () => {
    const { s } = fighting([dog()], 2, (g) => {
      equip(g, 'item.bow');
      addItems(g, 'item.arrow', 4, content);
    });
    s.combat!.enemies[0]!.hp = 1;
    s.combat!.arrowsShot = 3;
    let state = s;
    for (let i = 0; i < 10 && !state.combat!.result; i++) state = attack(state).state;
    expect(state.combat!.result?.outcome).toBe('won');
    expect(state.combat!.result!.found).toContainEqual({ itemId: 'item.raw_meat', count: 1 });
    expect(has(state, 'item.raw_meat')).toBe(1);
    expect(state.combat!.result!.found.find((f) => f.itemId === 'item.arrow')!.count).toBe(Math.floor(state.combat!.arrowsShot / 2));
    expect(ok(state, { type: 'combat.close' }).events).toEqual([{ type: 'combat_closed' }]);
  });

  it('a critical hit injures; a dirty dog bite can infect; dying ends the run', () => {
    let injured = false;
    let infected = false;
    for (let seed = 1; seed <= 400 && !(injured && infected); seed++) {
      const { s } = fighting([dog(4)], seed, () => {}, true);
      if (s.combat!.log.some((l) => l.crit && l.target === -1)) {
        injured ||= s.survival.injured;
        infected ||= hasCondition(s.survival, 'condition.infected_wound');
      }
    }
    expect(injured && infected).toBe(true);
    const { s, events } = fighting([{ enemyId: 'enemy.raider_blade', min: 2, max: 2 }], 1, (g) => (g.survival.health = 3), true);
    expect(s.dead).toBe(true);
    expect(events).toContainEqual({ type: 'died', cause: 'killed' });
  });

  it('each round passes a minute', () => {
    const { s } = fighting([dog()]);
    pin(s, 'far');
    const r = ok(s, { type: 'combat.act', action: 'aim' }).state;
    expect(r.combat!.round).toBeGreaterThan(s.combat!.round);
    expect(r.clockMinutes - s.clockMinutes).toBe(r.combat!.round - s.combat!.round);
  });

  it('survives a reload mid-fight; a v7 save loads with no fight', () => {
    const { s } = fighting([dog(3)]);
    const loaded = loadSave(JSON.parse(JSON.stringify(createSave(s, 'x'))), content);
    if (!loaded.ok) throw new Error(loaded.error);
    expect(loaded.save.gameState).toEqual(s);
    const v7: Record<string, unknown> = { ...createNewGame(content, 1) };
    delete v7.combat;
    const old = loadSave({ saveVersion: 7, createdAt: 'x', gameState: v7 }, content);
    expect(old.ok && old.save.gameState.combat).toBeNull();
    expect(loadSave({ ...createSave(s, 'x'), gameState: { ...s, combat: { ...s.combat!, enemies: [{ id: 'enemy.dragon', hp: 1, band: 'far' }] } } }, content).ok).toBe(false);
  });
});

describe('hunting and luck (D-065, D-066)', () => {
  const at = (siteId: string, seed: number, change: (s: GameState) => void = () => {}) => {
    const s = createNewGame(content, seed);
    s.player.position = { lat: content.sites[siteId]!.lat, lon: content.sites[siteId]!.lon };
    change(s);
    return s;
  };
  const huntRate = (change: (s: GameState) => void = () => {}, c: Content = quiet) => {
    let meat = 0;
    let hide = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      const r = ok(at('loc.sanctuary_forest', seed, change), { type: 'scavenge.hunt' }, c);
      const finds = (r.events[0] as Extract<GameEvent, { type: 'hunted' }>).finds;
      if (finds.some((f) => f.itemId === 'item.raw_meat')) meat += 1;
      if (finds.some((f) => f.itemId === 'item.animal_hide')) hide += 1;
    }
    return { meat: meat / 2000, hide: hide / 2000 };
  };

  it('succeeds at the Hunting chance: 40% with the knife, 55% with the bow; hide on 75% of successes', () => {
    const knife = huntRate();
    expect(Math.abs(knife.meat - 0.4)).toBeLessThan(0.03);
    expect(Math.abs(knife.hide - 0.3)).toBeLessThan(0.03);
    expect(Math.abs(huntRate((s) => equip(s, 'item.bow')).meat - 0.55)).toBeLessThan(0.03);
  });

  it('Luck adds to hunting, fleeing and crits', () => {
    const lucky: Content = { ...quiet, characters: { ...quiet.characters, 'character.prabu': { ...quiet.characters['character.prabu']!, stats: { ...quiet.characters['character.prabu']!.stats, luck: 20 } } } };
    expect(Math.abs(huntRate(() => {}, lucky).meat - 0.6)).toBeLessThan(0.03);
    const { s } = fighting([dog()]);
    pin(s, 'close');
    expect(fleeChance(s, lucky)).toBe(60);
    expect(attackOdds(s, 0, lucky).crit).toBe(attackOdds(s, 0, content).crit + 5);
  });

  it('a boar can turn up while hunting, about one hunt in ten', () => {
    let boars = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const r = ok(at('loc.sanctuary_forest', seed), { type: 'scavenge.hunt' });
      if (r.state.event?.id === 'event.mutated_boar') boars += 1;
    }
    expect(Math.abs(boars / 1000 - 0.1)).toBeLessThan(0.025);
  });

  it('the boar fight', () => {
    const { s } = fighting([boar]);
    expect(s.combat!.enemies[0]).toMatchObject({ id: 'enemy.mutated_boar', hp: 30, band: 'far' });
  });
});
