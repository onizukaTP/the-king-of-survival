import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { createSave, loadSave } from '../../save/save';
import { addItems } from '../inventory/inventory';
import { groundHere } from '../scavenging/scavenging';
import { distanceKm } from '../travel/geo';
import { townSpots, walkMinutes } from './town';

const content = loadContent();
// Tests count from the run's start time (D-075), not a fixed hour.
const START = content.newGame.startClockMinutes;
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

/** A new game standing at Srivilliputhur, inside its town map. */
function inTown(seed = 1) {
  const s = createNewGame(content, seed);
  s.player.position = { lat: content.sites[SRI]!.lat, lon: content.sites[SRI]!.lon };
  return ok(s, { type: 'town.enter' }).state;
}

describe('entering and leaving a town (P-014)', () => {
  it('enters at the edge and leaves to the town point, both for no time', () => {
    const s = inTown();
    expect(s.town).toEqual({ siteId: SRI, at: 'edge' });
    expect(s.clockMinutes).toBe(START);
    const left = ok(s, { type: 'town.leave' }).state;
    expect(left.town).toBeNull();
    expect(left.player.position).toEqual({ lat: content.sites[SRI]!.lat, lon: content.sites[SRI]!.lon });
    expect(left.clockMinutes).toBe(START);
  });

  it('leaves only from the edge of town (D-053)', () => {
    const walked = ok(inTown(), { type: 'town.walk', spotId: building('btype.hotel').id }).state;
    expect(err(walked, { type: 'town.leave' })).toBe('not_at_edge');
    const back = ok(walked, { type: 'town.walk', spotId: 'edge' }).state;
    expect(back.clockMinutes).toBeGreaterThan(walked.clockMinutes);
    expect(ok(back, { type: 'town.leave' }).state.town).toBeNull();
  });

  it('leaves from a north, south, east or west end at that end on the world map (D-054)', () => {
    for (const town of Object.values(content.towns)) {
      expect(town.ends.map((e) => e.name)).toEqual(['North end', 'South end', 'East end', 'West end']);
    }
    const end = content.towns[SRI]!.ends.find((e) => e.name === 'West end')!;
    const there = ok(inTown(), { type: 'town.walk', spotId: end.id }).state;
    const left = ok(there, { type: 'town.leave' }).state;
    expect(left.town).toBeNull();
    expect(left.player.position).toEqual({ lat: end.lat, lon: end.lon });
    expect(left.player.position.lon).toBeLessThan(content.sites[SRI]!.lon);
  });

  it('refuses away from a town, twice, or while travelling; no world travel from inside', () => {
    const home = createNewGame(content, 1);
    expect(err(home, { type: 'town.enter' })).toBe('no_town_here');
    expect(err(home, { type: 'town.leave' })).toBe('not_in_town');
    expect(err(home, { type: 'town.walk', spotId: 'edge' })).toBe('not_in_town');
    const s = inTown();
    expect(err(s, { type: 'town.enter' })).toBe('in_town');
    expect(err(s, { type: 'travel.start', target: { siteId: 'loc.home' } })).toBe('in_town');
  });
});

describe('walking in a town', () => {
  it('takes the straight-line distance at road speed and lands on the spot', () => {
    const s = inTown();
    const target = building('btype.place_of_worship');
    const r = ok(s, { type: 'town.walk', spotId: target.id });
    const km = distanceKm(content.sites[SRI]!, target);
    expect(r.state.clockMinutes).toBe(START + Math.round((km / 4.5) * 60));
    expect(r.state.player.position).toEqual({ lat: target.lat, lon: target.lon });
    expect(r.state.town!.at).toBe(target.id);
    expect(r.events.at(-1)).toEqual({ type: 'walked', spotId: target.id });
    expect(err(r.state, { type: 'town.walk', spotId: target.id })).toBe('already_there');
    expect(err(r.state, { type: 'town.walk', spotId: 'building.mdu_airport' })).toBe('unknown_spot');
  });

  it('stops part-way after a leg in which a meter fell low (D-035)', () => {
    // Madurai's edge to its airport is a walk of over two hours.
    const s = createNewGame(content, 1);
    s.player.position = { lat: content.sites['loc.madurai']!.lat, lon: content.sites['loc.madurai']!.lon };
    const entered = ok(s, { type: 'town.enter' }).state;
    entered.survival.water = 26;
    const r = ok(entered, { type: 'town.walk', spotId: 'building.mdu_airport' });
    expect(r.events).toContainEqual({ type: 'travel_stopped', reason: 'meter' });
    expect(r.state.town!.at).toBeNull();
    expect(r.state.clockMinutes).toBe(START + 30);
    // He can walk on from where he stopped.
    expect(err(r.state, { type: 'town.walk', spotId: 'building.mdu_airport' })).toBe('ok');
  });
});

describe('searching buildings (P-014)', () => {
  it('uses the building type: its time, its loot table and its own stock', () => {
    let found = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const garage = building('btype.garage');
      const s = ok(inTown(seed), { type: 'town.walk', spotId: garage.id }).state;
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

  it('a house loses 25 points a search and searches in 25 minutes with the torch', () => {
    const house = building('btype.house');
    const s = ok(inTown(), { type: 'town.walk', spotId: house.id }).state;
    const r = ok(s, { type: 'scavenge.search', torch: true });
    expect(r.state.clockMinutes).toBe(s.clockMinutes + 25);
    expect(r.state.sites[house.id]).toMatchObject({ richness: 75 });
  });

  it('has nothing to search at the edge or at the water', () => {
    const s = inTown();
    expect(err(s, { type: 'scavenge.search', torch: false })).toBe('not_at_site');
    expect(err(ok(s, { type: 'town.walk', spotId: well.id }).state, { type: 'scavenge.search', torch: false })).toBe('not_at_site');
  });

  it('keeps finds on the floor of the building they were found in', () => {
    const s = inTown();
    addItems(s, 'item.bamboo', 1, content);
    const hotel = ok(s, { type: 'town.walk', spotId: building('btype.hotel').id }).state;
    const dropped = ok(hotel, { type: 'item.drop', index: 2, count: 1 }).state;
    expect(groundHere(dropped)).toHaveLength(1);
    const elsewhere = ok(dropped, { type: 'town.walk', spotId: building('btype.garage').id }).state;
    expect(groundHere(elsewhere)).toHaveLength(0);
  });
});

describe('town water (D-050)', () => {
  it('a well gives clean water, the tank unsafe water, a building none', () => {
    const s = inTown();
    addItems(s, 'item.empty_bottle', 1, content);
    const atWell = ok(s, { type: 'town.walk', spotId: well.id }).state;
    expect(ok(atWell, { type: 'water.fill' }).events[0]).toEqual({ type: 'bottles_filled', count: 1, clean: true });
    const atTank = ok(s, { type: 'town.walk', spotId: tank.id }).state;
    expect(ok(atTank, { type: 'water.fill' }).events[0]).toEqual({ type: 'bottles_filled', count: 1, clean: false });
    const atHotel = ok(s, { type: 'town.walk', spotId: building('btype.hotel').id }).state;
    expect(err(atHotel, { type: 'water.drink' })).toBe('no_water');
  });
});

describe('town data', () => {
  it('every spot is reachable and walks take at least a minute', () => {
    for (const t of Object.values(content.towns)) {
      const spots = townSpots(t, content);
      expect(new Set(spots.map((s) => s.id)).size).toBe(spots.length);
      for (const s of spots) expect(walkMinutes(spots[0]!, s, content)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('saves (v5)', () => {
  it('round-trips a game inside a town, and rejects an unknown spot', () => {
    const s = ok(inTown(), { type: 'town.walk', spotId: well.id }).state;
    const loaded = loadSave(JSON.parse(JSON.stringify(createSave(s, 'now'))), content);
    expect(loaded.ok && loaded.save.gameState).toEqual(s);
    const bad = createSave({ ...s, town: { siteId: SRI, at: 'building.nowhere' } }, 'now');
    expect(loadSave(bad, content)).toMatchObject({ ok: false });
  });

  it('migrates a v4 save: no town, and the town-wide stock is dropped', () => {
    const s = createNewGame(content, 1);
    const v4State: Partial<GameState> = { ...s, sites: { [SRI]: { richness: 50, refreshAt: 9000 }, 'loc.nh744': { richness: 40, refreshAt: 9000 } } };
    delete v4State.town;
    const loaded = loadSave({ saveVersion: 4, createdAt: 'then', gameState: v4State }, content);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.save.gameState.town).toBeNull();
      expect(Object.keys(loaded.save.gameState.sites)).toEqual(['loc.nh744']);
    }
  });
});
