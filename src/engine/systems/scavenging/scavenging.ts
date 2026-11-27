import type { Content } from '../../../content/loader';
import type { Water } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import { nextRandom } from '../../core/rng';
import type { GameState, Stack } from '../../core/state';
import { addStack, carriedKg, makeStack } from '../inventory/inventory';
import { passTime } from '../survival/survival';
import { distanceKm, distanceToLineKm, insideRing, type LatLon } from '../travel/geo';
import { spotHere } from '../town/town';
import { siteAt } from '../travel/travel';
import { conditionEffects } from '../conditions/conditions';
import { maybeEvent } from '../events/events';
import { playerStats } from '../combat/stats';
import { charmEffects } from '../charms/charms';
import { ridden, stacksKg } from '../vehicles/ridden';
import { rollVehicleFind } from '../vehicles/vehicles';

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });
// Ground piles within this distance count as "here" (same as being at a place).
const HERE_KM = 0.05;

export type Find = { itemId: string; count: number; charge?: number };

function roll(state: GameState): number {
  const [value, next] = nextRandom(state.rngState);
  state.rngState = next;
  return value;
}

const quantity = (state: GameState, e: { min: number; max: number }) => e.min + Math.floor(roll(state) * (e.max - e.min + 1));

/** Puts items on the ground where Prabu stands, to stay for 96 hours (D-045). */
export function leaveOnGround(state: GameState, stack: Stack, content: Content) {
  const { lat, lon } = state.player.position;
  state.ground.push({ ...stack, lat, lon, expiresAt: state.clockMinutes + content.scavenging.groundMinutes });
}

/** Indexes into state.ground of the piles where Prabu stands. */
export function groundHere(state: GameState): number[] {
  return state.ground.flatMap((pile, i) => (distanceKm(pile, state.player.position) <= HERE_KM ? [i] : []));
}

/** What Prabu can search where he stands: a town building (P-014, on the world map since D-099), or a site with loot (P-013). */
function searchTarget(state: GameState, content: Content) {
  const cfg = content.scavenging;
  const torch = (minutes: number) => Math.round(minutes * cfg.torchTimeFactor);
  const spot = spotHere(state, content);
  if (spot?.kind === 'building') {
    const t = spot.type;
    return { id: spot.id, key: t.id, name: spot.name, entries: t.search, minutes: t.searchMinutes, torchMinutes: torch(t.searchMinutes), depletion: t.depletionPerSearch };
  }
  // A town's own marker has no loot; its buildings do.
  const site = siteAt(state.player.position, content);
  const entries = site ? content.loot[site.id]?.search : undefined;
  if (!site || !entries?.length) return undefined;
  return { id: site.id, key: site.id, name: site.name, entries, minutes: cfg.searchMinutes, torchMinutes: torch(cfg.searchMinutes), depletion: cfg.depletionPerSearch };
}

/** The site's or building's richness now, applying the 7-day refresh (P-013). Mutates `state.sites`. */
function richness(state: GameState, siteId: string): number {
  const site = state.sites[siteId];
  if (!site) return 100;
  if (site.refreshAt !== null && state.clockMinutes >= site.refreshAt) {
    delete state.sites[siteId];
    return 100;
  }
  return site.richness;
}

/** Can Prabu search here, and with the torch? For the UI, without changing anything. */
export function searchOptions(state: GameState, content: Content) {
  const site = siteAt(state.player.position, content);
  const target = searchTarget(state, content);
  const entry = target && state.sites[target.id];
  // Shown as 100% once the refresh is due, before the next search applies it.
  const left = !entry || (entry.refreshAt !== null && state.clockMinutes >= entry.refreshAt) ? 100 : entry.richness;
  return {
    site,
    canSearch: Boolean(target),
    canHunt: Boolean(site && content.loot[site.id]?.hunt?.length),
    searchMinutes: target?.minutes ?? content.scavenging.searchMinutes,
    torchSearchMinutes: target?.torchMinutes ?? Math.round(content.scavenging.searchMinutes * content.scavenging.torchTimeFactor),
    torch: torchIndex(state, content) >= 0,
    richness: left,
  };
}

function torchIndex(state: GameState, content: Content): number {
  const need = content.scavenging.torchChargePerSearch;
  return state.inventory.stacks.findIndex((s) => s.itemId === content.scavenging.torchItemId && (s.charge ?? 0) >= need);
}

function finish(state: GameState, minutes: number, finds: Find[], content: Content, events: GameEvent[]) {
  passTime(state, minutes, 'work', content, events);
  if (state.dead) return;
  for (const f of finds) leaveOnGround(state, makeStack(f.itemId, f.count, state.clockMinutes, content, f.charge), content);
}

/** A charm found here, or null: one roll over the rarities found at this building type or site (P-022). */
function charmFind(state: GameState, key: string, factor: number, content: Content): string | null {
  const town = spotHere(state, content)?.townId;
  const tiers = content.charms.finds.filter((f) => f.at.includes(key) && (!f.towns || (town !== undefined && f.towns.includes(town))));
  if (!tiers.length) return null;
  const r = roll(state);
  let acc = 0;
  for (const tier of tiers) {
    acc += tier.chance * factor;
    if (r >= acc) continue;
    const pool = Object.values(content.items).filter((it) => it.charm?.rarity === tier.rarity);
    return pool[Math.floor(roll(state) * pool.length)]!.id;
  }
  return null;
}

/** Search the site (P-013): two draws, each taking the first entry that hits, scaled by richness. */
export function search(state: GameState, useTorch: boolean, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t search while travelling.');
  const target = searchTarget(state, content);
  if (!target) {
    const site = siteAt(state.player.position, content);
    return site ? fail('nothing_to_search', `There's nothing to search at ${site.name}.`) : fail('not_at_site', 'There\'s nothing to search here.');
  }
  const cfg = content.scavenging;

  if (useTorch) {
    const i = torchIndex(state, content);
    if (i < 0) return fail('no_torch_charge', 'The torch needs charge to search with it.');
    const torch = state.inventory.stacks[i]!;
    torch.count -= 1;
    if (torch.count === 0) state.inventory.stacks.splice(i, 1);
    addStack(state.inventory, { ...torch, count: 1, charge: (torch.charge ?? 0) - cfg.torchChargePerSearch });
  }

  const rich = richness(state, target.id);
  // D-066: each point of Luck adds 1% to every find chance.
  const luck = 1 + (playerStats(state, content).luck * content.combat.luck.searchPercent) / 100;
  const finds: Find[] = [];
  for (let d = 0; d < cfg.drawsPerSearch; d++) {
    for (const entry of target.entries) {
      if (roll(state) < entry.chance * (rich / 100) * luck) {
        const find: Find = { itemId: entry.itemId, count: quantity(state, entry) };
        if (entry.charge) find.charge = entry.charge[0] + Math.floor(roll(state) * (entry.charge[1] - entry.charge[0] + 1));
        finds.push(find);
        break;
      }
    }
  }
  // One roll each for a charm and a vehicle (P-021, P-022), scaled like the draws.
  const factor = (rich / 100) * luck;
  const charm = charmFind(state, target.key, factor, content);
  if (charm) finds.push({ itemId: charm, count: 1 });
  const found: GameEvent[] = [];
  rollVehicleFind(state, target.key, factor, content, found);
  const after = Math.max(cfg.minRichness, rich - target.depletion);
  const refreshAt = state.sites[target.id]?.refreshAt ?? state.clockMinutes + cfg.refreshMinutes;
  state.sites[target.id] = { richness: after, refreshAt };

  const events: GameEvent[] = [{ type: 'searched', finds, torch: useTorch }, ...found];
  // Shaken hands search slower (D-061).
  const minutes = Math.round((useTorch ? target.torchMinutes : target.minutes) * conditionEffects(state.survival, content).searchTime * charmEffects(state.inventory, content).searchTime);
  finish(state, minutes, finds, content, events);
  const spot = spotHere(state, content);
  if (!state.dead) maybeEvent(state, { on: 'search', buildingTypeId: spot?.kind === 'building' ? spot.type.id : null }, content, events);
  return { ok: true, state, events };
}

/**
 * One hour of hunting (D-065, D-066): it succeeds with Prabu's Hunting chance (plus Luck); on success
 * every entry rolls on its own. A boar may turn up (an event).
 */
export function hunt(state: GameState, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t hunt while travelling.');
  const site = siteAt(state.player.position, content);
  const entries = site ? content.loot[site.id]?.hunt : undefined;
  if (!site || !entries?.length) return fail('cannot_hunt_here', 'There\'s no game to hunt here.');
  const stats = playerStats(state, content);
  const success = roll(state) * 100 < stats.hunting + stats.luck * content.combat.luck.hunting;
  const finds: Find[] = [];
  if (success) for (const entry of entries) if (roll(state) < entry.chance) finds.push({ itemId: entry.itemId, count: quantity(state, entry) });
  const events: GameEvent[] = [{ type: 'hunted', finds, success }];
  finish(state, content.scavenging.huntMinutes, finds, content, events);
  if (!state.dead) maybeEvent(state, { on: 'hunt' }, content, events);
  return { ok: true, state, events };
}

type WaterIndex = { box: [number, number, number, number]; river: boolean; well?: boolean; ring?: [number, number][]; line?: [number, number][] }[];
const waterIndexes = new WeakMap<Water, WaterIndex>();

function bounds(points: [number, number][]): [number, number, number, number] {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

function waterIndex(water: Water): WaterIndex {
  let index = waterIndexes.get(water);
  if (!index) {
    index = [
      ...water.areas.map((a) => ({ box: bounds(a.ring), river: a.river, ring: a.ring })),
      ...water.rivers.map((line) => ({ box: bounds(line), river: true, line })),
      ...water.wells.map((p) => ({ box: bounds([p]), river: false, well: true, line: [p, p] })),
    ];
    waterIndexes.set(water, index);
  }
  return index;
}

export type WaterKind = 'river' | 'well' | 'still';
/** Rivers and wells are clean; everything else is unsafe until boiled or filtered (D-044, D-050). */
export const isClean = (w: WaterKind) => w !== 'still';

/** D-044, D-050: water within range of p on the world map, or null on dry ground. Clean water wins. */
export function waterAt(p: LatLon, content: Content): WaterKind | null {
  const range = content.scavenging.waterRangeKm;
  const pad = range / 100; // degrees, generous
  let found: WaterKind | null = null;
  for (const w of waterIndex(content.water)) {
    const [minX, minY, maxX, maxY] = w.box;
    if (p.lon < minX - pad || p.lon > maxX + pad || p.lat < minY - pad || p.lat > maxY + pad) continue;
    const near = w.ring ? insideRing(p, w.ring) || distanceToLineKm(p, w.ring) <= range : distanceToLineKm(p, w.line!) <= range;
    if (!near) continue;
    if (w.river) return 'river';
    if (w.well) found = 'well';
    else found ??= 'still';
  }
  return found;
}

/** Water where Prabu stands: the map's water, or a town's well (clean) or tank (unsafe) he stands at (P-014, D-099). */
export function waterHere(state: GameState, content: Content): WaterKind | null {
  const spot = spotHere(state, content);
  if (spot?.kind === 'water') return spot.water === 'well' ? 'well' : 'still';
  return waterAt(state.player.position, content);
}

/** Fills every empty bottle: clean at a river or well, unsafe anywhere else (D-044, D-050). */
export function fillBottles(state: GameState, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t fill bottles while travelling.');
  const water = waterHere(state, content);
  if (!water) return fail('no_water', 'There\'s no water here.');
  const { bottles, fillMinutesPerBottle } = content.scavenging;
  const empty = state.inventory.stacks.filter((s) => s.itemId === bottles.empty).reduce((n, s) => n + s.count, 0);
  if (!empty) return fail('no_empty_bottles', 'Prabu has no empty bottles.');
  state.inventory.stacks = state.inventory.stacks.filter((s) => s.itemId !== bottles.empty);
  const filled = isClean(water) ? bottles.clean : bottles.unsafe;
  addStack(state.inventory, makeStack(filled, empty, state.clockMinutes, content));
  const events: GameEvent[] = [{ type: 'bottles_filled', count: empty, clean: isClean(water) }];
  passTime(state, empty * fillMinutesPerBottle, 'work', content, events);
  return { ok: true, state, events };
}

/** Drinks his fill at the water; still water carries the unsafe-water illness chance (D-027). */
export function drinkHere(state: GameState, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t drink while travelling.');
  const water = waterHere(state, content);
  if (!water) return fail('no_water', 'There\'s no water here.');
  const events: GameEvent[] = [{ type: 'drank', clean: isClean(water) }];
  passTime(state, content.scavenging.drinkMinutes, 'work', content, events);
  if (state.dead) return { ok: true, state, events };
  state.survival.water = 100;
  const chance = content.items[content.scavenging.bottles.unsafe]?.illnessChance ?? 0;
  if (water === 'still' && roll(state) < chance * charmEffects(state.inventory, content).illness) {
    state.survival.illUntil = state.clockMinutes + content.survival.illness.minutes;
    events.push({ type: 'fell_ill' });
  }
  return { ok: true, state, events };
}

/** The stock key for the stretch of water at p: one ~1 km square (D-100). */
export function waterCellKey(p: LatLon, content: Content): string {
  const d = content.scavenging.waterCellDeg;
  return `cell.water.${Math.floor(p.lat / d)}.${Math.floor(p.lon / d)}`;
}

/** The best fishing tool he has (in the pack or in hand) and its chance in %, or null (D-100). */
function fishingTool(state: GameState, content: Content) {
  const has = (id: string) => state.inventory.weapon === id || state.inventory.stacks.some((s) => s.itemId === id);
  return content.scavenging.fishing.tools.filter((t) => has(t.itemId)).sort((a, b) => b.chance - a.chance)[0] ?? null;
}

/** What he can do at the water here, for the UI (D-100): fish and gather moss at any water but a well. */
export function waterOptions(state: GameState, content: Content) {
  const water = waterHere(state, content);
  const open = water !== null && water !== 'well';
  const key = waterCellKey(state.player.position, content);
  const entry = state.sites[key];
  const left = !entry || (entry.refreshAt !== null && state.clockMinutes >= entry.refreshAt) ? 100 : entry.richness;
  const tool = fishingTool(state, content);
  const luck = playerStats(state, content).luck * content.combat.luck.hunting;
  return { open, left, tool, fishChance: tool ? Math.min(100, (tool.chance + luck) * (left / 100)) : 0 };
}

/** Uses up some of the water's stock after a try (D-100). */
function deplete(state: GameState, key: string, amount: number, content: Content) {
  const cfg = content.scavenging;
  const rich = richness(state, key);
  const refreshAt = state.sites[key]?.refreshAt ?? state.clockMinutes + cfg.refreshMinutes;
  state.sites[key] = { richness: Math.max(cfg.minRichness, rich - amount), refreshAt };
  return rich;
}

/** An hour of fishing (D-100): needs a spear or a fishing rod; the catch lands on the ground here. */
export function fish(state: GameState, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t fish while travelling.');
  const water = waterHere(state, content);
  if (!water || water === 'well') return fail('no_water', 'There\'s no water to fish here.');
  const tool = fishingTool(state, content);
  if (!tool) return fail('missing_item', 'Prabu needs a spear or a fishing rod to fish.');
  const cfg = content.scavenging.fishing;
  const rich = deplete(state, waterCellKey(state.player.position, content), cfg.depletion, content);
  const luck = playerStats(state, content).luck * content.combat.luck.hunting;
  const success = roll(state) * 100 < (tool.chance + luck) * (rich / 100);
  const finds: Find[] = success ? [{ itemId: cfg.catch.itemId, count: quantity(state, cfg.catch) }] : [];
  const events: GameEvent[] = [{ type: 'fished', finds, success }];
  finish(state, cfg.minutes, finds, content, events);
  if (!state.dead) maybeEvent(state, { on: 'search', buildingTypeId: null }, content, events);
  return { ok: true, state, events };
}

/** Half an hour gathering moss at the water's edge (D-100); it lands on the ground here. */
export function gatherMoss(state: GameState, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t gather moss while travelling.');
  const water = waterHere(state, content);
  if (!water || water === 'well') return fail('no_water', 'There\'s no moss to gather here.');
  const cfg = content.scavenging.moss;
  const rich = deplete(state, waterCellKey(state.player.position, content), cfg.depletion, content);
  const luck = playerStats(state, content).luck / 100;
  const finds: Find[] = roll(state) < (cfg.chance + luck) * (rich / 100) ? [{ itemId: cfg.find.itemId, count: quantity(state, cfg.find) }] : [];
  const events: GameEvent[] = [{ type: 'moss_gathered', finds }];
  finish(state, cfg.minutes, finds, content, events);
  if (!state.dead) maybeEvent(state, { on: 'search', buildingTypeId: null }, content, events);
  return { ok: true, state, events };
}

/** Picks up piles from the ground here; refused as a whole past the carry maximum (D-036, D-045). */
export function takeFromGround(state: GameState, indexes: number[], content: Content, toCargo = false): CommandResult {
  const here = new Set(groundHere(state));
  const unique = [...new Set(indexes)];
  if (!unique.length || unique.some((i) => !here.has(i))) return fail('bad_item', 'That isn\'t here.');
  const kg = unique.reduce((sum, i) => sum + content.items[state.ground[i]!.itemId]!.weightKg * state.ground[i]!.count, 0);
  // P-021: straight into the cargo of the vehicle he rides, within its capacity.
  const vehicle = toCargo ? ridden(state) : undefined;
  if (toCargo) {
    const def = vehicle && content.vehicles.byId[vehicle.vehicleId];
    if (!vehicle || !def) return fail('no_vehicle', 'Prabu isn\'t riding anything.');
    if (stacksKg(vehicle.cargo, content) + kg > def.cargoKg + 1e-9) return fail('cargo_full', `The ${def.name.toLowerCase()} holds ${def.cargoKg} kg.`);
  } else if (carriedKg(state.inventory, content) + kg > content.survival.carry.maxKg + 1e-9) {
    return fail('too_heavy', `That would take Prabu past ${content.survival.carry.maxKg} kg.`);
  }
  for (const i of unique) {
    const pile = state.ground[i]!;
    const stack: Stack = { itemId: pile.itemId, count: pile.count };
    if (pile.charge !== undefined) stack.charge = pile.charge;
    if (pile.spoilsAt !== undefined) stack.spoilsAt = pile.spoilsAt;
    addStack(vehicle ? { stacks: vehicle.cargo, weapon: null, charms: [] } : state.inventory, stack);
  }
  state.ground = state.ground.filter((_, i) => !unique.includes(i));
  return { ok: true, state, events: [{ type: 'items_taken', count: unique.length }] };
}
