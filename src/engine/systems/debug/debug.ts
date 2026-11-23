import type { Content } from '../../../content/loader';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import type { GameState } from '../../core/state';
import { startFight } from '../combat/combat';
import { openEvent } from '../events/events';

// Testing tools (D-068). The UI offers them only with ?debug=1; they never pass time or roll for anything else.
const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });

/** Opens any event's card now. */
export function debugEvent(state: GameState, eventId: string, content: Content): CommandResult {
  const def = content.events.events.find((e) => e.id === eventId);
  if (!def) return fail('bad_choice', `Unknown event ${eventId}.`);
  const events: GameEvent[] = [];
  openEvent(state, def, content, events);
  return { ok: true, state, events };
}

/** Starts a fight with these enemies now; an ambush puts them at Close and gives them the first round. */
export function debugFight(state: GameState, enemies: { enemyId: string; count: number }[], ambush: boolean, content: Content): CommandResult {
  const picked = enemies.filter((e) => e.count > 0);
  if (!picked.length) return fail('bad_target', 'Pick at least one enemy.');
  if (picked.some((e) => !content.enemies[e.enemyId] || !Number.isInteger(e.count) || e.count > 6)) return fail('bad_target', 'Unknown enemy or too many.');
  const events: GameEvent[] = [];
  startFight(state, { enemies: picked.map((e) => ({ enemyId: e.enemyId, min: e.count, max: e.count })), ambush }, content, events);
  return { ok: true, state, events };
}

/** Jumps the clock to the next 22:00 without passing time (no drain, no spoilage). */
export function debugNight(state: GameState): CommandResult {
  const day = 24 * 60;
  const tonight = Math.floor(state.clockMinutes / day) * day + 22 * 60;
  state.clockMinutes = tonight > state.clockMinutes ? tonight : tonight + day;
  return { ok: true, state, events: [] };
}
