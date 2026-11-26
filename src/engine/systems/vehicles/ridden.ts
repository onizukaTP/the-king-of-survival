import type { Content } from '../../../content/loader';
import type { Vehicle } from '../../../content/schemas';
import type { GameState, Stack, VehicleState } from '../../core/state';
import { conditionEffects } from '../conditions/conditions';

/** The vehicle he is riding, if any (M10). Kept free of other systems so travel and survival can use it. */
export function ridden(state: GameState): VehicleState | undefined {
  const uid = state.vehicles.riding;
  return uid ? state.vehicles.list.find((v) => v.uid === uid) : undefined;
}

export function riddenDef(state: GameState, content: Content): Vehicle | undefined {
  const v = ridden(state);
  return v && content.vehicles.byId[v.vehicleId];
}

/** Road and cross-country speeds in km/h: the vehicle's, or walking (D-019, P-021). */
export function travelSpeeds(state: GameState, content: Content) {
  const def = riddenDef(state, content);
  return def ? { road: def.roadKmh, cross: def.crossKmh } : { road: content.world.roadSpeedKmh, cross: content.world.crossCountrySpeedKmh };
}

/** A sprained ankle slows him on foot and on what he moves himself (hand cart, cycle), not in the auto or the bullock cart. */
export function speedFactor(state: GameState, content: Content): number {
  const def = riddenDef(state, content);
  return !def || def.effort > 1 ? conditionEffects(state.survival, content).speed : 1;
}

export const stacksKg = (stacks: Stack[], content: Content) =>
  Math.round(stacks.reduce((kg, s) => kg + content.items[s.itemId]!.weightKg * s.count, 0) * 1000) / 1000;

/** Why the vehicle he rides can't move now (broken, empty tank), or null. */
export function cannotMove(state: GameState, content: Content): string | null {
  const v = ridden(state);
  const def = v && content.vehicles.byId[v.vehicleId];
  if (!v || !def) return null;
  const name = def.name.toLowerCase();
  if (v.durability !== null && v.durability <= 0) return `The ${name} is broken. Repair it or get off.`;
  if (v.fuel !== null && v.fuel <= 0) return `The ${name} has no fuel. Refuel it or get off.`;
  return null;
}
