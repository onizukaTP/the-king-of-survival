import type { Content } from '../../../content/loader';
import type { Stats } from '../../../content/schemas';
import type { CommandError, CommandResult } from '../../core/commands';
import type { GameState, Inventory } from '../../core/state';
import { addStack, sourceStacks, takeOneFrom, type ItemSource } from '../inventory/inventory';

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });

/** What the charms he wears add up to (D-086, P-022). Multipliers multiply; stats and kilograms add. */
export function charmEffects(inventory: Inventory, content: Content) {
  const fx = {
    stats: {} as Partial<Stats>,
    threat: 1, darkRisk: 1, restDrain: 1, illness: 1, searchTime: 1, freeCarryKg: 0,
    conditionTime: {} as Record<string, number>,
  };
  for (const id of inventory.charms) {
    const c = content.items[id]?.charm;
    if (!c) continue;
    for (const key of Object.keys(c.stats ?? {}) as (keyof Stats)[]) fx.stats[key] = (fx.stats[key] ?? 0) + (c.stats![key] ?? 0);
    fx.threat *= c.threatMultiplier ?? 1;
    fx.darkRisk *= c.darkRiskMultiplier ?? 1;
    fx.restDrain *= c.restDrainMultiplier ?? 1;
    fx.illness *= c.illnessMultiplier ?? 1;
    fx.searchTime *= c.searchTimeMultiplier ?? 1;
    fx.freeCarryKg += c.freeCarryKg ?? 0;
    for (const [cond, m] of Object.entries(c.conditionTime ?? {})) fx.conditionTime[cond] = (fx.conditionTime[cond] ?? 1) * m;
  }
  return fx;
}

/** Puts on a charm from the pack or the vehicle's cargo, if its slot has room and he isn't wearing the same one (P-022). */
export function wearCharm(state: GameState, index: number, content: Content, from: ItemSource = 'pack'): CommandResult {
  const stacks = sourceStacks(state, from);
  const stack = stacks && Number.isInteger(index) ? stacks[index] : undefined;
  if (!stack) return fail('bad_item', from === 'cargo' ? 'That isn\'t in the cargo.' : 'That item isn\'t in the pack.');
  const item = content.items[stack.itemId]!;
  if (!item.charm) return fail('not_a_charm', `${item.name} isn't a charm.`);
  const worn = state.inventory.charms;
  if (worn.includes(item.id)) return fail('already_worn', `He already wears a ${item.name.toLowerCase()}.`);
  const slots = content.charms.slots[item.charm.slot] ?? 0;
  const used = worn.filter((id) => content.items[id]?.charm?.slot === item.charm!.slot).length;
  if (used >= slots) return fail('slot_full', `No free ${item.charm.slot} slot. Take one off first.`);
  takeOneFrom(state, from, index);
  worn.push(item.id);
  return { ok: true, state, events: [{ type: 'charm_worn', itemId: item.id }] };
}

/** Takes a worn charm off, back into the pack. */
export function removeCharm(state: GameState, itemId: string): CommandResult {
  const worn = state.inventory.charms;
  if (!worn.includes(itemId)) return fail('bad_item', 'He isn\'t wearing that.');
  state.inventory.charms = worn.filter((id) => id !== itemId);
  addStack(state.inventory, { itemId, count: 1 });
  return { ok: true, state, events: [{ type: 'charm_removed', itemId }] };
}

/** The carry limits with what charms add to the free weight (the silver waist chain, P-022). */
export function carryLimits(state: GameState, content: Content) {
  const carry = content.survival.carry;
  return { ...carry, freeKg: Math.min(carry.maxKg, carry.freeKg + charmEffects(state.inventory, content).freeCarryKg) };
}
