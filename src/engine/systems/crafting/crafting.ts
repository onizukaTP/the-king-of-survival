import type { Content } from '../../../content/loader';
import type { Recipe } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import type { GameState, Inventory } from '../../core/state';
import { addStack, carriedKg, makeStack, takeOne } from '../inventory/inventory';
import { passTime } from '../survival/survival';

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });

const countOf = (inv: Inventory, itemId: string) => inv.stacks.reduce((n, s) => n + (s.itemId === itemId ? s.count : 0), 0);
// A tool counts in the pack or in the weapon slot (the hunting knife is usually equipped).
const hasTool = (inv: Inventory, itemId: string) => inv.weapon === itemId || countOf(inv, itemId) > 0;

/** Whether the recipe can be made now, and if not, why (for the Craft panel and the command). */
export function recipeStatus(state: GameState, r: Recipe, content: Content): { missing: string | null } {
  const name = (id: string) => content.items[id]!.name.toLowerCase();
  if (r.tool && !hasTool(state.inventory, r.tool)) return { missing: `Needs a ${name(r.tool)}` };
  for (const i of r.inputs) {
    const short = i.count - countOf(state.inventory, i.itemId);
    if (short > 0) return { missing: `Needs ${short} more ${name(i.itemId)}` };
  }
  return { missing: null };
}

/** Makes one batch of a recipe anywhere (M5, P-017): inputs used, tool kept, time passes. */
export function craft(state: GameState, recipeId: string, content: Content): CommandResult {
  if (state.travel) return fail('travel_in_progress', 'Prabu can\'t craft while travelling.');
  const r = content.recipes[recipeId];
  if (!r) return fail('unknown_recipe', `Unknown recipe ${recipeId}.`);
  const { missing } = recipeStatus(state, r, content);
  if (missing) return fail('missing_item', `${missing}.`);
  const kg = (id: string, n: number) => content.items[id]!.weightKg * n;
  const after = carriedKg(state.inventory, content) - r.inputs.reduce((sum, i) => sum + kg(i.itemId, i.count), 0) + kg(r.output.itemId, r.output.count);
  if (after > content.survival.carry.maxKg + 1e-9) return fail('too_heavy', `That would take Prabu past ${content.survival.carry.maxKg} kg.`);

  // Inputs go first and the output comes after the time, so spoilage meanwhile can't shift them.
  for (const i of r.inputs) {
    for (let n = 0; n < i.count; n++) takeOne(state.inventory, state.inventory.stacks.findIndex((s) => s.itemId === i.itemId));
  }
  const events: GameEvent[] = [];
  passTime(state, r.minutes, 'work', content, events);
  if (state.dead) return { ok: true, state, events };
  addStack(state.inventory, makeStack(r.output.itemId, r.output.count, state.clockMinutes, content));
  events.unshift({ type: 'crafted', recipeId: r.id, itemId: r.output.itemId, count: r.output.count });
  return { ok: true, state, events };
}
