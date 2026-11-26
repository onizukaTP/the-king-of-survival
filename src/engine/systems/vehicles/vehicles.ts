import type { Content } from '../../../content/loader';
import type { Vehicle } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import { nextRandom } from '../../core/rng';
import type { GameState, Stack, VehicleState } from '../../core/state';
import { carriedKg, takeOne } from '../inventory/inventory';
import { passTime } from '../survival/survival';
import { distanceKm } from '../travel/geo';
import { ridden, stacksKg } from './ridden';

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });
// Vehicles within this distance are "here" (as for ground piles).
const HERE_KM = 0.05;

function roll(state: GameState): number {
  const [value, next] = nextRandom(state.rngState);
  state.rngState = next;
  return value;
}
const between = (state: GameState, [lo, hi]: [number, number]) => Math.round((lo + roll(state) * (hi - lo)) * 10) / 10;
const nameOf = (def: Vehicle) => def.name.toLowerCase();

/** Merges a stack into a list of stacks (same item, charge and spoil time) or appends it. */
function addTo(stacks: Stack[], stack: Stack) {
  const same = stacks.find((s) => s.itemId === stack.itemId && s.charge === stack.charge && s.spoilsAt === stack.spoilsAt);
  if (same) same.count += stack.count;
  else stacks.push({ ...stack });
}

/** Vehicles parked where he stands, not counting the one he rides. */
export function vehiclesHere(state: GameState): VehicleState[] {
  const riding = state.vehicles.riding;
  return state.vehicles.list.filter((v) => v.uid !== riding && distanceKm(v, state.player.position) <= HERE_KM);
}

function park(state: GameState, v: VehicleState) {
  v.lat = state.player.position.lat;
  v.lon = state.player.position.lon;
}

function newVehicle(state: GameState, def: Vehicle, durability: number | null, fuel: number | null, cargo: Stack[] = []): VehicleState {
  state.vehicles.seq += 1;
  const v: VehicleState = { uid: `v${state.vehicles.seq}`, vehicleId: def.id, lat: 0, lon: 0, durability, fuel, cargo };
  park(state, v);
  state.vehicles.list.push(v);
  return v;
}

/**
 * Wear and fuel for the distance just moved on the vehicle he rides (D-034, P-021). Returns whether it
 * can't go on (broken or out of fuel), so a trip stops at the end of the leg.
 */
export function wearVehicle(state: GameState, roadKm: number, crossKm: number, content: Content, events: GameEvent[]): boolean {
  const v = ridden(state);
  const def = v && content.vehicles.byId[v.vehicleId];
  if (!v || !def) return false;
  let stop = false;
  if (def.durability && v.durability !== null) {
    const before = v.durability;
    v.durability = Math.max(0, Math.round((before - roadKm * def.durability.wearRoadPerKm - crossKm * def.durability.wearCrossPerKm) * 100) / 100);
    if (v.durability <= 0 && before > 0) events.push({ type: 'vehicle_broken', vehicleId: def.id });
    else if (before > content.vehicles.warnAt && v.durability <= content.vehicles.warnAt) events.push({ type: 'vehicle_worn', vehicleId: def.id });
    stop ||= v.durability <= 0;
  }
  if (def.fuel && v.fuel !== null) {
    const before = v.fuel;
    v.fuel = Math.max(0, Math.round((before - roadKm / def.fuel.kmPerLitreRoad - crossKm / def.fuel.kmPerLitreCross) * 100) / 100);
    if (v.fuel <= 0 && before > 0) events.push({ type: 'out_of_fuel', vehicleId: def.id });
    stop ||= v.fuel <= 0;
  }
  return stop;
}

/**
 * One roll per search for a vehicle (P-021), scaled like the other finds by how stripped the place is and
 * by Luck. `key` is the building type or site searched. He owns at most one of each kind.
 */
export function rollVehicleFind(state: GameState, key: string, factor: number, content: Content, events: GameEvent[]) {
  const owned = new Set(state.vehicles.list.map((v) => v.vehicleId));
  const pool = Object.values(content.vehicles.byId).flatMap((def) => {
    const f = def.finds.find((x) => x.at === key);
    return f && !owned.has(def.id) ? [{ def, chance: f.chance * factor }] : [];
  });
  if (!pool.length) return;
  const r = roll(state);
  let acc = 0;
  for (const { def, chance } of pool) {
    acc += chance;
    if (r >= acc) continue;
    const v = newVehicle(state, def, def.durability ? between(state, def.durability.foundAt) : null, def.fuel ? between(state, def.fuel.foundWith) : null);
    events.push({ type: 'vehicle_found', vehicleId: def.id, uid: v.uid });
    return;
  }
}

/** Gets on a vehicle parked here; the one he was riding stays parked here. */
export function boardVehicle(state: GameState, uid: string, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t change vehicles while travelling.');
  const v = vehiclesHere(state).find((x) => x.uid === uid);
  if (!v) return fail('not_here', 'That vehicle isn\'t here.');
  const was = ridden(state);
  if (was) park(state, was);
  state.vehicles.riding = v.uid;
  return { ok: true, state, events: [{ type: 'vehicle_boarded', vehicleId: content.vehicles.byId[v.vehicleId]!.id }] };
}

/** Gets off and leaves the vehicle parked here, with its cargo, for good (P-021). */
export function leaveVehicle(state: GameState): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t get off while travelling.');
  const v = ridden(state);
  if (!v) return fail('no_vehicle', 'Prabu isn\'t riding anything.');
  park(state, v);
  state.vehicles.riding = null;
  return { ok: true, state, events: [{ type: 'vehicle_left', vehicleId: v.vehicleId }] };
}

const countIn = (stacks: Stack[], itemId: string) => stacks.reduce((n, s) => n + (s.itemId === itemId ? s.count : 0), 0);

/** Takes `count` of an item from the pack first, then from the cargo. The caller has checked there are enough. */
function takeItems(state: GameState, v: VehicleState, itemId: string, count: number) {
  for (let n = 0; n < count; n++) {
    const i = state.inventory.stacks.findIndex((s) => s.itemId === itemId);
    if (i >= 0) {
      takeOne(state.inventory, i);
      continue;
    }
    const c = v.cargo.findIndex((s) => s.itemId === itemId);
    const stack = v.cargo[c]!;
    stack.count -= 1;
    if (stack.count === 0) v.cargo.splice(c, 1);
  }
}

const hasTool = (state: GameState, itemId: string) => state.inventory.weapon === itemId || countIn(state.inventory.stacks, itemId) > 0;

/** What repairing the ridden vehicle with up to `count` scrap metal would do (P-021), or why it can't. */
export function repairPlan(state: GameState, content: Content, count = Infinity) {
  const v = ridden(state);
  const def = v && content.vehicles.byId[v.vehicleId];
  const { itemId, tool } = content.vehicles.repair;
  if (!v || !def) return { error: fail('no_vehicle', 'Prabu isn\'t riding anything.') };
  if (!def.durability || v.durability === null) return { error: fail('cannot_repair', `The ${nameOf(def)} never wears out.`) };
  if (v.durability >= 100) return { error: fail('cannot_repair', `The ${nameOf(def)} is in full repair.`) };
  if (!hasTool(state, tool)) return { error: fail('missing_item', `Needs a ${content.items[tool]!.name.toLowerCase()}.`) };
  const have = countIn(state.inventory.stacks, itemId) + countIn(v.cargo, itemId);
  const need = Math.ceil((100 - v.durability) / def.durability.repairPerItem);
  const use = Math.min(count, have, need);
  if (use < 1) return { error: fail('missing_item', `Needs ${content.items[itemId]!.name.toLowerCase()}.`) };
  return { v, def, use, minutes: use * def.durability.repairMinutes, to: Math.min(100, v.durability + use * def.durability.repairPerItem) };
}

/** Repairs the ridden vehicle with scrap metal from the pack or the cargo; the knife is kept (D-085, P-021). */
export function repairVehicle(state: GameState, count: number, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t repair while travelling.');
  if (!Number.isInteger(count) || count < 1) return fail('bad_item', 'Use at least one.');
  const plan = repairPlan(state, content, count);
  if ('error' in plan) return plan.error!;
  takeItems(state, plan.v, content.vehicles.repair.itemId, plan.use);
  const events: GameEvent[] = [];
  passTime(state, plan.minutes, 'work', content, events);
  if (state.dead) return { ok: true, state, events };
  plan.v.durability = plan.to;
  events.unshift({ type: 'vehicle_repaired', vehicleId: plan.def.id, durability: plan.to });
  return { ok: true, state, events };
}

/** Pours one can of biodiesel from the pack or the cargo into the tank (D-032, P-021). */
export function refuelVehicle(state: GameState, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t refuel while travelling.');
  const v = ridden(state);
  const def = v && content.vehicles.byId[v.vehicleId];
  if (!v || !def) return fail('no_vehicle', 'Prabu isn\'t riding anything.');
  if (!def.fuel || v.fuel === null) return fail('no_fuel_tank', `The ${nameOf(def)} takes no fuel.`);
  if (v.fuel >= def.fuel.tankLitres) return fail('tank_full', 'The tank is full.');
  const can = def.fuel.itemId;
  if (countIn(state.inventory.stacks, can) + countIn(v.cargo, can) < 1) return fail('missing_item', `Needs a ${content.items[can]!.name.toLowerCase()}.`);
  takeItems(state, v, can, 1);
  v.fuel = Math.min(def.fuel.tankLitres, v.fuel + def.fuel.litresPerItem);
  return { ok: true, state, events: [{ type: 'refuelled', vehicleId: def.id, litres: v.fuel }] };
}

/** Moves part of a pack stack into the ridden vehicle's cargo, within its capacity (P-021). */
export function loadCargo(state: GameState, index: number, count: number, content: Content): CommandResult {
  const v = ridden(state);
  const def = v && content.vehicles.byId[v.vehicleId];
  if (!v || !def) return fail('no_vehicle', 'Prabu isn\'t riding anything.');
  const stack = Number.isInteger(index) ? state.inventory.stacks[index] : undefined;
  if (!stack) return fail('bad_item', 'That item isn\'t in the pack.');
  if (!Number.isInteger(count) || count < 1 || count > stack.count) return fail('bad_item', `Load between 1 and ${stack.count}.`);
  if (stacksKg(v.cargo, content) + content.items[stack.itemId]!.weightKg * count > def.cargoKg + 1e-9) {
    return fail('cargo_full', `The ${nameOf(def)} holds ${def.cargoKg} kg.`);
  }
  addTo(v.cargo, { ...stack, count });
  stack.count -= count;
  if (stack.count === 0) state.inventory.stacks.splice(index, 1);
  return { ok: true, state, events: [{ type: 'cargo_moved', loaded: true }] };
}

/** Moves part of a cargo stack into the pack, refused past the 50 kg maximum (D-036). */
export function unloadCargo(state: GameState, index: number, count: number, content: Content): CommandResult {
  const v = ridden(state);
  if (!v) return fail('no_vehicle', 'Prabu isn\'t riding anything.');
  const stack = Number.isInteger(index) ? v.cargo[index] : undefined;
  if (!stack) return fail('bad_item', 'That isn\'t in the cargo.');
  if (!Number.isInteger(count) || count < 1 || count > stack.count) return fail('bad_item', `Unload between 1 and ${stack.count}.`);
  if (carriedKg(state.inventory, content) + content.items[stack.itemId]!.weightKg * count > content.survival.carry.maxKg + 1e-9) {
    return fail('too_heavy', `That would take Prabu past ${content.survival.carry.maxKg} kg.`);
  }
  addTo(state.inventory.stacks, { ...stack, count });
  stack.count -= count;
  if (stack.count === 0) v.cargo.splice(index, 1);
  return { ok: true, state, events: [{ type: 'cargo_moved', loaded: false }] };
}

/** Whether a vehicle recipe (the cycle trailer, D-085) can be made here now, and if not, why. */
export function buildStatus(state: GameState, def: Vehicle, content: Content): { missing: string | null; parts: VehicleState[] } {
  const build = def.build!;
  const near = [...(ridden(state) ? [ridden(state)!] : []), ...vehiclesHere(state)];
  const parts: VehicleState[] = [];
  for (const id of build.vehicles) {
    const part = near.find((v) => v.vehicleId === id && !parts.includes(v));
    if (!part) return { missing: `Needs a ${content.vehicles.byId[id]!.name.toLowerCase()} here`, parts };
    parts.push(part);
  }
  const name = (id: string) => content.items[id]!.name.toLowerCase();
  if (build.tool && !hasTool(state, build.tool)) return { missing: `Needs a ${name(build.tool)}`, parts };
  for (const i of build.inputs) {
    const short = i.count - countIn(state.inventory.stacks, i.itemId);
    if (short > 0) return { missing: `Needs ${short} more ${name(i.itemId)}`, parts };
  }
  if (stacksKg(parts.flatMap((p) => p.cargo), content) > def.cargoKg + 1e-9) return { missing: `Unload them first: the ${nameOf(def)} holds ${def.cargoKg} kg`, parts };
  return { missing: null, parts };
}

/** Makes a vehicle from others (D-085): parts and inputs used, tool kept, time passes; cargo carries over. */
export function buildVehicle(state: GameState, vehicleId: string, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t build while travelling.');
  const def = content.vehicles.byId[vehicleId];
  if (!def?.build) return fail('unknown_recipe', `Unknown vehicle recipe ${vehicleId}.`);
  const { missing, parts } = buildStatus(state, def, content);
  if (missing) return fail('missing_item', `${missing}.`);
  for (const i of def.build.inputs) {
    for (let n = 0; n < i.count; n++) takeOne(state.inventory, state.inventory.stacks.findIndex((s) => s.itemId === i.itemId));
  }
  const events: GameEvent[] = [];
  passTime(state, def.build.minutes, 'work', content, events);
  if (state.dead) return { ok: true, state, events };
  const wear = parts.map((p) => p.durability).filter((d): d is number => d !== null);
  const wasRiding = parts.some((p) => p.uid === state.vehicles.riding);
  state.vehicles.list = state.vehicles.list.filter((v) => !parts.includes(v));
  const cargo: Stack[] = [];
  for (const s of parts.flatMap((p) => p.cargo)) addTo(cargo, s);
  const made = newVehicle(state, def, def.durability ? (wear.length ? Math.min(...wear) : 100) : null, def.fuel ? 0 : null, cargo);
  state.vehicles.riding = wasRiding ? made.uid : state.vehicles.riding;
  events.unshift({ type: 'vehicle_built', vehicleId: def.id });
  return { ok: true, state, events };
}
