import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { distanceKm } from './geo';
import { planRoute } from './route';
import { fogCell, previewTravel, siteAt } from './travel';

// Events (M6) have their own tests; here they would only interrupt the trips under test.
const loaded = loadContent();
const content = { ...loaded, events: { ...loaded.events, events: [] } };
const home = { lat: 9.5599, lon: 77.6251 };

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code}`);
  return result;
}

/** Starts a trip and resolves every leg, collecting events. */
function travelAll(state: GameState, target: Extract<Command, { type: 'travel.start' }>['target']) {
  let s = ok(state, { type: 'travel.start', target }).state;
  const events: GameEvent[] = [];
  while (s.travel) {
    const r = ok(s, { type: 'travel.advance' });
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

describe('planRoute', () => {
  const town = content.sites['loc.srivilliputhur']!;

  it('cuts the trip into legs of at most legMaxMinutes that join up end to end', () => {
    const plan = planRoute(home, town, content);
    expect(plan.legs.length).toBeGreaterThan(1);
    expect(plan.legs.every((l) => l.minutes <= content.world.legMaxMinutes)).toBe(true);
    expect(plan.legs.reduce((t, l) => t + l.minutes, 0)).toBe(plan.minutes);
    expect(plan.legs[0]!.path[0]).toEqual(home);
    expect(plan.legs.at(-1)!.path.at(-1)).toEqual({ lat: town.lat, lon: town.lon });
    for (let i = 1; i < plan.legs.length; i++) expect(plan.legs[i]!.path[0]).toEqual(plan.legs[i - 1]!.path.at(-1));
  });

  it('uses roads when they are faster, and is never slower than going straight cross-country (D-009, D-019)', () => {
    const plan = planRoute(home, town, content);
    expect(plan.roadKm).toBeGreaterThan(0);
    const straightMinutes = (distanceKm(home, town) / content.world.crossCountrySpeedKmh) * 60;
    expect(plan.minutes).toBeLessThanOrEqual(Math.round(straightMinutes));
  });

  it('goes straight cross-country when there are no roads', () => {
    const plan = planRoute(home, town, { ...content, roads: { nodes: [], edges: [] } });
    expect(plan.roadKm).toBe(0);
    expect(plan.minutes).toBe(Math.round((distanceKm(home, town) / content.world.crossCountrySpeedKmh) * 60));
  });

  it('is deterministic', () => {
    expect(planRoute(home, town, content)).toEqual(planRoute(home, town, content));
  });
});

describe('travel commands', () => {
  it('moves Prabu leg by leg, advances the clock and arrives (D-010)', () => {
    const start = createNewGame(content, 1);
    const preview = previewTravel(start, { siteId: 'loc.srivilliputhur' }, content);
    if (!preview.ok) throw new Error(preview.error.code);

    let state = ok(start, { type: 'travel.start', target: { siteId: 'loc.srivilliputhur' } }).state;
    expect(state.player.position).toEqual(start.player.position);
    expect(state.clockMinutes).toBe(start.clockMinutes);

    const first = ok(state, { type: 'travel.advance' });
    expect(first.events[0]).toEqual({ type: 'leg_completed', leg: 1, of: preview.plan.legs.length });
    expect(first.state.clockMinutes).toBe(start.clockMinutes + preview.plan.legs[0]!.minutes);

    state = travelAll(start, { siteId: 'loc.srivilliputhur' }).state;
    expect(state.travel).toBeNull();
    expect(state.clockMinutes).toBe(start.clockMinutes + preview.plan.minutes);
    expect(siteAt(state.player.position, content)?.id).toBe('loc.srivilliputhur');
  });

  it('discovers places within sight along the way (D-018)', () => {
    const { state, events } = travelAll(createNewGame(content, 1), { siteId: 'loc.nh744' });
    // Rajapalayam isn't on this route's sight line; a trip towards it is what finds it.
    expect(state.map.discoveredSiteIds).not.toContain('loc.madurai');
    const toRaja = travelAll(state, { point: { lat: 9.46, lon: 77.565 } });
    expect(toRaja.state.map.discoveredSiteIds).toContain('loc.rajapalayam');
    expect(toRaja.events).toContainEqual({ type: 'site_discovered', siteId: 'loc.rajapalayam' });
    expect(events.filter((e) => e.type === 'arrived')).toEqual([{ type: 'arrived', siteId: 'loc.nh744' }]);
  });

  it('clears fog along the path and keeps one point per ~1 km cell', () => {
    const start = createNewGame(content, 1);
    const { state } = travelAll(start, { siteId: 'loc.srivilliputhur' });
    expect(state.map.revealed.length).toBeGreaterThan(start.map.revealed.length);
    const again = travelAll(travelAll(state, { siteId: 'loc.home' }).state, { siteId: 'loc.srivilliputhur' }).state;
    const cells = new Set(again.map.revealed.map(fogCell));
    expect(cells.size).toBe(again.map.revealed.length);
  });

  it('stops after the current leg and stays where that leg ended', () => {
    let state = ok(createNewGame(content, 1), { type: 'travel.start', target: { siteId: 'loc.nh744' } }).state;
    state = ok(state, { type: 'travel.advance' }).state;
    const where = state.player.position;
    const stopped = ok(state, { type: 'travel.stop' });
    expect(stopped.events).toEqual([{ type: 'travel_stopped', reason: 'player' }]);
    expect(stopped.state.travel).toBeNull();
    expect(stopped.state.player.position).toEqual(where);
  });

  it.each([
    ['an undiscovered place', { siteId: 'loc.madurai' }, 'unknown_site'],
    ['a place that does not exist', { siteId: 'loc.atlantis' }, 'unknown_site'],
    ['a point outside Tamil Nadu', { point: { lat: 12.9716, lon: 77.5946 } }, 'outside_world'],
    ['where Prabu already is', { siteId: 'loc.home' }, 'already_there'],
  ] as const)('rejects travel to %s and leaves state unchanged', (_, target, code) => {
    const state = createNewGame(content, 1);
    const before = structuredClone(state);
    const result = applyCommand(state, { type: 'travel.start', target }, content);
    expect(result.ok || result.error.code).toBe(code);
    expect(state).toEqual(before);
  });

  it('rejects starting a second trip, and advancing or stopping when not travelling', () => {
    const idle = createNewGame(content, 1);
    expect(applyCommand(idle, { type: 'travel.advance' }, content)).toMatchObject({ ok: false, error: { code: 'not_travelling' } });
    expect(applyCommand(idle, { type: 'travel.stop' }, content)).toMatchObject({ ok: false, error: { code: 'not_travelling' } });
    const moving = ok(idle, { type: 'travel.start', target: { siteId: 'loc.nh744' } }).state;
    expect(applyCommand(moving, { type: 'travel.start', target: { siteId: 'loc.srivilliputhur' } }, content)).toMatchObject({
      ok: false,
      error: { code: 'travel_in_progress' },
    });
  });

  it('allows travel to unmarked ground inside the state (D-009)', () => {
    const { state, events } = travelAll(createNewGame(content, 1), { point: { lat: 9.6, lon: 77.7 } });
    expect(distanceKm(state.player.position, { lat: 9.6, lon: 77.7 })).toBeLessThan(0.001);
    expect(events.at(-1)).toEqual({ type: 'arrived', siteId: null });
  });
});
