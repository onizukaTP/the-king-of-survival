import type { Content } from '../../../content/loader';
import type { BuildingType, Town } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import type { GameState } from '../../core/state';
import { passTime } from '../survival/survival';
import { distanceKm, lerp, type LatLon } from '../travel/geo';
import { siteAt } from '../travel/travel';

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });

/** Where Prabu enters and leaves a town: its site point on the world map. */
export const TOWN_EDGE = 'edge';

export type Spot =
  | { kind: 'edge'; id: string; name: string; lat: number; lon: number }
  | { kind: 'building'; id: string; name: string; lat: number; lon: number; type: BuildingType }
  | { kind: 'water'; id: string; name: string; lat: number; lon: number; water: 'well' | 'tank' };

/** Every place on a town map Prabu can walk to (P-014). */
export function townSpots(town: Town, content: Content): Spot[] {
  const site = content.sites[town.siteId]!;
  return [
    { kind: 'edge', id: TOWN_EDGE, name: 'Edge of town', lat: site.lat, lon: site.lon },
    ...town.buildings.map((b) => ({ kind: 'building' as const, id: b.id, name: b.name, lat: b.lat, lon: b.lon, type: content.buildingTypes[b.typeId]! })),
    ...town.water.map((w) => ({ kind: 'water' as const, id: w.id, name: w.name, lat: w.lat, lon: w.lon, water: w.kind })),
    ...town.ends.map((e) => ({ kind: 'edge' as const, id: e.id, name: e.name, lat: e.lat, lon: e.lon })),
  ];
}

/** The spot Prabu stands at inside a town, or undefined outside towns or between spots. */
export function spotHere(state: GameState, content: Content): Spot | undefined {
  const town = state.town && content.towns[state.town.siteId];
  if (!town || !state.town?.at) return undefined;
  return townSpots(town, content).find((s) => s.id === state.town!.at);
}

/** Minutes to walk a straight line at road speed (D-019); at least one. */
export function walkMinutes(from: LatLon, to: LatLon, content: Content): number {
  return Math.max(1, Math.round((distanceKm(from, to) / content.world.roadSpeedKmh) * 60));
}

/** Enter the town map at the town's edge. Costs no time (P-014). */
export function enterTown(state: GameState, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t enter a town while travelling.');
  if (state.town) return fail('in_town', 'Prabu is already in a town.');
  const site = siteAt(state.player.position, content);
  if (!site || !content.towns[site.id]) return fail('no_town_here', 'There\'s no town here.');
  state.town = { siteId: site.id, at: TOWN_EDGE };
  state.player.position = { lat: site.lat, lon: site.lon };
  return { ok: true, state, events: [{ type: 'town_entered', siteId: site.id }] };
}

/**
 * Back to the world map for no time, only from the edge of town (D-053) or one of its
 * north, south, east and west ends, which leave him at that end's spot (D-054).
 */
export function leaveTown(state: GameState, content: Content): CommandResult {
  if (!state.town) return fail('not_in_town', 'Prabu isn\'t in a town.');
  const spot = spotHere(state, content);
  if (spot?.kind !== 'edge') return fail('not_at_edge', 'Walk to the edge of town or one of its ends to leave.');
  state.player.position = { lat: spot.lat, lon: spot.lon };
  state.town = null;
  return { ok: true, state, events: [{ type: 'town_left' }] };
}

/**
 * Walks in a straight line to a spot in the town. Like a trip (D-035), the walk is cut into
 * legs of at most legMaxMinutes and stops by itself after a leg in which a meter fell low.
 */
export function walkTo(state: GameState, spotId: string, content: Content): CommandResult {
  const town = state.town && content.towns[state.town.siteId];
  if (!town || !state.town) return fail('not_in_town', 'Prabu isn\'t in a town.');
  const spot = townSpots(town, content).find((s) => s.id === spotId);
  if (!spot) return fail('unknown_spot', 'That place isn\'t in this town.');
  if (state.town.at === spot.id) return fail('already_there', `Prabu is already at the ${spot.name.toLowerCase()}.`);

  const from = state.player.position;
  const total = walkMinutes(from, spot, content);
  const events: GameEvent[] = [];
  let walked = 0;
  while (walked < total) {
    const leg = Math.min(content.world.legMaxMinutes, total - walked);
    const before = events.length;
    passTime(state, leg, 'travel', content, events);
    walked += leg;
    if (state.dead) return { ok: true, state, events };
    if (walked < total && events.slice(before).some((e) => e.type === 'meter_low')) {
      state.player.position = lerp(from, spot, walked / total);
      state.town.at = null;
      events.push({ type: 'travel_stopped', reason: 'meter' });
      return { ok: true, state, events };
    }
  }
  state.player.position = { lat: spot.lat, lon: spot.lon };
  state.town.at = spot.id;
  events.push({ type: 'walked', spotId: spot.id });
  return { ok: true, state, events };
}
