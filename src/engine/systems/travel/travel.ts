import type { Content } from '../../../content/loader';
import type { Site } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import type { GameState, MapState } from '../../core/state';
import { distanceKm, insideOutline, samplePath, type LatLon } from './geo';
import { zoneShare } from '../survival/radiation';
import { passTime } from '../survival/survival';
import { planRoute, type RoutePlan } from './route';

export type TravelTarget = { siteId: string } | { point: LatLon };

// Within this distance Prabu counts as being at a place.
const AT_PLACE_KM = 0.05;
// Spacing of the points that clear fog and find sites along a leg.
const REVEAL_STEP_KM = 1;
// Revealed points are kept one per ~1 km grid cell, so the saved fog stays small.
const FOG_CELL_DEG = 0.01;

export const fogCell = (p: LatLon) => `${Math.round(p.lat / FOG_CELL_DEG)},${Math.round(p.lon / FOG_CELL_DEG)}`;

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });

export function siteAt(position: LatLon, content: Content): Site | undefined {
  return Object.values(content.sites).find((s) => distanceKm(position, s) < AT_PLACE_KM);
}

/** Clears fog around `points` and discovers any site within sight (D-018). Mutates `map`, which is always a copy. */
function reveal(map: MapState, points: LatLon[], content: Content, events: GameEvent[]) {
  const cells = new Set(map.revealed.map(fogCell));
  for (const p of points) {
    // Cell from the stored (rounded) point, so reloading and re-checking always agree.
    const stored = { lat: Math.round(p.lat * 1000) / 1000, lon: Math.round(p.lon * 1000) / 1000 };
    const cell = fogCell(stored);
    if (cells.has(cell)) continue;
    cells.add(cell);
    map.revealed.push(stored);
  }
  for (const site of Object.values(content.sites)) {
    if (map.discoveredSiteIds.includes(site.id)) continue;
    if (points.some((p) => distanceKm(p, site) <= content.world.sightRadiusKm)) {
      map.discoveredSiteIds.push(site.id);
      events.push({ type: 'site_discovered', siteId: site.id });
    }
  }
}

/** Known places (D-017) plus whatever is in sight of the start position. */
export function initialMap(position: LatLon, content: Content): MapState {
  const map: MapState = {
    discoveredSiteIds: Object.values(content.sites).filter((s) => s.knownAtStart).map((s) => s.id),
    revealed: [],
  };
  reveal(map, [position], content, []);
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
    if (!site || !state.map.discoveredSiteIds.includes(site.id)) return fail('unknown_site', 'Prabu doesn\'t know that place.');
    destination = { lat: site.lat, lon: site.lon };
    siteId = site.id;
  } else {
    destination = target.point;
    if (!insideOutline(destination, content.outline)) return fail('outside_world', 'That\'s outside Tamil Nadu.');
  }
  if (distanceKm(state.player.position, destination) < AT_PLACE_KM) return fail('already_there', 'Prabu is already here.');
  const plan = planRoute(state.player.position, destination, content);
  if (!plan.legs.length) return fail('no_route', 'No way to get there.');
  return { ok: true, destination, siteId, plan };
}

export function startTravel(state: GameState, target: TravelTarget, content: Content): CommandResult {
  const preview = previewTravel(state, target, content);
  if (!preview.ok) return preview;
  state.travel = { destination: preview.destination, siteId: preview.siteId, legs: preview.plan.legs, nextLeg: 0 };
  return { ok: true, state, events: [{ type: 'travel_started', legs: preview.plan.legs.length }] };
}

/** Resolves one leg instantly (D-010): move, pass the leg's time (survival drain), clear fog, discover. */
export function advanceTravel(state: GameState, content: Content): CommandResult {
  const travel = state.travel;
  const leg = travel?.legs[travel.nextLeg];
  if (!travel || !leg) return fail('not_travelling', 'Prabu isn\'t travelling.');
  const events: GameEvent[] = [];
  state.player.position = leg.path[leg.path.length - 1]!;
  passTime(state, leg.minutes, 'travel', content, events, zoneShare(leg.path, content));
  reveal(state.map, samplePath(leg.path, REVEAL_STEP_KM), content, events);
  travel.nextLeg += 1;
  events.unshift({ type: 'leg_completed', leg: travel.nextLeg, of: travel.legs.length });
  if (state.dead) {
    state.travel = null;
  } else if (travel.nextLeg >= travel.legs.length) {
    state.travel = null;
    events.push({ type: 'arrived', siteId: travel.siteId });
  } else if (events.some((e) => e.type === 'meter_low')) {
    // D-035: a falling meter ends the trip at the end of this leg so the player can react.
    state.travel = null;
    events.push({ type: 'travel_stopped', reason: 'meter' });
  }
  return { ok: true, state, events };
}

/** Drops the remaining legs; Prabu stays where the last leg ended. */
export function stopTravel(state: GameState): CommandResult {
  if (!state.travel) return fail('not_travelling', 'Prabu isn\'t travelling.');
  state.travel = null;
  return { ok: true, state, events: [{ type: 'travel_stopped', reason: 'player' }] };
}
