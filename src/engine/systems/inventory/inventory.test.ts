import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { addItems, carriedKg, loadMultiplier } from './inventory';

const content = loadContent();

function withItems(items: [string, number][], change: (s: GameState) => void = () => {}, seed = 1) {
  const state = createNewGame(content, seed);
  for (const [id, n] of items) if (!addItems(state, id, n, content).ok) throw new Error(`could not add ${id}`);
  change(state);
  return state;
}

const indexOf = (s: GameState, itemId: string) => s.inventory.stacks.findIndex((st) => st.itemId === itemId);

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code}`);
  return result;
}

describe('inventory', () => {
  it('starts with the knife equipped, a half-full lighter and a half-charged torch (D-026)', () => {
    const s = createNewGame(content, 1);
    expect(s.inventory.weapon).toBe('item.hunting_knife');
    expect(s.inventory.stacks).toEqual([
      { itemId: 'item.lighter', count: 1, charge: 10 },
      { itemId: 'item.torch', count: 1, charge: 50 },
    ]);
    expect(carriedKg(s.inventory, content)).toBeCloseTo(0.65);
  });

  it('stacks identical items and keeps different spoil times apart', () => {
    const s = withItems([['item.tinned_food', 2], ['item.tinned_food', 3]]);
    expect(s.inventory.stacks.filter((st) => st.itemId === 'item.tinned_food')).toEqual([{ itemId: 'item.tinned_food', count: 5 }]);
    addItems(s, 'item.raw_meat', 1, content);
    s.clockMinutes += 10;
    addItems(s, 'item.raw_meat', 1, content);
    expect(s.inventory.stacks.filter((st) => st.itemId === 'item.raw_meat')).toHaveLength(2);
  });

  it('carries up to 50 kg and refuses more (D-036)', () => {
    const s = withItems([['item.firewood', 24]]);
    expect(carriedKg(s.inventory, content)).toBeCloseTo(48.65);
    expect(addItems(s, 'item.firewood', 1, content)).toMatchObject({ ok: false, error: { code: 'too_heavy' } });
    expect(addItems(s, 'item.scrap_metal', 1, content).ok).toBe(true);
  });

  it('raises drain evenly from ×1 at 25 kg to ×2 at 50 kg', () => {
    const carry = content.survival.carry;
    expect(loadMultiplier(10, carry)).toBe(1);
    expect(loadMultiplier(25, carry)).toBe(1);
    expect(loadMultiplier(37.5, carry)).toBeCloseTo(1.5);
    expect(loadMultiplier(50, carry)).toBeCloseTo(2);
  });
});

describe('using items', () => {
  it('eats food, capped at 100, and uses one from the stack', () => {
    const s = withItems([['item.tinned_food', 2]], (g) => (g.survival.food = 80));
    const { state } = ok(s, { type: 'item.use', index: indexOf(s, 'item.tinned_food') });
    expect(state.survival.food).toBe(100);
    expect(state.inventory.stacks[indexOf(state, 'item.tinned_food')]!.count).toBe(1);
  });

  it('drinking leaves an empty bottle; boiled water is always safe', () => {
    let s = withItems([['item.boiled_water', 1]], (g) => (g.survival.water = 50));
    s = ok(s, { type: 'item.use', index: indexOf(s, 'item.boiled_water') }).state;
    expect(s.survival.water).toBe(75);
    expect(s.survival.illUntil).toBeNull();
    expect(indexOf(s, 'item.boiled_water')).toBe(-1);
    expect(indexOf(s, 'item.empty_bottle')).toBeGreaterThanOrEqual(0);
  });

  it('makes him ill from unsafe water about one time in five, reproducibly (D-027)', () => {
    let ill = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = withItems([['item.unsafe_water', 1]], () => {}, seed);
      const result = ok(s, { type: 'item.use', index: indexOf(s, 'item.unsafe_water') });
      if (result.state.survival.illUntil !== null) {
        ill += 1;
        expect(result.events).toContainEqual({ type: 'fell_ill' });
        expect(result.state.survival.illUntil).toBe(s.clockMinutes + 1440);
      }
      expect(ok(s, { type: 'item.use', index: indexOf(s, 'item.unsafe_water') }).state).toEqual(result.state);
    }
    expect(ill).toBeGreaterThan(20);
    expect(ill).toBeLessThan(60);
  });

  it('cures an injury with a bandage, which then heals; painkillers wait for the cure (D-039)', () => {
    const s = withItems([['item.cloth_bandage', 1], ['item.old_pills', 1]], (g) => Object.assign(g.survival, { health: 50, injured: true }));
    expect(applyCommand(s, { type: 'item.use', index: indexOf(s, 'item.old_pills') }, content)).toMatchObject({ ok: false, error: { code: 'injured' } });
    const cured = ok(s, { type: 'item.use', index: indexOf(s, 'item.cloth_bandage') });
    expect(cured.events).toContainEqual({ type: 'injury_cured' });
    expect(cured.state.survival).toMatchObject({ injured: false, health: 60 });
    const pills = ok(cured.state, { type: 'item.use', index: indexOf(cured.state, 'item.old_pills') });
    expect(pills.state.survival.health).toBe(80);
  });

  it('cranks the charger for 30 minutes to add 25% to the torch, keeping the charger (D-037)', () => {
    const s = withItems([['item.crank_charger', 1]]);
    const { state } = ok(s, { type: 'item.use', index: indexOf(s, 'item.crank_charger') });
    expect(state.inventory.stacks.find((st) => st.itemId === 'item.torch')!.charge).toBe(75);
    expect(state.clockMinutes).toBe(s.clockMinutes + 30);
    expect(indexOf(state, 'item.crank_charger')).toBeGreaterThanOrEqual(0);
  });

  it('refills the lighter with lighter fuel, using the fuel up', () => {
    const s = withItems([['item.lighter_fuel', 1]]);
    const { state } = ok(s, { type: 'item.use', index: indexOf(s, 'item.lighter_fuel') });
    expect(state.inventory.stacks.find((st) => st.itemId === 'item.lighter')!.charge).toBe(20);
    expect(indexOf(state, 'item.lighter_fuel')).toBe(-1);
    expect(applyCommand(withItems([['item.lighter_fuel', 1]], (g) => (g.inventory.stacks[0]!.charge = 20)), { type: 'item.use', index: 2 }, content))
      .toMatchObject({ ok: false, error: { code: 'nothing_to_recharge' } });
  });

  it('refuses items that do nothing on their own, and bad indexes', () => {
    const s = withItems([['item.raw_meat', 1]]);
    expect(applyCommand(s, { type: 'item.use', index: indexOf(s, 'item.raw_meat') }, content)).toMatchObject({ ok: false, error: { code: 'cannot_use' } });
    expect(applyCommand(s, { type: 'item.use', index: 99 }, content)).toMatchObject({ ok: false, error: { code: 'bad_item' } });
    expect(applyCommand(s, { type: 'item.use', index: 0.5 }, content)).toMatchObject({ ok: false, error: { code: 'bad_item' } });
  });
});

describe('equip and drop', () => {
  it('swaps weapons, returning the old one to the pack', () => {
    const s = withItems([['item.aruval', 1]]);
    const { state } = ok(s, { type: 'item.equip', index: indexOf(s, 'item.aruval') });
    expect(state.inventory.weapon).toBe('item.aruval');
    expect(indexOf(state, 'item.aruval')).toBe(-1);
    expect(indexOf(state, 'item.hunting_knife')).toBeGreaterThanOrEqual(0);
    expect(carriedKg(state.inventory, content)).toBeCloseTo(carriedKg(s.inventory, content));
  });

  it('refuses to equip a non-weapon or unequip nothing', () => {
    const s = withItems([['item.salt', 1]]);
    expect(applyCommand(s, { type: 'item.equip', index: indexOf(s, 'item.salt') }, content)).toMatchObject({ ok: false, error: { code: 'not_a_weapon' } });
    const bare = ok(s, { type: 'item.unequip' }).state;
    expect(applyCommand(bare, { type: 'item.unequip' }, content)).toMatchObject({ ok: false, error: { code: 'no_weapon' } });
  });

  it('drops some or all of a stack and rejects bad counts', () => {
    const s = withItems([['item.bamboo', 3]]);
    const i = indexOf(s, 'item.bamboo');
    expect(ok(s, { type: 'item.drop', index: i, count: 2 }).state.inventory.stacks[i]!.count).toBe(1);
    expect(indexOf(ok(s, { type: 'item.drop', index: i, count: 3 }).state, 'item.bamboo')).toBe(-1);
    for (const count of [0, 4, 1.5]) {
      expect(applyCommand(s, { type: 'item.drop', index: i, count }, content)).toMatchObject({ ok: false, error: { code: 'bad_item' } });
    }
  });
});
