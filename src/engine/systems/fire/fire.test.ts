import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { createSave, loadSave } from '../../save/save';
import { addItems } from '../inventory/inventory';
import { fireMinutesLeft, fireOptions } from './fire';

const content = loadContent();
// Tests count from the run's start time (D-075), not a fixed hour.
const START = content.newGame.startClockMinutes;

function withItems(items: [string, number][], seed = 1) {
  const state = createNewGame(content, seed);
  for (const [id, n] of items) if (!addItems(state, id, n, content).ok) throw new Error(`could not add ${id}`);
  return state;
}
const count = (s: GameState, itemId: string) => s.inventory.stacks.reduce((n, st) => n + (st.itemId === itemId ? st.count : 0), 0);
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code}`);
  return result;
}
function err(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  return result.ok ? 'ok' : result.error.code;
}
const lit = (items: [string, number][] = []) => ok(withItems([['item.firewood', 2], ...items]), { type: 'fire.make', method: 'lighter' }).state;

describe('making a fire (D-056, P-016)', () => {
  it('the lighter takes 5 min, a light and a firewood; the fire burns 2 h', () => {
    const s = lit();
    expect(s.clockMinutes).toBe(START + 5);
    expect(s.inventory.stacks.find((st) => st.itemId === 'item.lighter')!.charge).toBe(9);
    expect(count(s, 'item.firewood')).toBe(1);
    expect(fireMinutesLeft(s)).toBe(120);
  });

  it('each way takes its own time; rubbing sticks needs no tool', () => {
    const times = { matchbox: 5, flint: 15, sticks: 90 } as Record<string, number>;
    for (const method of Object.keys(times)) {
      const s = withItems([['item.firewood', 1], ['item.matchbox', 1], ['item.flint', 1]]);
      expect(ok(s, { type: 'fire.make', method }).state.clockMinutes).toBe(START + times[method]!);
    }
    const flint = ok(withItems([['item.firewood', 1], ['item.flint', 1]]), { type: 'fire.make', method: 'flint' }).state;
    expect(count(flint, 'item.flint')).toBe(1);
  });

  it('the last match goes with the box; an empty lighter is kept', () => {
    const s = withItems([['item.firewood', 1]]);
    s.inventory.stacks.push({ itemId: 'item.matchbox', count: 1, charge: 1 });
    expect(count(ok(s, { type: 'fire.make', method: 'matchbox' }).state, 'item.matchbox')).toBe(0);
    const l = withItems([['item.firewood', 1]]);
    l.inventory.stacks.find((st) => st.itemId === 'item.lighter')!.charge = 1;
    expect(ok(l, { type: 'fire.make', method: 'lighter' }).state.inventory.stacks.find((st) => st.itemId === 'item.lighter')!.charge).toBe(0);
  });

  it('refuses without firewood, without the tool, or with a fire already burning', () => {
    expect(err(createNewGame(content, 1), { type: 'fire.make', method: 'lighter' })).toBe('no_firewood');
    expect(err(withItems([['item.firewood', 1]]), { type: 'fire.make', method: 'flint' })).toBe('missing_item');
    expect(err(lit(), { type: 'fire.make', method: 'sticks' })).toBe('fire_burning');
    expect(err(withItems([['item.firewood', 1]]), { type: 'fire.make', method: 'magic' })).toBe('unknown_recipe');
  });

  it('firewood adds 2 h; the fire stays where it was lit', () => {
    const fed = ok(lit(), { type: 'fire.feed' }).state;
    expect(fireMinutesLeft(fed)).toBe(240);
    expect(fed.clockMinutes).toBe(START + 5);
    const away = structuredClone(fed);
    away.player.position = { lat: away.player.position.lat + 0.01, lon: away.player.position.lon };
    expect(fireMinutesLeft(away)).toBe(0);
    expect(err(away, { type: 'fire.feed' })).toBe('no_fire');
  });
});

describe('cooking over the fire', () => {
  it('cooks up to 3 raw meat in 30 min', () => {
    const s = ok(lit([['item.raw_meat', 4]]), { type: 'fire.cook', recipeId: 'recipe.cook_meat' }).state;
    expect(count(s, 'item.raw_meat')).toBe(1);
    expect(count(s, 'item.cooked_meat')).toBe(3);
    expect(s.clockMinutes).toBe(START + 5 + 30);
  });

  it('boils up to 4 bottles with a pot; refuses without one', () => {
    expect(err(lit([['item.unsafe_water', 2]]), { type: 'fire.cook', recipeId: 'recipe.boil_water' })).toBe('missing_item');
    const s = ok(lit([['item.unsafe_water', 5], ['item.cooking_pot', 1]]), { type: 'fire.cook', recipeId: 'recipe.boil_water' }).state;
    expect(count(s, 'item.clean_water')).toBe(4);
    expect(count(s, 'item.unsafe_water')).toBe(1);
    expect(count(s, 'item.cooking_pot')).toBe(1);
  });

  it('sterilizes up to 3 rags with a pot and one bottle of water, unsafe first', () => {
    const s = ok(lit([['item.cloth', 3], ['item.cooking_pot', 1], ['item.unsafe_water', 1], ['item.clean_water', 1]]), { type: 'fire.cook', recipeId: 'recipe.sterilize_rags' }).state;
    expect(count(s, 'item.sterile_bandage')).toBe(3);
    expect(count(s, 'item.unsafe_water')).toBe(0);
    expect(count(s, 'item.clean_water')).toBe(1);
    expect(count(s, 'item.empty_bottle')).toBe(1);
    expect(err(lit([['item.cloth', 1], ['item.cooking_pot', 1]]), { type: 'fire.cook', recipeId: 'recipe.sterilize_rags' })).toBe('missing_item');
  });

  it('needs a fire with enough time left', () => {
    expect(err(withItems([['item.raw_meat', 1]]), { type: 'fire.cook', recipeId: 'recipe.cook_meat' })).toBe('no_fire');
    const s = lit([['item.raw_meat', 1]]);
    s.fire!.outAt = s.clockMinutes + 20;
    expect(err(s, { type: 'fire.cook', recipeId: 'recipe.cook_meat' })).toBe('fire_too_low');
  });

  it('lists what he can do, and why not', () => {
    const o = fireOptions(lit([['item.raw_meat', 1]]), content);
    expect(o.minutesLeft).toBe(120);
    expect(o.methods.map((m) => m.id)).toEqual(['lighter', 'sticks']);
    const byId = Object.fromEntries(o.recipes.map((r) => [r.recipe.id, r]));
    expect(byId['recipe.cook_meat']).toMatchObject({ count: 1, missing: null });
    expect(byId['recipe.boil_water']!.missing).toBe('Needs a cooking pot');
  });
});

describe('fire in saves', () => {
  it('round-trips, and a v5 save loads with no fire', () => {
    const s = lit();
    const loaded = loadSave(JSON.parse(JSON.stringify(createSave(s, 'x'))), content);
    expect(loaded.ok && loaded.save.gameState.fire).toEqual(s.fire);
    const v5: Partial<GameState> = createNewGame(content, 1);
    delete v5.fire;
    const old = loadSave({ saveVersion: 5, createdAt: 'x', gameState: v5 }, content);
    expect(old.ok && old.save.gameState.fire).toBeNull();
  });
});
