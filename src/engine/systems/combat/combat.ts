import type { Content } from '../../../content/loader';
import type { EventOutcome } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import type { Combatant, GameState } from '../../core/state';
import { applyItem, carriedKg, stowFinds } from '../inventory/inventory';
import type { Find } from '../scavenging/scavenging';
import { passTime } from '../survival/survival';
import { abilityBlocked, performAbility, validTargets } from './abilities';
import { decide } from './ai';
import { abilitiesOf, hpOf, statsOf } from './fighters';
import { moveBy, RANKS } from './formation';
import { between, log, roll } from './resolve';
import { startTurn } from './statuses';
import { playerStats, weaponProfile } from './stats';

// The fight (D-069): formations, initiative, turns and the end of the fight. Rules for abilities,
// damage, statuses, movement and enemy choices live in their own modules; this one runs the loop.

export type CombatAction = 'ability' | 'move' | 'pass' | 'use_item' | 'flee';

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });
const PROTAGONIST = 'p0';

const living = (c: Combatant) => !c.corpse;
export const livingEnemies = (state: GameState) => state.combat!.combatants.filter((c) => c.side === 'enemy' && living(c));
export const combatantById = (state: GameState, uid: string | undefined) => state.combat?.combatants.find((c) => c.uid === uid);
/** The fighter whose turn it is, once its turn has begun. */
export const actingNow = (state: GameState) => (state.combat?.turnStarted ? combatantById(state, state.combat.queue[0]) : undefined);

/**
 * Initiative for a round (D-065, D-069): every fighter rolls SPD + 1–8 for each of its turns this
 * round (some enemies get two), highest first. Ties go to the player's side, then by place in the
 * formation, so the order never depends on anything but the rolls.
 */
export function rollInitiative(state: GameState, content: Content, players: boolean): string[] {
  const entries: { uid: string; score: number; side: number; rank: number }[] = [];
  for (const c of state.combat!.combatants) {
    if (!living(c) || (!players && c.side === 'player')) continue;
    const turns = c.side === 'enemy' ? content.enemies[c.defId]!.turnsPerRound ?? 1 : 1;
    const spd = statsOf(state, c, content).spd;
    for (let t = 0; t < turns; t++) {
      entries.push({ uid: c.uid, score: spd + between(state, [1, content.combat.dieSides]), side: c.side === 'player' ? 0 : 1, rank: c.rank });
    }
  }
  return entries.sort((a, b) => b.score - a.score || a.side - b.side || a.rank - b.rank).map((e) => e.uid);
}

/** Starts a fight from an event outcome or the testing tools; runs enemy turns until a player-side turn. */
export function startFight(state: GameState, fight: NonNullable<EventOutcome['fight']>, content: Content, events: GameEvent[]) {
  const enemies = fight.enemies.flatMap((spec) => Array.from({ length: between(state, [spec.min, spec.max]) }, () => content.enemies[spec.enemyId]!));
  // Enemies line up by the ranks they prefer (front-liners first); only four ranks fit.
  const span = (e: { preferredRanks: number[] }) => [Math.min(...e.preferredRanks), Math.max(...e.preferredRanks)] as const;
  enemies.sort((a, b) => span(a)[0] - span(b)[0] || span(a)[1] - span(b)[1]);
  const combatants: Combatant[] = [{
    uid: PROTAGONIST, side: 'player', defId: state.player.characterId, protagonist: true,
    hp: Math.round(state.survival.health), rank: 1, size: 1, statuses: [], deathsDoor: false, corpse: false,
  }];
  let rank = 1;
  enemies.forEach((e, i) => {
    if (rank + e.size - 1 > RANKS) return;
    combatants.push({ uid: `e${i}`, side: 'enemy', defId: e.id, protagonist: false, hp: e.hp, rank, size: e.size, statuses: [], deathsDoor: false, corpse: false });
    rank += e.size;
  });
  state.combat = { combatants, round: 1, queue: [], turnStarted: false, defeated: [], arrowsShot: 0, log: [], result: null };
  // An ambush gives the enemies the whole first round (D-063).
  state.combat.queue = rollInitiative(state, content, !fight.ambush);
  events.push({ type: 'combat_started', enemies: combatants.length - 1 });
  advance(state, content, events);
}

/** Ends the current turn. */
function endTurn(state: GameState) {
  state.combat!.queue.shift();
  state.combat!.turnStarted = false;
}

/** Runs turns until it is a player-side fighter's move, or the fight is over. */
function advance(state: GameState, content: Content, events: GameEvent[]) {
  const combat = state.combat!;
  for (let guard = 0; guard < 500; guard++) {
    if (state.dead || combat.result) return;
    if (!livingEnemies(state).length) return finish(state, 'won', content, events);
    const uid = combat.queue[0];
    if (uid === undefined) {
      combat.round += 1;
      combat.queue = rollInitiative(state, content, true);
      continue;
    }
    const c = combatantById(state, uid);
    if (!c || !living(c)) {
      endTurn(state);
      continue;
    }
    if (!combat.turnStarted) {
      combat.turnStarted = true;
      const skipped = startTurn(state, c, content, events);
      if (state.dead) return;
      if (skipped) {
        endTurn(state);
        continue;
      }
    }
    if (c.side === 'player') return;
    enemyAct(state, c, content, events);
    endTurn(state);
  }
}

function enemyAct(state: GameState, c: Combatant, content: Content, events: GameEvent[]) {
  const d = decide(state, c, content);
  if (d.kind === 'ability') performAbility(state, c, content.abilities[d.abilityId]!, d.target, content, events);
  else if (d.kind === 'move' && moveBy(state.combat!, c, d.steps)) log(state, { kind: 'move', target: c.uid, amount: c.rank });
  else log(state, { kind: 'pass', actor: c.uid });
}

/** Wins or flees: loot, arrows, time, and Prabu back on his feet if he won at Death's Door. */
function finish(state: GameState, outcome: 'won' | 'fled', content: Content, events: GameEvent[]) {
  const combat = state.combat!;
  const finds: Find[] = [];
  if (outcome === 'won') {
    for (const id of combat.defeated) {
      for (const entry of content.enemies[id]!.loot) {
        if (roll(state) >= entry.chance) continue;
        const find: Find = { itemId: entry.itemId, count: between(state, [entry.min, entry.max]) };
        if (entry.charge) find.charge = between(state, entry.charge);
        finds.push(find);
      }
    }
    const ammo = weaponProfile(state, content).ammo;
    const arrows = Math.floor(combat.arrowsShot * content.combat.arrowRecovery);
    if (ammo && arrows > 0) finds.push({ itemId: ammo, count: arrows });
  }
  // One line per item: two dogs give "raw meat ×2".
  const merged: Find[] = [];
  for (const f of finds) {
    const same = merged.find((m) => m.itemId === f.itemId && m.charge === f.charge);
    if (same) same.count += f.count;
    else merged.push({ ...f });
  }
  combat.result = { outcome, ...stowFinds(state, merged, content) };
  events.push({ type: 'combat_ended', outcome });
  // Death's Door is a fight's state: a man who walks away from it is left barely standing (D-069).
  if (state.survival.health <= 0) state.survival.health = content.combat.deathsDoor.afterFightHealth;
  for (const c of combat.combatants) c.deathsDoor = false;
  passTime(state, combat.round * content.combat.minutesPerRound, 'work', content, events);
}

/** Chance (%) that fleeing works now: easier when nothing stands in the enemy's front rank (D-063, D-069). */
export function fleeChance(state: GameState, content: Content): number {
  const f = content.combat.flee;
  let chance = f.base;
  if (!livingEnemies(state).some((c) => c.rank === 1)) chance += f.frontClear;
  if (state.survival.health <= f.hurtAtHealth) chance += f.hurt;
  if (carriedKg(state.inventory, content) > f.loadedOverKg) chance += f.loaded;
  chance += playerStats(state, content).luck * content.combat.luck.flee;
  return Math.min(f.range[1], Math.max(f.range[0], chance));
}

/**
 * A player-side fighter's move: an ability (with a target when it needs one), a step forward or
 * back, passing, using an item, or fleeing. Then the fight runs on to the next player-side turn.
 */
export function combatAct(state: GameState, action: CombatAction, opts: { abilityId?: string; target?: string; index?: number; steps?: number }, content: Content): CommandResult {
  const combat = state.combat;
  if (!combat) return fail('not_in_combat', 'Prabu isn\'t fighting.');
  if (combat.result || state.dead) return fail('bad_choice', 'The fight is over.');
  const me = actingNow(state);
  if (!me || me.side !== 'player') return fail('bad_choice', 'It isn\'t his turn.');
  const events: GameEvent[] = [];

  switch (action) {
    case 'ability': {
      const ability = abilitiesOf(state, me, content).find((a) => a.id === opts.abilityId);
      if (!ability) return fail('bad_choice', 'He doesn\'t have that ability.');
      const blocked = abilityBlocked(state, me, ability, content);
      if (blocked) return fail(blocked.startsWith('Wrong position') ? 'wrong_rank' : blocked.startsWith('No target') ? 'out_of_reach' : 'no_arrows', `${blocked}.`);
      if (ability.target.mode === 'single' && ability.target.side !== 'self') {
        const target = combatantById(state, opts.target);
        if (!target || !validTargets(state, me, ability).includes(target)) return fail('bad_target', 'Pick one of the highlighted targets.');
      }
      combat.log = [];
      performAbility(state, me, ability, opts.target, content, events);
      break;
    }
    case 'move': {
      const steps = opts.steps === 1 || opts.steps === -1 ? opts.steps : 0;
      if (!steps) return fail('bad_choice', 'Move one rank forward or back.');
      combat.log = [];
      if (!moveBy(combat, me, steps)) return fail('bad_target', 'There is no one to swap places with.');
      log(state, { kind: 'move', target: me.uid, amount: me.rank });
      break;
    }
    case 'pass':
      combat.log = [{ kind: 'pass', actor: me.uid }];
      break;
    case 'use_item': {
      const stack = opts.index !== undefined ? state.inventory.stacks[opts.index] : undefined;
      const item = stack && content.items[stack.itemId];
      // Only what he can eat, drink or apply on the spot; cranking the charger takes 30 minutes.
      if (!item || item.recharges || !(item.effects || item.curesInjury) || !me.protagonist) return fail('cannot_use', 'That can\'t be used in a fight.');
      const used = applyItem(state, opts.index!, content);
      if (!used.ok) return used;
      events.push(...used.events);
      combat.log = [{ kind: 'item', actor: me.uid, itemId: item.id }];
      // D-100: a dressing that stops bleeding clears his bleed.
      if (item.stopsBleeding) me.statuses = me.statuses.filter((st) => st.kind !== 'bleed');
      if (hpOf(state, me) > 0) me.deathsDoor = false;
      me.hp = Math.round(hpOf(state, me));
      break;
    }
    case 'flee': {
      combat.log = [];
      if (roll(state) * 100 < fleeChance(state, content)) {
        finish(state, 'fled', content, events);
        return { ok: true, state, events };
      }
      log(state, { kind: 'flee_failed', actor: me.uid });
      // D-063: a failed escape gives every enemy a free action.
      for (const e of livingEnemies(state)) {
        if (state.dead) break;
        enemyAct(state, e, content, events);
      }
      break;
    }
    default:
      return fail('bad_choice', `Unknown action ${String(action)}.`);
  }
  if (!state.dead) {
    endTurn(state);
    advance(state, content, events);
  }
  return { ok: true, state, events };
}

/** Closes the fight's result; a trip it interrupted can carry on. */
export function closeCombat(state: GameState): CommandResult {
  if (!state.combat) return fail('not_in_combat', 'Prabu isn\'t fighting.');
  if (!state.combat.result) return fail('bad_choice', 'The fight isn\'t over.');
  state.combat = null;
  return { ok: true, state, events: [{ type: 'combat_closed' }] };
}
