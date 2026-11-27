import type { Content } from '../../../content/loader';
import type { Site } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import type { GameState, MapState } from '../../core/state';
import { distanceKm, insideOutline, type LatLon } from './geo';
import { zoneShare } from '../survival/radiation';
import { crossShare, maybeEvent } from '../events/events';
import { lightTheWay } from '../night/night';
import { passTime } from '../survival/survival';
import { planRoute, type RoutePlan } from './route';
import { cannotMove, ridden, speedFactor, travelSpeeds } from '../vehicles/ridden';
import { wearVehicle } from '../vehicles/vehicles';
import { spotById, townAround } from '../town/town';

// D-099: `spotId` is a town building or water spot, now a place on the world map.
export type TravelTarget = { siteId: string } | { spotId: string } | { point: LatLon };

// Within this distance Prabu counts as being at a place.
const AT_PLACE_KM = 0.05;

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });

export function siteAt(position: LatLon, content: Content): Site | undefined {
  return Object.values(content.sites).find((s) => distanceKm(position, s) < AT_PLACE_KM);
}

/**
 * The first time Prabu stands at a place, it counts as visited (D-094: the map is open, and a first
 * visit gives the XP a discovery used to). Mutates `map`, which is always a copy.
 */
export function visit(map: MapState, position: LatLon, content: Content, events: GameEvent[]) {
  const site = siteAt(position, content);
  if (!site || map.visitedSiteIds.includes(site.id)) return;
  map.visitedSiteIds.push(site.id);
  events.push({ type: 'site_visited', siteId: site.id });
}

/** Every place is known from the start (D-094); only the start place counts as visited. */
export function initialMap(position: LatLon, content: Content): MapState {
  const map: MapState = { visitedSiteIds: [] };
  visit(map, position, content, []);
  return map;
}

export type TravelPreview =
  | { ok: true; destination: LatLon; siteId: string | null; plan: RoutePlan }
  | { ok: false; error: CommandError };

/** What a trip would cost, without changing anything. The UI shows this before the player commits. */
export function previewTravel(state: GameState, target: TravelTarget, content: Content): TravelPreview {
  if (state.travel) return fail('travel_in_progress', 'Prabu is already travelling.');
  let destination: LatLon;
  let siteId: string | null = null;
  if ('siteId' in target) {
    const site = content.sites[target.siteId];
    if (!site) return fail('unknown_site', 'There\'s no such place.');
    destination = { lat: site.lat, lon: site.lon };
    siteId = site.id;
  } else if ('spotId' in target) {
    const spot = spotById(target.spotId, content);
    if (!spot) return fail('unknown_spot', 'There\'s no such place.');
    destination = { lat: spot.lat, lon: spot.lon };
  } else {
    destination = target.point;
    if (!insideOutline(destination, content.outline)) return fail('outside_world', 'That\'s outside Tamil Nadu.');
  }
  if (distanceKm(state.player.position, destination) < AT_PLACE_KM) return fail('already_there', 'Prabu is already here.');
  const stuck = cannotMove(state, content);
  if (stuck) return fail('cannot_move', stuck);
  const plan = planRoute(state.player.position, destination, content, travelSpeeds(state, content));
  if (!plan.legs.length) return fail('no_route', 'No way to get there.');
  return { ok: true, destination, siteId, plan };
}

export function startTravel(state: GameState, target: TravelTarget, content: Content): CommandResult {
  const preview = previewTravel(state, target, content);
  if (!preview.ok) return preview;
  state.travel = { destination: preview.destination, siteId: preview.siteId, legs: preview.plan.legs, nextLeg: 0, speeds: travelSpeeds(state, content) };
  return { ok: true, state, events: [{ type: 'travel_started', legs: preview.plan.legs.length }] };
}

/** Resolves one leg instantly (D-010): move, pass the leg's time (survival drain), count a first visit. */
export function advanceTravel(state: GameState, content: Content): CommandResult {
  const travel = state.travel;
  const leg = travel?.legs[travel.nextLeg];
  if (!travel || !leg) return fail('not_travelling', 'Prabu isn\'t travelling.');
  const events: GameEvent[] = [];
  // A sprained ankle slows him (D-061), unless a vehicle carries him; the torch lights the dark part of the leg (P-015).
  const minutes = Math.max(1, Math.round(leg.minutes / speedFactor(state, content)));
  const speeds = travel.speeds ?? { road: content.world.roadSpeedKmh, cross: content.world.crossCountrySpeedKmh };
  const share = crossShare(leg, speeds);
  const unlit = lightTheWay(state, minutes, content, events);
  state.player.position = leg.path[leg.path.length - 1]!;
  passTime(state, minutes, 'travel', content, events, zoneShare(leg.path, content));
  visit(state.map, state.player.position, content, events);
  // P-021: the vehicle wears and burns fuel by the kilometre; broken or empty, it can't go on.
  const stuck = !state.dead && ridden(state) !== undefined && wearVehicle(state, leg.km * (1 - share), leg.km * share, content, events);
  travel.nextLeg += 1;
  events.unshift({ type: 'leg_completed', leg: travel.nextLeg, of: travel.legs.length });
  if (state.dead) {
    state.travel = null;
  } else if (travel.nextLeg >= travel.legs.length) {
    state.travel = null;
    events.push({ type: 'arrived', siteId: travel.siteId });
  } else if (stuck) {
    state.travel = null;
    events.push({ type: 'travel_stopped', reason: 'vehicle' });
  } else if (events.some((e) => e.type === 'meter_low')) {
    // D-035: a falling meter ends the trip at the end of this leg so the player can react.
    state.travel = null;
    events.push({ type: 'travel_stopped', reason: 'meter' });
  }
  // D-059: an event may meet him at the end of the leg; the trip waits until its card is closed.
  // A leg ending inside a town is a town walk (D-059, kept by D-099): only town events.
  const trigger = townAround(state.player.position, content) ? { on: 'walk' as const, minutes, unlit } : { on: 'travel' as const, minutes, crossShare: share, unlit };
  if (!state.dead) maybeEvent(state, trigger, content, events);
  return { ok: true, state, events };
}

/** Drops the remaining legs; Prabu stays where the last leg ended. */
export function stopTravel(state: GameState): CommandResult {
  if (!state.travel) return fail('not_travelling', 'Prabu isn\'t travelling.');
  state.travel = null;
  return { ok: true, state, events: [{ type: 'travel_stopped', reason: 'player' }] };
}
