import type { Content } from '../../../content/loader';
import type { BuildingType } from '../../../content/schemas';
import type { GameState } from '../../core/state';
import { distanceKm, type LatLon } from '../travel/geo';

// D-099: a town's buildings, wells and tanks are places on the world map itself (M11: every generated
// settlement's too). Prabu reaches them
// with ordinary trips, and stands at one when he is within this distance (spots are 100 m+ apart).
const AT_SPOT_KM = 0.05;

export type Spot =
  | { kind: 'building'; id: string; name: string; lat: number; lon: number; townId: string; type: BuildingType; scarce: boolean }
  | { kind: 'water'; id: string; name: string; lat: number; lon: number; townId: string; water: 'well' | 'tank'; dry: boolean };

const spotsCache = new WeakMap<object, Spot[]>();

/** Every building and water spot in every town (P-014), each tagged with its town. */
export function allSpots(content: Content): Spot[] {
  let spots = spotsCache.get(content.towns);
  if (!spots) {
    spots = Object.values(content.towns).flatMap((town) => [
      ...town.buildings.map((b) => ({ kind: 'building' as const, id: b.id, name: b.name, lat: b.lat, lon: b.lon, townId: town.siteId, type: content.buildingTypes[b.typeId]!, scarce: Boolean(b.scarce) })),
      ...town.water.map((w) => ({ kind: 'water' as const, id: w.id, name: w.name, lat: w.lat, lon: w.lon, townId: town.siteId, water: w.kind, dry: Boolean(w.dry) })),
    ]);
    spotsCache.set(content.towns, spots);
  }
  return spots;
}

export const spotById = (id: string, content: Content): Spot | undefined => allSpots(content).find((s) => s.id === id);

/** The building or water spot at this point, if any. */
export function spotAt(p: LatLon, content: Content): Spot | undefined {
  return allSpots(content).find((s) => distanceKm(p, s) < AT_SPOT_KM);
}

// A point this close to a town's buildings or water counts as inside the town.
const IN_TOWN_KM = 0.3;

/** The town (its site id) whose buildings or water are around this point, if any. */
export function townAround(p: LatLon, content: Content): string | undefined {
  return allSpots(content).find((s) => distanceKm(p, s) <= IN_TOWN_KM)?.townId;
}

/** The building or water spot Prabu stands at, if any. */
export const spotHere = (state: GameState, content: Content) => spotAt(state.player.position, content);
