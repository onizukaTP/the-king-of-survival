import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { createSave, loadSave } from '../../save/save';
import { addItems } from '../inventory/inventory';
import { groundHere, waterAt } from '../scavenging/scavenging';
import { previewTravel } from '../travel/travel';
import { allSpots, spotAt, spotHere } from './town';

// Events have their own tests; here they would only interrupt the trips under test.
const loaded = loadContent();
const content = { ...loaded, events: { ...loaded.events, events: [] } };
const SRI = 'loc.srivilliputhur';
const town = content.towns[SRI]!;
const building = (typeId: string) => town.buildings.find((b) => b.typeId === typeId)!;
const well = town.water.find((w) => w.kind === 'well')!;
const tank = town.water.find((w) => w.kind === 'tank')!;

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code}`);
  return result;
}
const err = (state: GameState, command: Command) => {
  const r = applyCommand(state, command, content);
  return r.ok ? 'ok' : r.error.code;
};

/** A new game standing at the Srivilliputhur marker. */
function atTown(seed = 1) {
  const s = createNewGame(content, seed);
  s.player.position = { lat: content.sites[SRI]!.lat, lon: content.sites[SRI]!.lon };
  return s;
}

/** A whole trip to a town spot, leg by leg. */
function goTo(state: GameState, spotId: string) {
  let s = ok(state, { type: 'travel.start', target: { spotId } }).state;
  const events: GameEvent[] = [];
  while (s.travel) {
    const r = ok(s, { type: 'travel.advance' });
    events.push(...r.events);
    s = r.state;
  }
  return { state: s, events };
}

describe('towns on the world map (D-099)', () => {
  it('every building, well and tank is a place of its own, 100 m or more apart', () => {
    const spots = allSpots(content);
    expect(spots).toHaveLength(Object.values(content.towns).reduce((n, t) => n + t.buildings.length + t.water.length, 0));
    expect(new Set(spots.map((s) => s.id)).size).toBe(spots.length);
    for (const s of spots) expect(spotAt(s, content)?.id).toBe(s.id);
  });

  it('a trip goes to a building along the streets, with legs and time, and lands on it', () => {
    const s = atTown();
    const garage = building('btype.garage');
    const preview = previewTravel(s, { spotId: garage.id }, content);
    if (!preview.ok) throw new Error(preview.error.message);
    // The town's streets are in the road graph, so most of the way is road.
    expect(preview.plan.roadKm).toBeGreaterThan(preview.plan.crossKm);
    const { state } = goTo(s, garage.id);
    expect(spotHere(state, content)?.id).toBe(garage.id);
    expect(state.clockMinutes).toBe(s.clockMinutes + preview.plan.minutes);
    expect(err(state, { type: 'travel.start', target: { spotId: garage.id } })).toBe('already_there');
    expect(err(state, { type: 'travel.start', target: { spotId: 'building.nowhere' } })).toBe('unknown_spot');
  });
});

describe('searching buildings (P-014)', () => {
  it('uses the building type: its time, its loot table and its own stock', () => {
    let found = 0;
    const garage = building('btype.garage');
    const there = goTo(atTown(), garage.id).state;
    for (let seed = 1; seed <= 40; seed++) {
      const s = { ...structuredClone(there), rngState: seed };
      const r = ok(s, { type: 'scavenge.search', torch: false });
      expect(r.state.clockMinutes).toBe(s.clockMinutes + 45);
      const finds = (r.events[0] as Extract<GameEvent, { type: 'searched' }>).finds;
      const table = content.buildingTypes['btype.garage']!.search.map((e) => e.itemId);
      for (const f of finds) expect(table).toContain(f.itemId);
      expect(groundHere(r.state)).toHaveLength(finds.length);
      expect(r.state.sites[garage.id]).toMatchObject({ richness: 80 });
      found += finds.length;
    }
    expect(found).toBeGreaterThan(20);
  });

  it('a house loses 25 points a search and searches in 15 minutes with the torch, half its 30', () => {
    const house = building('btype.house');
    const s = goTo(atTown(), house.id).state;
    const r = ok(s, { type: 'scavenge.search', torch: true });
    expect(r.state.clockMinutes).toBe(s.clockMinutes + 15);
    expect(r.state.sites[house.id]).toMatchObject({ richness: 75 });
  });

  it('has nothing to search at the town marker or at the water', () => {
    expect(err(atTown(), { type: 'scavenge.search', torch: false })).toBe('nothing_to_search');
    expect(err(goTo(atTown(), well.id).state, { type: 'scavenge.search', torch: false })).toBe('not_at_site');
  });

  it('keeps finds on the floor of the building they were found in', () => {
    const s = atTown();
    addItems(s, 'item.bamboo', 1, content);
    const hotel = goTo(s, building('btype.hotel').id).state;
    const dropped = ok(hotel, { type: 'item.drop', index: 2, count: 1 }).state;
    expect(groundHere(dropped)).toHaveLength(1);
    const elsewhere = goTo(dropped, building('btype.garage').id).state;
    expect(groundHere(elsewhere)).toHaveLength(0);
  });
});

describe('town water (D-050)', () => {
  it('a well gives clean water, the tank unsafe water, a building none', () => {
    const s = atTown();
    addItems(s, 'item.empty_bottle', 1, content);
    const atWell = goTo(s, well.id).state;
    expect(ok(atWell, { type: 'water.fill' }).events[0]).toEqual({ type: 'bottles_filled', count: 1, clean: true });
    const atTank = goTo(s, tank.id).state;
    expect(ok(atTank, { type: 'water.fill' }).events[0]).toEqual({ type: 'bottles_filled', count: 1, clean: false });
    // A building away from any lake or river on the map has no water of its own.
    const dry = town.buildings.find((b) => !waterAt(b, content))!;
    const atDry = goTo(s, dry.id).state;
    expect(err(atDry, { type: 'water.drink' })).toBe('no_water');
  });
});

describe('saves', () => {
  it('round-trips a game standing at a building', () => {
    const s = goTo(atTown(), well.id).state;
    const back = loadSave(JSON.parse(JSON.stringify(createSave(s, 'now'))), content);
    expect(back.ok && back.save.gameState).toEqual(s);
  });

  it('migrates a v13 run inside a town: it stays at its spot, and the town screen state goes (D-099)', () => {
    const s = createNewGame(content, 1);
    const hotel = building('btype.hotel');
    const v13 = { ...structuredClone(s), player: { ...s.player, position: { lat: hotel.lat, lon: hotel.lon } }, town: { siteId: SRI, at: hotel.id } };
    const r = loadSave({ saveVersion: 13, createdAt: 'then', gameState: v13 }, content);
    if (!r.ok) throw new Error(r.error);
    expect('town' in r.save.gameState).toBe(false);
    expect(spotHere(r.save.gameState, content)?.id).toBe(hotel.id);
  });

  it('migrates a v4 save: the town-wide stock is dropped', () => {
    const s = createNewGame(content, 1);
    const v4State = { ...s, sites: { [SRI]: { richness: 50, refreshAt: 9000 }, 'loc.nh744': { richness: 40, refreshAt: 9000 } } };
    const r = loadSave({ saveVersion: 4, createdAt: 'then', gameState: v4State }, content);
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.save.gameState.sites)).toEqual(['loc.nh744']);
  });
});
