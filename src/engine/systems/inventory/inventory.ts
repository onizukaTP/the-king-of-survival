import type { Content } from '../../../content/loader';
import type { SurvivalConfig } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import { nextRandom } from '../../core/rng';
import type { GameState, Inventory, Stack } from '../../core/state';
import { passTime } from '../survival/survival';

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });

/** A new stack as found or made at `clockMinutes`: full charge unless given, spoil time from the item (D-028). */
export function makeStack(itemId: string, count: number, clockMinutes: number, content: Content, charge?: number): Stack {
  const item = content.items[itemId]!;
  const stack: Stack = { itemId, count };
  if (item.charge) stack.charge = Math.min(charge ?? item.charge.max, item.charge.max);
  if (item.spoilsAfterMinutes) stack.spoilsAt = clockMinutes + item.spoilsAfterMinutes;
  return stack;
}

/** Merges into an identical stack (same item, charge and spoil time) or appends. Mutates `inventory`. */
export function addStack(inventory: Inventory, stack: Stack) {
  const same = inventory.stacks.find((s) => s.itemId === stack.itemId && s.charge === stack.charge && s.spoilsAt === stack.spoilsAt);
  if (same) same.count += stack.count;
  else inventory.stacks.push({ ...stack });
}

export function carriedKg(inventory: Inventory, content: Content): number {
  const stacks = inventory.stacks.reduce((kg, s) => kg + content.items[s.itemId]!.weightKg * s.count, 0);
  const weapon = inventory.weapon ? content.items[inventory.weapon]!.weightKg : 0;
  // Round away float noise so 25.000000001 kg doesn't count as overloaded.
  return Math.round((stacks + weapon) * 1000) / 1000;
}

/** D-036: ×1 up to the free limit, rising evenly to ×multiplierAtMax at the maximum. */
export function loadMultiplier(kg: number, carry: SurvivalConfig['carry']): number {
  if (kg <= carry.freeKg) return 1;
  const over = Math.min(kg, carry.maxKg) - carry.freeKg;
  return 1 + (over / (carry.maxKg - carry.freeKg)) * (carry.multiplierAtMax - 1);
}

/** Adds found or made items, refusing anything past the carry maximum (D-036). For scavenging and crafting. */
export function addItems(state: GameState, itemId: string, count: number, content: Content): CommandResult {
  const item = content.items[itemId];
  if (!item) return fail('bad_item', `Unknown item ${itemId}.`);
  const after = carriedKg(state.inventory, content) + item.weightKg * count;
  if (after > content.survival.carry.maxKg + 1e-9) {
    return fail('too_heavy', `Prabu can't carry more than ${content.survival.carry.maxKg} kg.`);
  }
  addStack(state.inventory, makeStack(itemId, count, state.clockMinutes, content));
  return { ok: true, state, events: [] };
}

/** Takes one item out of a stack, removing the stack when it empties. Returns the single item. */
function takeOne(inventory: Inventory, index: number): Stack {
  const stack = inventory.stacks[index]!;
  stack.count -= 1;
  if (stack.count === 0) inventory.stacks.splice(index, 1);
  return { ...stack, count: 1 };
}

const stackAt = (state: GameState, index: number) => (Number.isInteger(index) ? state.inventory.stacks[index] : undefined);

/** Eat, drink, apply or crank: whatever the item does (D-026, D-027, D-037, D-039). */
export function applyItem(state: GameState, index: number, content: Content): CommandResult {
  const stack = stackAt(state, index);
  if (!stack) return fail('bad_item', 'That item isn\'t in the pack.');
  const item = content.items[stack.itemId]!;
  const s = state.survival;
  const events: GameEvent[] = [];

  if (item.recharges) {
    const { itemId, amount, minutes, consumed } = item.recharges;
    const max = content.items[itemId]!.charge!.max;
    const targetIndex = state.inventory.stacks.findIndex((t) => t.itemId === itemId && (t.charge ?? max) < max);
    if (targetIndex < 0) return fail('nothing_to_recharge', `No ${content.items[itemId]!.name.toLowerCase()} needs refilling.`);
    const target = takeOne(state.inventory, targetIndex);
    addStack(state.inventory, { ...target, charge: Math.min(max, (target.charge ?? 0) + amount) });
    if (consumed) takeOne(state.inventory, state.inventory.stacks.indexOf(stack));
    events.push({ type: 'item_used', itemId: item.id });
    // Time last, since it can spoil food and shift stack positions.
    if (minutes > 0) passTime(state, minutes, 'work', content, events);
    return { ok: true, state, events };
  }

  const fx = item.effects ?? {};
  if (!item.effects && !item.curesInjury) return fail('cannot_use', `${item.name} can't be used on its own.`);
  // D-039: Health can't rise while injured, so a pure painkiller would be wasted.
  if (s.injured && !item.curesInjury && fx.health && !fx.food && !fx.water) {
    return fail('injured', 'Treat the injury first, with a bandage or neem paste.');
  }

  takeOne(state.inventory, index);
  if (item.curesInjury && s.injured) {
    s.injured = false;
    events.push({ type: 'injury_cured' });
  }
  s.food = Math.min(100, s.food + (fx.food ?? 0));
  s.water = Math.min(100, s.water + (fx.water ?? 0));
  if (!s.injured) s.health = Math.min(100, s.health + (fx.health ?? 0));
  if (item.illnessChance) {
    const [roll, rngState] = nextRandom(state.rngState);
    state.rngState = rngState;
    if (roll < item.illnessChance) {
      s.illUntil = state.clockMinutes + content.survival.illness.minutes;
      events.push({ type: 'fell_ill' });
    }
  }
  if (item.leaves) addStack(state.inventory, makeStack(item.leaves, 1, state.clockMinutes, content));
  events.unshift({ type: 'item_used', itemId: item.id });
  return { ok: true, state, events };
}

export function dropItem(state: GameState, index: number, count: number): CommandResult {
  const stack = stackAt(state, index);
  if (!stack) return fail('bad_item', 'That item isn\'t in the pack.');
  if (!Number.isInteger(count) || count < 1 || count > stack.count) return fail('bad_item', `Drop between 1 and ${stack.count}.`);
  stack.count -= count;
  if (stack.count === 0) state.inventory.stacks.splice(index, 1);
  return { ok: true, state, events: [] };
}

/** One weapon slot (D-036); the previous weapon goes back into the pack. */
export function equipItem(state: GameState, index: number, content: Content): CommandResult {
  const stack = stackAt(state, index);
  if (!stack) return fail('bad_item', 'That item isn\'t in the pack.');
  if (!content.items[stack.itemId]!.weapon) return fail('not_a_weapon', `${content.items[stack.itemId]!.name} isn't a weapon.`);
  const weapon = takeOne(state.inventory, index);
  if (state.inventory.weapon) addStack(state.inventory, { itemId: state.inventory.weapon, count: 1 });
  state.inventory.weapon = weapon.itemId;
  return { ok: true, state, events: [] };
}

export function unequipItem(state: GameState): CommandResult {
  if (!state.inventory.weapon) return fail('no_weapon', 'No weapon is equipped.');
  addStack(state.inventory, { itemId: state.inventory.weapon, count: 1 });
  state.inventory.weapon = null;
  return { ok: true, state, events: [] };
}
