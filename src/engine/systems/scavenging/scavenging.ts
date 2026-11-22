import type { Content } from '../../../content/loader';
import type { LootEntry, Water } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import { nextRandom } from '../../core/rng';
import type { GameState, Stack } from '../../core/state';
import { addStack, carriedKg, makeStack } from '../inventory/inventory';
import { passTime } from '../survival/survival';
import { distanceKm, distanceToLineKm, insideRing, type LatLon } from '../travel/geo';
import { spotHere } from '../town/town';
import { siteAt } from '../travel/travel';

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });
// Ground piles within this distance count as "here" (same as being at a place).
const HERE_KM = 0.05;

export type Find = { itemId: string; count: number; charge?: number };

function roll(state: GameState): number {
  const [value, next] = nextRandom(state.rngState);
  state.rngState = next;
  return value;
}

const quantity = (state: GameState, e: LootEntry) => e.min + Math.floor(roll(state) * (e.max - e.min + 1));

/** Puts items on the ground where Prabu stands, to stay for 96 hours (D-045). */
export function leaveOnGround(state: GameState, stack: Stack, content: Content) {
  const { lat, lon } = state.player.position;
  state.ground.push({ ...stack, lat, lon, expiresAt: state.clockMinutes + content.scavenging.groundMinutes });
}

/** Indexes into state.ground of the piles where Prabu stands. */
export function groundHere(state: GameState): number[] {
  return state.ground.flatMap((pile, i) => (distanceKm(pile, state.player.position) <= HERE_KM ? [i] : []));
}

/** What Prabu can search where he stands: a building on a town map (P-014), or a site with loot (P-013). */
function searchTarget(state: GameState, content: Content) {
  const cfg = content.scavenging;
  const spot = spotHere(state, content);
  if (spot?.kind === 'building') {
    const t = spot.type;
    return { id: spot.id, name: spot.name, entries: t.search, minutes: t.searchMinutes, torchMinutes: t.torchSearchMinutes, depletion: t.depletionPerSearch };
  }
  // Inside a town only buildings are searched; the town's own site has no loot.
  const site = state.town ? undefined : siteAt(state.player.position, content);
  const entries = site ? content.loot[site.id]?.search : undefined;
  if (!site || !entries?.length) return undefined;
  return { id: site.id, name: site.name, entries, minutes: cfg.searchMinutes, torchMinutes: cfg.torchSearchMinutes, depletion: cfg.depletionPerSearch };
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
  const site = state.town ? undefined : siteAt(state.player.position, content);
  const target = searchTarget(state, content);
  const entry = target && state.sites[target.id];
  // Shown as 100% once the refresh is due, before the next search applies it.
  const left = !entry || (entry.refreshAt !== null && state.clockMinutes >= entry.refreshAt) ? 100 : entry.richness;
  return {
    site,
    canSearch: Boolean(target),
    canHunt: Boolean(site && content.loot[site.id]?.hunt?.length),
    canEnterTown: Boolean(site && content.towns[site.id]),
    searchMinutes: target?.minutes ?? content.scavenging.searchMinutes,
    torchSearchMinutes: target?.torchMinutes ?? content.scavenging.torchSearchMinutes,
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

/** Search the site (P-013): two draws, each taking the first entry that hits, scaled by richness. */
export function search(state: GameState, useTorch: boolean, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t search while travelling.');
  const target = searchTarget(state, content);
  if (!target) {
    const site = state.town ? undefined : siteAt(state.player.position, content);
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
  const finds: Find[] = [];
  for (let d = 0; d < cfg.drawsPerSearch; d++) {
    for (const entry of target.entries) {
      if (roll(state) < entry.chance * (rich / 100)) {
        const find: Find = { itemId: entry.itemId, count: quantity(state, entry) };
        if (entry.charge) find.charge = entry.charge[0] + Math.floor(roll(state) * (entry.charge[1] - entry.charge[0] + 1));
        finds.push(find);
        break;
      }
    }
  }
  const after = Math.max(cfg.minRichness, rich - target.depletion);
  const refreshAt = state.sites[target.id]?.refreshAt ?? state.clockMinutes + cfg.refreshMinutes;
  state.sites[target.id] = { richness: after, refreshAt };

  const events: GameEvent[] = [{ type: 'searched', finds, torch: useTorch }];
  finish(state, useTorch ? target.torchMinutes : target.minutes, finds, content, events);
  return { ok: true, state, events };
}

/** One hour of hunting (D-046): every entry rolls on its own. Chance-based until combat (M7). */
export function hunt(state: GameState, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t hunt while travelling.');
  const site = state.town ? undefined : siteAt(state.player.position, content);
  const entries = site ? content.loot[site.id]?.hunt : undefined;
  if (!site || !entries?.length) return fail('cannot_hunt_here', 'There\'s no game to hunt here.');
  const finds: Find[] = [];
  for (const entry of entries) if (roll(state) < entry.chance) finds.push({ itemId: entry.itemId, count: quantity(state, entry) });
  const events: GameEvent[] = [{ type: 'hunted', finds }];
  finish(state, content.scavenging.huntMinutes, finds, content, events);
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

/** Water where Prabu stands. Inside a town only its wells and tanks count (P-014). */
export function waterHere(state: GameState, content: Content): WaterKind | null {
  if (!state.town) return waterAt(state.player.position, content);
  const spot = spotHere(state, content);
  return spot?.kind === 'water' ? (spot.water === 'well' ? 'well' : 'still') : null;
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
  if (water === 'still' && roll(state) < chance) {
    state.survival.illUntil = state.clockMinutes + content.survival.illness.minutes;
    events.push({ type: 'fell_ill' });
  }
  return { ok: true, state, events };
}

/** Picks up piles from the ground here; refused as a whole past the carry maximum (D-036, D-045). */
export function takeFromGround(state: GameState, indexes: number[], content: Content): CommandResult {
  const here = new Set(groundHere(state));
  const unique = [...new Set(indexes)];
  if (!unique.length || unique.some((i) => !here.has(i))) return fail('bad_item', 'That isn\'t here.');
  const kg = unique.reduce((sum, i) => sum + content.items[state.ground[i]!.itemId]!.weightKg * state.ground[i]!.count, 0);
  if (carriedKg(state.inventory, content) + kg > content.survival.carry.maxKg + 1e-9) {
    return fail('too_heavy', `That would take Prabu past ${content.survival.carry.maxKg} kg.`);
  }
  for (const i of unique) {
    const pile = state.ground[i]!;
    const stack: Stack = { itemId: pile.itemId, count: pile.count };
    if (pile.charge !== undefined) stack.charge = pile.charge;
    if (pile.spoilsAt !== undefined) stack.spoilsAt = pile.spoilsAt;
    addStack(state.inventory, stack);
  }
  state.ground = state.ground.filter((_, i) => !unique.includes(i));
  return { ok: true, state, events: [{ type: 'items_taken', count: unique.length }] };
}
