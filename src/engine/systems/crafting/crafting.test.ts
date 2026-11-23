import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { addItems } from '../inventory/inventory';
import { recipeStatus } from './crafting';

const content = loadContent();

function withItems(items: [string, number][]) {
  const state = createNewGame(content, 1);
  for (const [id, n] of items) if (!addItems(state, id, n, content).ok) throw new Error(`could not add ${id}`);
  return state;
}
const count = (s: GameState, itemId: string) => s.inventory.stacks.reduce((n, st) => n + (st.itemId === itemId ? st.count : 0), 0);
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code} ${result.error.message}`);
  return result;
}
function err(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  return result.ok ? 'ok' : result.error.code;
}
const craft = (recipeId: string): Command => ({ type: 'craft', recipeId });

describe('crafting (M5, P-017)', () => {
  it('ships the four recipes and the three primitive weapon recipes (D-058, D-066)', () => {
    expect(Object.keys(content.recipes)).toEqual([
      'recipe.cloth_bandage', 'recipe.neem_paste', 'recipe.neem_turmeric_paste', 'recipe.dried_meat',
      'recipe.bamboo_spear', 'recipe.bamboo_bow', 'recipe.arrows',
    ]);
  });

  it('uses the inputs, makes the output and passes the time', () => {
    const s = ok(withItems([['item.cloth', 3]]), craft('recipe.cloth_bandage')).state;
    expect(count(s, 'item.cloth')).toBe(1);
    expect(count(s, 'item.cloth_bandage')).toBe(1);
    expect(s.clockMinutes).toBe(360 + 10);
    expect(s.survival.water).toBeLessThan(100);
  });

  it('neem paste, or the stronger neem–turmeric paste with turmeric', () => {
    const plain = ok(withItems([['item.neem_leaves', 3]]), craft('recipe.neem_paste')).state;
    expect(count(plain, 'item.neem_paste')).toBe(1);
    expect(err(withItems([['item.neem_leaves', 3]]), craft('recipe.neem_turmeric_paste'))).toBe('missing_item');
    const strong = ok(withItems([['item.neem_leaves', 3], ['item.turmeric', 1]]), craft('recipe.neem_turmeric_paste')).state;
    expect(count(strong, 'item.neem_turmeric_paste')).toBe(1);
    expect(count(strong, 'item.turmeric')).toBe(0);
    expect(content.items['item.neem_turmeric_paste']!.effects!.health).toBeGreaterThan(content.items['item.neem_paste']!.effects!.health!);
  });

  it('dried meat needs the knife, equipped or in the pack, and keeps it', () => {
    const s = withItems([['item.raw_meat', 2], ['item.salt', 1]]);
    expect(s.inventory.weapon).toBe('item.hunting_knife');
    const made = ok(s, craft('recipe.dried_meat')).state;
    expect(count(made, 'item.dried_meat')).toBe(2);
    expect(made.inventory.weapon).toBe('item.hunting_knife');
    expect(made.clockMinutes).toBe(420);
    const noKnife = structuredClone(s);
    noKnife.inventory.weapon = null;
    expect(err(noKnife, craft('recipe.dried_meat'))).toBe('missing_item');
    expect(recipeStatus(noKnife, content.recipes['recipe.dried_meat']!, content).missing).toBe('Needs a hunting knife');
  });

  it('says what is short, and refuses unknown recipes and while travelling', () => {
    const s = withItems([['item.cloth', 1]]);
    expect(recipeStatus(s, content.recipes['recipe.cloth_bandage']!, content).missing).toBe('Needs 1 more cloth rags');
    expect(err(s, craft('recipe.cloth_bandage'))).toBe('missing_item');
    expect(err(s, craft('recipe.nothing'))).toBe('unknown_recipe');
    const t = withItems([['item.cloth', 2]]);
    t.travel = { destination: t.player.position, siteId: null, legs: [{ minutes: 10, km: 0.5, path: [t.player.position, t.player.position] }], nextLeg: 0 };
    expect(err(t, craft('recipe.cloth_bandage'))).toBe('travel_in_progress');
  });

  it('raw meat spoiling during the craft does not break it', () => {
    const s = withItems([['item.raw_meat', 2], ['item.salt', 1], ['item.cloth', 2]]);
    s.inventory.stacks.push({ itemId: 'item.raw_meat', count: 1, spoilsAt: s.clockMinutes + 5 });
    const made = ok(s, craft('recipe.cloth_bandage')).state;
    expect(count(made, 'item.cloth_bandage')).toBe(1);
    expect(count(made, 'item.raw_meat')).toBe(2);
  });
});

describe('millet porridge at a fire', () => {
  it('cooks up to 2 millet with a pot and one bottle of water', () => {
    let s = withItems([['item.firewood', 1], ['item.millet', 3], ['item.cooking_pot', 1], ['item.unsafe_water', 1]]);
    s = ok(s, { type: 'fire.make', method: 'lighter' }).state;
    s = ok(s, { type: 'fire.cook', recipeId: 'recipe.millet_porridge' }).state;
    expect(count(s, 'item.millet_porridge')).toBe(2);
    expect(count(s, 'item.millet')).toBe(1);
    expect(count(s, 'item.unsafe_water')).toBe(0);
    expect(count(s, 'item.empty_bottle')).toBe(1);
  });
});
