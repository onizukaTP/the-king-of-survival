import type { Content } from '../../../content/loader';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import type { GameState } from '../../core/state';
import { startFight } from '../combat/combat';
import { openEvent } from '../events/events';
import { stowFinds } from '../inventory/inventory';
import { ridden } from '../vehicles/ridden';

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

/** Gives items into the pack; what would go past 50 kg is left on the ground here. */
export function debugItem(state: GameState, itemId: string, count: number, content: Content): CommandResult {
  if (!content.items[itemId]) return fail('bad_item', `Unknown item ${itemId}.`);
  if (!Number.isInteger(count) || count < 1 || count > 100) return fail('bad_item', 'Give between 1 and 100.');
  stowFinds(state, [{ itemId, count }], content);
  return { ok: true, state, events: [{ type: 'items_taken', count: 1 }] };
}

/** Parks a new vehicle here, in full repair and with a full tank. Unlike finds, he may own several of a kind. */
export function debugVehicle(state: GameState, vehicleId: string, content: Content): CommandResult {
  const def = content.vehicles.byId[vehicleId];
  if (!def) return fail('bad_item', `Unknown vehicle ${vehicleId}.`);
  state.vehicles.seq += 1;
  const uid = `v${state.vehicles.seq}`;
  const { lat, lon } = state.player.position;
  state.vehicles.list.push({ uid, vehicleId, lat, lon, durability: def.durability ? 100 : null, fuel: def.fuel ? def.fuel.tankLitres : null, cargo: [] });
  return { ok: true, state, events: [{ type: 'vehicle_found', vehicleId, uid }] };
}

/** Multiplies every XP gain from now on (owner, 2026-11-27), to try levels quickly. 0 to 100; 1 is normal. */
export function debugXpMultiplier(state: GameState, multiplier: number): CommandResult {
  if (!Number.isFinite(multiplier) || multiplier < 0 || multiplier > 100) return fail('bad_choice', 'The XP multiplier goes from 0 to 100.');
  state.progression.xpMultiplier = multiplier;
  return { ok: true, state, events: [] };
}

/** Sets the ridden vehicle's durability and fuel, to try wear, breakdowns and an empty tank. */
export function debugVehicleState(state: GameState, durability: number | null, fuel: number | null, content: Content): CommandResult {
  const v = ridden(state);
  const def = v && content.vehicles.byId[v.vehicleId];
  if (!v || !def) return fail('no_vehicle', 'Prabu isn\'t riding anything.');
  if (durability !== null && v.durability !== null) v.durability = Math.max(0, Math.min(100, durability));
  if (fuel !== null && v.fuel !== null && def.fuel) v.fuel = Math.max(0, Math.min(def.fuel.tankLitres, fuel));
  return { ok: true, state, events: [] };
}
