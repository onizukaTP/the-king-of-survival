import type { Content } from '../../../content/loader';
import type { FireConfig } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import type { GameState, Inventory } from '../../core/state';
import { addStack, makeStack, takeOne } from '../inventory/inventory';
import { passTime } from '../survival/survival';
import { distanceKm } from '../travel/geo';

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });
// A fire counts as "here" within the same 50 m as ground piles and places.
const HERE_KM = 0.05;

type Method = FireConfig['methods'][number];
type Recipe = FireConfig['recipes'][number];

const countOf = (inv: Inventory, itemId: string) => inv.stacks.reduce((n, s) => n + (s.itemId === itemId ? s.count : 0), 0);

/** Takes `n` of an item out of the pack, from the first stacks on. Mutates `inv`. */
function takeItems(inv: Inventory, itemId: string, n: number) {
  for (let left = n; left > 0; left--) takeOne(inv, inv.stacks.findIndex((s) => s.itemId === itemId));
}

/** The stack a method lights from: its item with enough charge, or -1. Rubbing sticks needs none (-2). */
function methodStack(state: GameState, m: Method, content: Content): number {
  if (!m.itemId) return -2;
  const charged = Boolean(content.items[m.itemId]!.charge) && m.chargePerFire > 0;
  return state.inventory.stacks.findIndex((s) => s.itemId === m.itemId && (!charged || (s.charge ?? 0) >= m.chargePerFire));
}

/** Minutes the fire where Prabu stands has left, or 0 when none burns here. */
export function fireMinutesLeft(state: GameState): number {
  const f = state.fire;
  if (!f || state.clockMinutes >= f.outAt || distanceKm(f, state.player.position) > HERE_KM) return 0;
  return f.outAt - state.clockMinutes;
}

/** What the Fire section can offer here, without changing anything. */
export function fireOptions(state: GameState, content: Content) {
  const cfg = content.fire;
  const minutesLeft = fireMinutesLeft(state);
  const firewood = countOf(state.inventory, cfg.firewoodItemId) > 0;
  return {
    minutesLeft,
    firewood,
    methods: cfg.methods.filter((m) => methodStack(state, m, content) !== -1),
    recipes: cfg.recipes.map((r) => ({ recipe: r, ...recipeCheck(state, r, content) })),
  };
}

/** How many of a recipe's items he can do now, or why none. */
function recipeCheck(state: GameState, r: Recipe, content: Content): { count: number; missing: string | null } {
  const cfg = content.fire;
  const name = (id: string) => content.items[id]!.name.toLowerCase();
  const have = countOf(state.inventory, r.from);
  if (r.tool && countOf(state.inventory, r.tool) === 0) return { count: 0, missing: `Needs a ${name(r.tool)}` };
  if (have === 0) return { count: 0, missing: `Needs ${name(r.from)}` };
  if (r.usesWater) {
    const bottles = cfg.waterItemIds.reduce((n, id) => n + countOf(state.inventory, id), 0);
    if (bottles === 0) return { count: 0, missing: 'Needs a bottle of water' };
  }
  return { count: Math.min(have, r.maxBatch), missing: null };
}

/** Lights a fire here with 1 firewood (D-056, P-016). One fire at a time: a new one replaces the old. */
export function makeFire(state: GameState, methodId: string, content: Content): CommandResult {
  const cfg = content.fire;
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t light a fire while travelling.');
  const m = cfg.methods.find((x) => x.id === methodId);
  if (!m) return fail('unknown_recipe', `Unknown way to light a fire: ${methodId}.`);
  if (fireMinutesLeft(state) > 0) return fail('fire_burning', 'A fire is already burning here.');
  if (countOf(state.inventory, cfg.firewoodItemId) === 0) return fail('no_firewood', 'Prabu needs firewood to make a fire.');
  const i = methodStack(state, m, content);
  if (i === -1) return fail('missing_item', `Prabu has no ${m.name.toLowerCase()} that will light.`);

  takeItems(state.inventory, cfg.firewoodItemId, 1);
  if (i >= 0 && m.chargePerFire > 0) {
    const stack = state.inventory.stacks.find((s) => s.itemId === m.itemId && (s.charge ?? 0) >= m.chargePerFire)!;
    const used = takeOne(state.inventory, state.inventory.stacks.indexOf(stack));
    const charge = (used.charge ?? 0) - m.chargePerFire;
    // An empty matchbox is thrown away; a lighter is kept for refilling.
    const refillable = Object.values(content.items).some((it) => it.recharges?.itemId === m.itemId);
    if (charge > 0 || refillable) addStack(state.inventory, { ...used, charge });
  }
  const events: GameEvent[] = [{ type: 'fire_lit', method: m.id }];
  passTime(state, m.minutes, 'work', content, events);
  if (state.dead) return { ok: true, state, events };
  const { lat, lon } = state.player.position;
  state.fire = { lat, lon, outAt: state.clockMinutes + cfg.burnMinutesPerFirewood };
  return { ok: true, state, events };
}

/** Adds 1 firewood to the fire here: it burns that much longer. Takes no time. */
export function feedFire(state: GameState, content: Content): CommandResult {
  const cfg = content.fire;
  if (fireMinutesLeft(state) === 0 || !state.fire) return fail('no_fire', 'There\'s no fire burning here.');
  if (countOf(state.inventory, cfg.firewoodItemId) === 0) return fail('no_firewood', 'Prabu has no firewood.');
  takeItems(state.inventory, cfg.firewoodItemId, 1);
  state.fire.outAt += cfg.burnMinutesPerFirewood;
  return { ok: true, state, events: [{ type: 'fire_fed' }] };
}

/** Cooks, boils or sterilizes a batch over the fire here (P-016). */
export function cook(state: GameState, recipeId: string, content: Content): CommandResult {
  const cfg = content.fire;
  const r = cfg.recipes.find((x) => x.id === recipeId);
  if (!r) return fail('unknown_recipe', `Unknown recipe ${recipeId}.`);
  const left = fireMinutesLeft(state);
  if (left === 0) return fail('no_fire', 'Light a fire first.');
  if (left < r.minutes) return fail('fire_too_low', 'The fire would burn out first. Add firewood first.');
  const { count, missing } = recipeCheck(state, r, content);
  if (!count) return fail('missing_item', `${missing ?? 'Something is missing'}.`);

  // Inputs go in first, so spoilage during the wait can't shift them; outputs come out at the end.
  takeItems(state.inventory, r.from, count);
  if (r.usesWater) {
    const bottle = cfg.waterItemIds.find((id) => countOf(state.inventory, id) > 0);
    if (!bottle) return fail('missing_item', 'Needs a bottle of water.');
    takeItems(state.inventory, bottle, 1);
    const empty = content.items[bottle]!.leaves;
    if (empty) addStack(state.inventory, makeStack(empty, 1, state.clockMinutes, content));
  }
  const events: GameEvent[] = [];
  passTime(state, r.minutes, 'work', content, events);
  if (state.dead) return { ok: true, state, events };
  addStack(state.inventory, makeStack(r.to, count, state.clockMinutes, content));
  events.unshift({ type: 'cooked', recipeId: r.id, count });
  return { ok: true, state, events };
}
