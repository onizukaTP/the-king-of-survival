import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { loadSave } from '../../save/save';
import { addItems, carriedKg } from '../inventory/inventory';
import { passTime } from '../survival/survival';
import { previewTravel } from '../travel/travel';
import { ridden } from './ridden';
import { rollVehicleFind, vehiclesHere } from './vehicles';

const content = loadContent();
const home = content.sites['loc.home']!;
const station = content.sites['loc.srivilliputhur_station']!;

function fresh(): GameState {
  const s = createNewGame(content, 7);
  s.introSeen = true;
  return s;
}
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code} ${result.error.message}`);
  return result;
}
function code(state: GameState, command: Command) {
  const r = applyCommand(state, command, content);
  return r.ok ? 'ok' : r.error.code;
}
/** Gives him a vehicle parked where he stands, and gets him on it unless `ride` is false. */
function give(s: GameState, vehicleId: string, opts: { durability?: number | null; fuel?: number | null; ride?: boolean } = {}) {
  const def = content.vehicles.byId[vehicleId]!;
  s.vehicles.seq += 1;
  const uid = `v${s.vehicles.seq}`;
  s.vehicles.list.push({
    uid, vehicleId, ...s.player.position, cargo: [],
    durability: opts.durability !== undefined ? opts.durability : def.durability ? 100 : null,
    fuel: opts.fuel !== undefined ? opts.fuel : def.fuel ? def.fuel.tankLitres : null,
  });
  if (opts.ride !== false) s.vehicles.riding = uid;
  return uid;
}
function travelAll(s: GameState, target: { siteId: string }) {
  let state = ok(s, { type: 'travel.start', target }).state;
  const events: GameEvent[] = [];
  while (state.travel && !state.event && !state.combat) {
    const r = ok(state, { type: 'travel.advance' });
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

describe('travel by vehicle (P-021)', () => {
  it('plans trips at the vehicle\'s speeds: the cycle is much faster than walking', () => {
    const walk = previewTravel(fresh(), { siteId: station.id }, content);
    const s = fresh();
    give(s, 'vehicle.cycle');
    const cycle = previewTravel(s, { siteId: station.id }, content);
    if (!walk.ok || !cycle.ok) throw new Error('no route');
    expect(cycle.plan.minutes).toBeLessThan(walk.plan.minutes / 2);
  });

  it('wears the vehicle by the kilometre and burns the auto\'s fuel', () => {
    const s = fresh();
    give(s, 'vehicle.auto_rickshaw');
    const { state } = travelAll(s, { siteId: station.id });
    const v = ridden(state)!;
    expect(v.durability!).toBeLessThan(100);
    expect(v.durability!).toBeGreaterThan(98);
    expect(v.fuel!).toBeLessThan(10);
    // The vehicle he rides arrives with him and isn't counted as parked there.
    expect(vehiclesHere(state)).toEqual([]);
  });

  it('stops the trip when the vehicle breaks, and won\'t start one until it is repaired', () => {
    const s = fresh();
    give(s, 'vehicle.hand_cart', { durability: 0.5 });
    const { state, events } = travelAll(s, { siteId: station.id });
    expect(events).toContainEqual({ type: 'vehicle_broken', vehicleId: 'vehicle.hand_cart' });
    expect(events).toContainEqual({ type: 'travel_stopped', reason: 'vehicle' });
    expect(state.travel).toBeNull();
    // An event may have met him at the end of the leg, so ask the preview directly.
    const again = previewTravel(state, { siteId: station.id }, content);
    expect(again.ok || again.error.code).toBe('cannot_move');
  });

  it('stops the auto when the tank runs dry', () => {
    const s = fresh();
    give(s, 'vehicle.auto_rickshaw', { fuel: 0.05 });
    const { events } = travelAll(s, { siteId: station.id });
    expect(events).toContainEqual({ type: 'out_of_fuel', vehicleId: 'vehicle.auto_rickshaw' });
  });

  it('pushing a hand cart drains faster; riding the bullock cart doesn\'t', () => {
    const drain = (vehicleId?: string) => {
      const s = fresh();
      if (vehicleId) give(s, vehicleId);
      passTime(s, 60, 'travel', content, []);
      return 100 - s.survival.food;
    };
    expect(drain('vehicle.hand_cart')).toBeCloseTo(drain() * 1.25);
    expect(drain('vehicle.bullock_cart')).toBeCloseTo(drain());
  });

  it('the bullock cart never wears', () => {
    const s = fresh();
    give(s, 'vehicle.bullock_cart');
    const { state } = travelAll(s, { siteId: station.id });
    expect(ridden(state)!.durability).toBeNull();
  });
});

describe('getting on and off (P-021)', () => {
  it('parks the vehicle where he gets off, and he can get back on there', () => {
    const s = fresh();
    const uid = give(s, 'vehicle.cycle');
    const off = ok(s, { type: 'vehicle.leave' }).state;
    expect(off.vehicles.riding).toBeNull();
    expect(vehiclesHere(off).map((v) => v.uid)).toEqual([uid]);
    const on = ok(off, { type: 'vehicle.board', uid }).state;
    expect(on.vehicles.riding).toBe(uid);
  });

  it('can\'t get on a vehicle parked somewhere else', () => {
    const s = fresh();
    const uid = give(s, 'vehicle.cycle', { ride: false });
    s.vehicles.list[0]!.lat = station.lat;
    s.vehicles.list[0]!.lon = station.lon;
    expect(code(s, { type: 'vehicle.board', uid })).toBe('not_here');
  });
});

describe('cargo (P-021)', () => {
  it('loads from the pack within the vehicle\'s capacity and unloads back', () => {
    const s = fresh();
    give(s, 'vehicle.cycle');
    addItems(s, 'item.firewood', 6, content);
    const i = s.inventory.stacks.findIndex((x) => x.itemId === 'item.firewood');
    expect(code(s, { type: 'cargo.load', index: i, count: 6 })).toBe('cargo_full');
    const loaded = ok(s, { type: 'cargo.load', index: i, count: 5 }).state;
    expect(ridden(loaded)!.cargo).toEqual([{ itemId: 'item.firewood', count: 5 }]);
    expect(carriedKg(loaded.inventory, content)).toBeCloseTo(carriedKg(s.inventory, content) - 10);
    const back = ok(loaded, { type: 'cargo.unload', index: 0, count: 2 }).state;
    expect(ridden(back)!.cargo).toEqual([{ itemId: 'item.firewood', count: 3 }]);
  });

  it('takes ground piles straight into the cargo', () => {
    const s = fresh();
    give(s, 'vehicle.hand_cart');
    s.ground.push({ itemId: 'item.firewood', count: 20, lat: home.lat, lon: home.lon, expiresAt: s.clockMinutes + 100 });
    const taken = ok(s, { type: 'ground.take', indexes: [0], toCargo: true }).state;
    expect(ridden(taken)!.cargo).toEqual([{ itemId: 'item.firewood', count: 20 }]);
    expect(taken.ground).toEqual([]);
  });

  it('food in the cargo spoils like food in the pack', () => {
    const s = fresh();
    give(s, 'vehicle.hand_cart');
    ridden(s)!.cargo.push({ itemId: 'item.raw_meat', count: 1, spoilsAt: s.clockMinutes + 10 });
    const events: GameEvent[] = [];
    passTime(s, 20, 'work', content, events);
    expect(ridden(s)!.cargo).toEqual([]);
    expect(events).toContainEqual({ type: 'item_spoiled', itemId: 'item.raw_meat', count: 1 });
  });
});

describe('repairs and fuel (D-085, P-021)', () => {
  it('repairs with scrap metal from the pack or the cargo, with the knife, taking time', () => {
    const s = fresh();
    give(s, 'vehicle.cycle', { durability: 45 });
    addItems(s, 'item.scrap_metal', 1, content);
    ridden(s)!.cargo.push({ itemId: 'item.scrap_metal', count: 5 });
    const r = ok(s, { type: 'vehicle.repair', count: 10 });
    // 45 → 100 needs 3 scrap metal at +20 each, 30 minutes each; the pack's one goes first.
    expect(ridden(r.state)!.durability).toBe(100);
    expect(r.state.clockMinutes - s.clockMinutes).toBe(90);
    expect(r.state.inventory.stacks.some((x) => x.itemId === 'item.scrap_metal')).toBe(false);
    expect(ridden(r.state)!.cargo).toEqual([{ itemId: 'item.scrap_metal', count: 3 }]);
  });

  it('refuses without scrap metal, without the knife, at full repair, and for the bullock cart', () => {
    const s = fresh();
    give(s, 'vehicle.cycle', { durability: 50 });
    expect(code(s, { type: 'vehicle.repair', count: 1 })).toBe('missing_item');
    addItems(s, 'item.scrap_metal', 1, content);
    s.inventory.weapon = null;
    expect(code(s, { type: 'vehicle.repair', count: 1 })).toBe('missing_item');
    const full = fresh();
    give(full, 'vehicle.cycle');
    expect(code(full, { type: 'vehicle.repair', count: 1 })).toBe('cannot_repair');
    const bull = fresh();
    give(bull, 'vehicle.bullock_cart');
    expect(code(bull, { type: 'vehicle.repair', count: 1 })).toBe('cannot_repair');
  });

  it('a can of biodiesel adds 5 litres, up to the 10-litre tank', () => {
    const s = fresh();
    give(s, 'vehicle.auto_rickshaw', { fuel: 7 });
    addItems(s, 'item.biodiesel', 2, content);
    const r = ok(s, { type: 'vehicle.refuel' }).state;
    expect(ridden(r)!.fuel).toBe(10);
    expect(code(r, { type: 'vehicle.refuel' })).toBe('tank_full');
  });
});

describe('the cycle trailer (D-085)', () => {
  it('joins the cycle and the hand cart into one vehicle, with the lower durability and both cargos', () => {
    const s = fresh();
    give(s, 'vehicle.cycle', { durability: 60 });
    const cart = give(s, 'vehicle.hand_cart', { durability: 40, ride: false });
    s.vehicles.list.find((v) => v.uid === cart)!.cargo.push({ itemId: 'item.bamboo', count: 2 });
    addItems(s, 'item.coir_rope', 2, content);
    addItems(s, 'item.scrap_metal', 1, content);
    const r = ok(s, { type: 'vehicle.build', vehicleId: 'vehicle.cycle_trailer' });
    const v = ridden(r.state)!;
    expect(r.state.vehicles.list).toHaveLength(1);
    expect(v).toMatchObject({ vehicleId: 'vehicle.cycle_trailer', durability: 40, cargo: [{ itemId: 'item.bamboo', count: 2 }] });
    expect(r.state.clockMinutes - s.clockMinutes).toBe(60);
  });

  it('needs both vehicles here', () => {
    const s = fresh();
    give(s, 'vehicle.cycle');
    addItems(s, 'item.coir_rope', 2, content);
    addItems(s, 'item.scrap_metal', 1, content);
    expect(code(s, { type: 'vehicle.build', vehicleId: 'vehicle.cycle_trailer' })).toBe('missing_item');
  });
});

describe('finding vehicles (P-021)', () => {
  it('finds one of the kinds found at that place, once per kind, with found-at durability', () => {
    const s = fresh();
    const events: GameEvent[] = [];
    // A factor this large makes the roll certain.
    rollVehicleFind(s, 'btype.garage', 1000, content, events);
    expect(events).toHaveLength(1);
    const v = s.vehicles.list[0]!;
    const def = content.vehicles.byId[v.vehicleId]!;
    expect(def.finds.some((f) => f.at === 'btype.garage')).toBe(true);
    expect(v.durability!).toBeGreaterThanOrEqual(def.durability!.foundAt[0]);
    expect(v.durability!).toBeLessThanOrEqual(def.durability!.foundAt[1]);
    expect(s.vehicles.riding).toBeNull();
    // Now owned: that kind is no longer found.
    for (let i = 0; i < 5; i++) rollVehicleFind(s, 'btype.garage', 1000, content, events);
    expect(new Set(s.vehicles.list.map((x) => x.vehicleId)).size).toBe(s.vehicles.list.length);
  });

  it('rolls nothing where no vehicle is found', () => {
    const s = fresh();
    const rng = s.rngState;
    rollVehicleFind(s, 'btype.medical_store', 1000, content, []);
    expect(s.rngState).toBe(rng);
  });
});

describe('save v11 (M10)', () => {
  it('migrates a v10 run to no charms and no vehicles', () => {
    const v10 = structuredClone(fresh()) as unknown as Record<string, unknown> & { inventory: Record<string, unknown> };
    delete v10.vehicles;
    delete v10.inventory.charms;
    const result = loadSave({ saveVersion: 10, createdAt: 'x', gameState: v10 }, content);
    if (!result.ok) throw new Error(result.error);
    expect(result.save.gameState.vehicles).toEqual({ list: [], riding: null, seq: 0 });
    expect(result.save.gameState.inventory.charms).toEqual([]);
  });
});
