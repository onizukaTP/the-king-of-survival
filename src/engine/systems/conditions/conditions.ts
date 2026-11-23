import type { Content } from '../../../content/loader';
import type { GameEvent } from '../../core/commands';
import { maxHealth, type GameState, type SurvivalState } from '../../core/state';

/** The combined effect of every condition Prabu has (D-061). */
export function conditionEffects(s: SurvivalState, content: Content) {
  const fx = { speed: 1, restDrain: 1, healthPerHour: 0, searchTime: 1, blocksHealing: false };
  for (const c of s.conditions) {
    const def = content.conditions[c.id];
    if (!def) continue;
    fx.speed *= def.speedMultiplier ?? 1;
    fx.restDrain *= def.restDrainMultiplier ?? 1;
    fx.healthPerHour += def.healthPerHour ?? 0;
    fx.searchTime *= def.searchTimeMultiplier ?? 1;
    fx.blocksHealing ||= Boolean(def.blocksHealing);
  }
  return fx;
}

export const hasCondition = (s: SurvivalState, id: string) => s.conditions.some((c) => c.id === id);

/** Gives a condition; having it already restarts its timer (no stacking). Mutates `state`. */
export function addCondition(state: GameState, id: string, content: Content, events: GameEvent[]) {
  const def = content.conditions[id]!;
  const s = state.survival;
  const until = def.minutes === null ? null : state.clockMinutes + def.minutes;
  const had = s.conditions.find((c) => c.id === id);
  if (had) had.until = until;
  else s.conditions.push({ id, until });
  s.health = Math.min(s.health, maxHealth(s, content));
  if (!had) events.push({ type: 'condition_added', conditionId: id });
}

export function removeCondition(state: GameState, id: string, events: GameEvent[]) {
  const s = state.survival;
  if (!hasCondition(s, id)) return;
  s.conditions = s.conditions.filter((c) => c.id !== id);
  events.push({ type: 'condition_ended', conditionId: id });
}

/** Drops conditions whose time is up. Returns whether any ended. Mutates `state`. */
export function expireConditions(state: GameState, events: GameEvent[]): boolean {
  const ended = state.survival.conditions.filter((c) => c.until !== null && c.until <= state.clockMinutes);
  for (const c of ended) removeCondition(state, c.id, events);
  return ended.length > 0;
}

/** Health can't rise while injured (D-039) or with an infected wound (D-061). */
export const healingBlocked = (s: SurvivalState, content: Content) => s.injured || conditionEffects(s, content).blocksHealing;
