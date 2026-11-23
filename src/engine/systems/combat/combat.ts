import type { Content } from '../../../content/loader';
import type { Band, EventOutcome } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import { nextRandom } from '../../core/rng';
import type { CombatLog, GameState } from '../../core/state';
import { addCondition, conditionEffects } from '../conditions/conditions';
import { applyItem, carriedKg, stowFinds, takeOne } from '../inventory/inventory';
import type { Find } from '../scavenging/scavenging';
import { passTime } from '../survival/survival';
import { playerStats, weaponProfile } from './stats';

export type CombatAction = 'attack' | 'aim' | 'close_in' | 'step_back' | 'use_item' | 'flee';

const PRABU = -1;
const BANDS: Band[] = ['close', 'mid', 'far'];
const rank = (b: Band) => BANDS.indexOf(b);
const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });

function roll(state: GameState): number {
  const [value, next] = nextRandom(state.rngState);
  state.rngState = next;
  return value;
}
const between = (state: GameState, [min, max]: readonly [number, number]) => min + Math.floor(roll(state) * (max - min + 1));
const clampHit = (chance: number, content: Content) => Math.min(content.combat.hitChance[1], Math.max(content.combat.hitChance[0], chance));

/** Damage after crit, armour (capped) and any multiplier; a hit always does at least 1. */
function damage(base: number, crit: boolean, critDamage: number, def: number, multiplier: number, content: Content): number {
  const afterCrit = crit ? (base * critDamage) / 100 : base;
  const afterDef = afterCrit * (1 - Math.min(Math.max(def, 0), content.combat.defCap) / 100);
  return Math.max(1, Math.round(afterDef * multiplier));
}

/** Each round every fighter rolls SPD + 1–8; highest first, Prabu first on a tie (D-065). */
function rollOrder(state: GameState, content: Content, withPrabu: boolean): number[] {
  const c = state.combat!;
  const sides = content.combat.dieSides;
  const fighters = [
    ...(withPrabu ? [{ who: PRABU, spd: playerStats(state, content).spd }] : []),
    ...c.enemies.flatMap((e, i) => (e.hp > 0 ? [{ who: i, spd: content.enemies[e.id]!.spd }] : [])),
  ];
  return fighters
    .map((f) => ({ who: f.who, score: f.spd + 1 + Math.floor(roll(state) * sides) }))
    .sort((a, b) => b.score - a.score || a.who - b.who)
    .map((f) => f.who);
}

/** Starts a fight from an event outcome, then plays the enemies' turns until Prabu acts (M7). */
export function startFight(state: GameState, fight: NonNullable<EventOutcome['fight']>, content: Content, events: GameEvent[]) {
  const enemies: { id: string; hp: number; band: Band }[] = [];
  for (const spec of fight.enemies) {
    const def = content.enemies[spec.enemyId]!;
    const count = between(state, [spec.min, spec.max]);
    for (let n = 0; n < count; n++) {
      const band = fight.ambush ? 'close' : def.start[Math.floor(roll(state) * def.start.length)]!;
      enemies.push({ id: def.id, hp: def.hp, band });
    }
  }
  state.combat = { enemies, round: 1, order: [], aimed: false, arrowsShot: 0, log: [], result: null };
  // An ambush gives the enemies the whole first round.
  state.combat.order = rollOrder(state, content, !fight.ambush);
  events.push({ type: 'combat_started', enemies: enemies.length });
  runUntilPrabu(state, content, events);
}

/** Enemies act in turn order; rounds roll over (1 minute each) until it is Prabu's turn or the fight ends. */
function runUntilPrabu(state: GameState, content: Content, events: GameEvent[]) {
  const c = state.combat!;
  for (let guard = 0; guard < 1000; guard++) {
    if (state.dead || c.result) return;
    if (c.enemies.every((e) => e.hp <= 0)) return win(state, content, events);
    const actor = c.order[0];
    if (actor === undefined) {
      passTime(state, content.combat.minutesPerRound, 'work', content, events);
      if (state.dead) return;
      c.round += 1;
      c.order = rollOrder(state, content, true);
      continue;
    }
    if (actor === PRABU) return;
    c.order.shift();
    if (c.enemies[actor]!.hp > 0) enemyTurn(state, actor, content, events);
  }
}

function enemyTurn(state: GameState, i: number, content: Content, events: GameEvent[]) {
  const c = state.combat!;
  const e = c.enemies[i]!;
  const def = content.enemies[e.id]!;
  if (def.behaviour === 'archer' && e.band === 'close') {
    e.band = 'mid';
    c.log.push({ actor: i, kind: 'move', band: e.band });
  } else if (def.behaviour === 'melee' && e.band !== 'close') {
    e.band = BANDS[rank(e.band) - 1]!;
    c.log.push({ actor: i, kind: 'move', band: e.band });
  } else {
    enemyAttack(state, i, content, events);
  }
}

function enemyAttack(state: GameState, i: number, content: Content, events: GameEvent[]) {
  const c = state.combat!;
  const def = content.enemies[c.enemies[i]!.id]!;
  const me = playerStats(state, content);
  if (roll(state) * 100 >= clampHit(def.acc - me.dodge, content)) {
    c.log.push({ actor: i, kind: 'miss', target: PRABU });
    return;
  }
  const crit = roll(state) * 100 < def.critRate;
  const dealt = damage(between(state, def.damage), crit, def.critDamage, me.def, 1, content);
  const s = state.survival;
  s.health = Math.max(0, s.health - dealt);
  c.log.push({ actor: i, kind: 'hit', target: PRABU, damage: dealt, crit });
  if (crit) {
    // D-039: a critical hit injures him; some leave more (a dirty bite).
    s.injured = true;
    if (def.critCondition && roll(state) < def.critCondition.chance) addCondition(state, def.critCondition.conditionId, content, events);
  }
  if (s.health <= 0) {
    state.dead = true;
    state.travel = null;
    events.push({ type: 'died', cause: 'killed' });
  }
}

function win(state: GameState, content: Content, events: GameEvent[]) {
  const c = state.combat!;
  const finds: Find[] = [];
  for (const e of c.enemies) {
    for (const entry of content.enemies[e.id]!.loot) {
      if (roll(state) >= entry.chance) continue;
      const find: Find = { itemId: entry.itemId, count: between(state, [entry.min, entry.max]) };
      if (entry.charge) find.charge = between(state, entry.charge);
      finds.push(find);
    }
  }
  const ammo = weaponProfile(state, content).ammo;
  const arrows = Math.floor(c.arrowsShot * content.combat.arrowRecovery);
  if (ammo && arrows > 0) finds.push({ itemId: ammo, count: arrows });
  // One line per item: two dogs give "raw meat ×2", not two lines.
  const merged: Find[] = [];
  for (const f of finds) {
    const same = merged.find((m) => m.itemId === f.itemId && m.charge === f.charge);
    if (same) same.count += f.count;
    else merged.push({ ...f });
  }
  c.result = { outcome: 'won', ...stowFinds(state, merged, content) };
  events.push({ type: 'combat_ended', outcome: 'won' });
}

/** Chance (%) that fleeing works now (D-063, D-066). */
export function fleeChance(state: GameState, content: Content): number {
  const c = state.combat;
  const f = content.combat.flee;
  const nearest = Math.min(...(c?.enemies.filter((e) => e.hp > 0).map((e) => rank(e.band)) ?? [0]));
  let chance = f.base + (nearest === 1 ? f.mid : nearest === 2 ? f.far : 0);
  if (state.survival.health <= f.hurtAtHealth) chance += f.hurt;
  if (carriedKg(state.inventory, content) > f.loadedOverKg) chance += f.loaded;
  chance += playerStats(state, content).luck * content.combat.luck.flee;
  return Math.min(f.range[1], Math.max(f.range[0], chance));
}

/** Can Prabu's weapon reach this enemy, and does he have what it shoots? Null when he can attack. */
export function attackBlocked(state: GameState, target: number, content: Content): string | null {
  const e = state.combat?.enemies[target];
  if (!e || e.hp <= 0) return 'No such enemy';
  const w = weaponProfile(state, content);
  if (rank(e.band) > rank(w.reach)) return 'Out of reach';
  if (w.ammo && !state.inventory.stacks.some((s) => s.itemId === w.ammo)) return `No ${content.items[w.ammo]?.name.toLowerCase() ?? 'ammo'}s`;
  return null;
}

/** Prabu's hit chance and crit chance (%) against an enemy now, for the screen and the attack. */
export function attackOdds(state: GameState, target: number, content: Content) {
  const c = state.combat!;
  const e = c.enemies[target]!;
  const me = playerStats(state, content);
  const w = weaponProfile(state, content);
  const aim = c.aimed ? content.combat.aim : { acc: 0, critRate: 0 };
  const acc = me.acc + aim.acc + (e.band === 'close' ? w.accAtClose ?? 0 : 0);
  return {
    hit: clampHit(acc - content.enemies[e.id]!.dodge, content),
    crit: Math.min(100, me.critRate + aim.critRate + me.luck * content.combat.luck.critRate),
  };
}

/** Prabu's action on his turn; then the enemies act until his next turn or the end (M7). */
export function combatAct(state: GameState, action: CombatAction, target: number | undefined, index: number | undefined, content: Content): CommandResult {
  const c = state.combat;
  if (!c) return fail('not_in_combat', 'Prabu isn\'t fighting.');
  if (c.result || state.dead) return fail('bad_choice', 'The fight is over.');
  if (c.order[0] !== PRABU) return fail('bad_choice', 'It isn\'t his turn.');
  const events: GameEvent[] = [];
  const log: CombatLog[] = [];
  const enemyAt = (t: number | undefined) => (t !== undefined && Number.isInteger(t) && c.enemies[t]?.hp ? c.enemies[t] : undefined);

  switch (action) {
    case 'attack': {
      const e = enemyAt(target);
      if (!e) return fail('bad_target', 'Pick an enemy to attack.');
      const blocked = attackBlocked(state, target!, content);
      if (blocked) return fail(blocked === 'Out of reach' ? 'out_of_reach' : 'no_arrows', `${blocked}.`);
      const w = weaponProfile(state, content);
      if (w.ammo) {
        takeOne(state.inventory, state.inventory.stacks.findIndex((s) => s.itemId === w.ammo));
        c.arrowsShot += 1;
      }
      const odds = attackOdds(state, target!, content);
      c.aimed = false;
      if (roll(state) * 100 >= odds.hit) {
        log.push({ actor: PRABU, kind: 'miss', target });
        break;
      }
      const me = playerStats(state, content);
      const crit = roll(state) * 100 < odds.crit;
      const def = content.enemies[e.id]!;
      const dealt = damage(between(state, w.damage) + me.atk, crit, me.critDamage, def.def, conditionEffects(state.survival, content).damage, content);
      e.hp = Math.max(0, e.hp - dealt);
      log.push({ actor: PRABU, kind: 'hit', target, damage: dealt, crit });
      if (e.hp === 0) log.push({ actor: PRABU, kind: 'killed', target });
      break;
    }
    case 'aim':
      if (c.aimed) return fail('bad_choice', 'He is already aiming.');
      c.aimed = true;
      log.push({ actor: PRABU, kind: 'aim' });
      break;
    case 'close_in': {
      const e = enemyAt(target);
      if (!e) return fail('bad_target', 'Pick an enemy to close in on.');
      if (e.band === 'close') return fail('bad_target', 'It is already close.');
      e.band = BANDS[rank(e.band) - 1]!;
      log.push({ actor: PRABU, kind: 'move', target, band: e.band });
      break;
    }
    case 'step_back': {
      const alive = c.enemies.filter((e) => e.hp > 0);
      if (alive.every((e) => e.band === 'far')) return fail('bad_target', 'Everything is already far.');
      for (const e of alive) e.band = BANDS[Math.min(2, rank(e.band) + 1)]!;
      log.push({ actor: PRABU, kind: 'step_back' });
      break;
    }
    case 'use_item': {
      const stack = index !== undefined ? state.inventory.stacks[index] : undefined;
      const item = stack && content.items[stack.itemId];
      // Only things he can eat, drink or apply on the spot; cranking the charger takes 30 minutes.
      if (!item || item.recharges || !(item.effects || item.curesInjury)) return fail('cannot_use', 'That can\'t be used in a fight.');
      const used = applyItem(state, index!, content);
      if (!used.ok) return used;
      events.push(...used.events);
      log.push({ actor: PRABU, kind: 'item', itemId: item.id });
      break;
    }
    case 'flee': {
      if (roll(state) * 100 < fleeChance(state, content)) {
        c.log = [];
        c.result = { outcome: 'fled', found: [], left: [] };
        events.push({ type: 'combat_ended', outcome: 'fled' });
        passTime(state, content.combat.minutesPerRound, 'work', content, events);
        return { ok: true, state, events };
      }
      log.push({ actor: PRABU, kind: 'flee_failed' });
      c.log = log;
      // D-063: a failed escape gives every enemy in reach a free hit.
      c.enemies.forEach((e, i) => {
        const def = content.enemies[e.id]!;
        if (e.hp > 0 && !state.dead && (def.behaviour === 'archer' || e.band === 'close')) enemyAttack(state, i, content, events);
      });
      c.order.shift();
      runUntilPrabu(state, content, events);
      return { ok: true, state, events };
    }
    default:
      return fail('bad_choice', `Unknown action ${String(action)}.`);
  }
  c.log = log;
  c.order.shift();
  runUntilPrabu(state, content, events);
  return { ok: true, state, events };
}

/** Closes the fight's result; a trip it interrupted can carry on. */
export function closeCombat(state: GameState): CommandResult {
  if (!state.combat) return fail('not_in_combat', 'Prabu isn\'t fighting.');
  if (!state.combat.result) return fail('bad_choice', 'The fight isn\'t over.');
  state.combat = null;
  return { ok: true, state, events: [{ type: 'combat_closed' }] };
}
