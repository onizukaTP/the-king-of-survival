import type { Content } from '../../../content/loader';
import type { AbilityEffect } from '../../../content/schemas';
import type { GameEvent } from '../../core/commands';
import type { Combatant, GameState } from '../../core/state';
import { statsOf } from './fighters';
import { damage, log, roll } from './resolve';

// The status engine (D-069). Every status follows one lifecycle: apply (against the resisting stat
// from combat.json) → count down at the start of each of the holder's turns → take effect → expire
// or be cleansed. What a kind does comes from its flags in combat.json (damage a turn, skips a
// turn, changes a stat), so a new kind with those behaviours is data, not code.

/**
 * Tries to put an effect's status on a fighter. Lands when a roll beats (chance − resistance).
 * Returns whether it landed.
 */
export function applyStatus(state: GameState, target: Combatant, effect: AbilityEffect, content: Content): boolean {
  const def = content.combat.statuses[effect.kind];
  if (!def || target.corpse) return false;
  const resist = def.resist ? statsOf(state, target, content)[def.resist as keyof ReturnType<typeof statsOf>] ?? 0 : 0;
  const chance = (effect.chance ?? 100) - resist;
  if (roll(state) * 100 >= chance) {
    log(state, { kind: 'resisted', target: target.uid, status: effect.kind });
    return false;
  }
  // A stun or a mark doesn't stack: a new one replaces the old. Damage and stat changes do stack.
  if (!def.damagePerTurn && !def.modifiesStat) target.statuses = target.statuses.filter((s) => s.kind !== effect.kind);
  const status: Combatant['statuses'][number] = { kind: effect.kind, rounds: effect.rounds ?? 1 };
  if (effect.amount !== undefined) status.amount = effect.amount;
  if (effect.stat) status.stat = effect.stat;
  target.statuses.push(status);
  log(state, { kind: 'status', target: target.uid, status: effect.kind, amount: effect.amount });
  return true;
}

/** Removes damage-over-time statuses (bleed, blight). */
export function cleanse(target: Combatant, content: Content) {
  target.statuses = target.statuses.filter((s) => !content.combat.statuses[s.kind]?.damagePerTurn);
}

/**
 * The start of a fighter's turn: bleeds and blights hurt, a stun takes the turn (and leaves a short
 * guard against being stunned again), then every status counts down. Returns whether the fighter
 * loses this turn.
 */
export function startTurn(state: GameState, c: Combatant, content: Content, events: GameEvent[]): boolean {
  const kinds = content.combat.statuses;
  for (const kind of Object.keys(kinds).filter((k) => kinds[k]!.damagePerTurn)) {
    const total = c.statuses.filter((s) => s.kind === kind).reduce((n, s) => n + (s.amount ?? 0), 0);
    if (!total) continue;
    log(state, { kind: 'dot', target: c.uid, status: kind, amount: total });
    damage(state, c, total, content, events);
    if (state.dead || c.corpse || !state.combat!.combatants.includes(c)) return true;
  }
  const stunned = c.statuses.some((s) => kinds[s.kind]?.skipsTurn);
  for (const s of c.statuses) s.rounds -= 1;
  const expired = c.statuses.filter((s) => s.rounds <= 0 && !kinds[s.kind]?.skipsTurn);
  for (const s of expired) log(state, { kind: 'expired', target: c.uid, status: s.kind });
  c.statuses = c.statuses.filter((s) => s.rounds > 0 && !kinds[s.kind]?.skipsTurn);
  if (stunned) {
    log(state, { kind: 'stunned', target: c.uid });
    const guard = content.combat.stunGuard;
    const stunStat = Object.values(kinds).find((k) => k.skipsTurn)?.resist;
    if (stunStat) c.statuses.push({ kind: 'buff', stat: stunStat, amount: guard.amount, rounds: guard.rounds });
  }
  return stunned;
}
