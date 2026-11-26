import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { playerStats } from '../combat/stats';
import { addCondition } from '../conditions/conditions';
import { addItems } from '../inventory/inventory';
import { passTime } from '../survival/survival';
import { carryLimits, charmEffects } from './charms';

const content = loadContent();
const fresh = () => createNewGame(content, 1);
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code} ${result.error.message}`);
  return result.state;
}
const indexOf = (s: GameState, itemId: string) => s.inventory.stacks.findIndex((x) => x.itemId === itemId);
function wear(s: GameState, itemId: string) {
  addItems(s, itemId, 1, content);
  return ok(s, { type: 'charm.wear', index: indexOf(s, itemId) });
}

describe('wearing charms (D-086, P-022)', () => {
  it('moves a charm from the pack to its slot, weightless, and back', () => {
    const s = wear(fresh(), 'item.iron_ring');
    expect(s.inventory.charms).toEqual(['item.iron_ring']);
    expect(indexOf(s, 'item.iron_ring')).toBe(-1);
    const off = ok(s, { type: 'charm.remove', itemId: 'item.iron_ring' });
    expect(off.inventory.charms).toEqual([]);
    expect(indexOf(off, 'item.iron_ring')).toBeGreaterThanOrEqual(0);
  });

  it('allows two rings but not a third, and never the same charm twice', () => {
    let s = wear(fresh(), 'item.iron_ring');
    s = wear(s, 'item.copper_ring');
    addItems(s, 'item.panchaloha_ring', 1, content);
    const third = applyCommand(s, { type: 'charm.wear', index: indexOf(s, 'item.panchaloha_ring') }, content);
    expect(third.ok || third.error.code).toBe('slot_full');
    const t = wear(fresh(), 'item.iron_ring');
    addItems(t, 'item.iron_ring', 1, content);
    const twice = applyCommand(t, { type: 'charm.wear', index: indexOf(t, 'item.iron_ring') }, content);
    expect(twice.ok || twice.error.code).toBe('already_worn');
  });

  it('refuses to wear what is not a charm', () => {
    const s = fresh();
    const r = applyCommand(s, { type: 'charm.wear', index: indexOf(s, 'item.lighter') }, content);
    expect(r.ok || r.error.code).toBe('not_a_charm');
  });
});

describe('charm effects (P-022)', () => {
  it('adds stats: Luck from rings and earrings, crit damage, dodge', () => {
    const before = playerStats(fresh(), content);
    let s = wear(fresh(), 'item.navaratna_ring');
    s = wear(s, 'item.panchaloha_ring');
    s = wear(s, 'item.gold_kadukkan');
    const after = playerStats(s, content);
    expect(after.luck - before.luck).toBe(10);
    expect(after.critRate - before.critRate).toBe(2);
    expect(after.critDamage - before.critDamage).toBe(10);
  });

  it('the silver waist chain raises the free carry weight to 28 kg', () => {
    expect(carryLimits(wear(fresh(), 'item.silver_waist_chain'), content).freeKg).toBe(28);
    expect(carryLimits(fresh(), content).freeKg).toBe(25);
  });

  it('the rudraksha slows Rest drain and halves how long Shaken lasts', () => {
    const plain = fresh();
    const s = wear(fresh(), 'item.rudraksha_bead');
    passTime(plain, 60, 'work', content, []);
    passTime(s, 60, 'work', content, []);
    expect(100 - s.survival.rest).toBeCloseTo((100 - plain.survival.rest) * 0.9);
    addCondition(s, 'condition.shaken', content, []);
    expect(s.survival.conditions[0]!.until).toBe(s.clockMinutes + 240);
  });

  it('collects every multiplier', () => {
    let s = wear(fresh(), 'item.copper_thayathu');
    s = wear(s, 'item.copper_ring');
    s = wear(s, 'item.steel_bangle');
    s = wear(s, 'item.silver_bangle');
    expect(charmEffects(s.inventory, content)).toMatchObject({ threat: 0.8, illness: 0.5, searchTime: 0.9, darkRisk: 0.75 });
  });

  it('stainless steel bangles make a search 10% shorter', () => {
    const at = (s: GameState) => {
      s.player.position = { lat: content.sites['loc.nh744']!.lat, lon: content.sites['loc.nh744']!.lon };
      s.introSeen = true;
      return s;
    };
    const plain = ok(at(fresh()), { type: 'scavenge.search', torch: false });
    const bangle = ok(at(wear(fresh(), 'item.steel_bangle')), { type: 'scavenge.search', torch: false });
    const start = content.newGame.startClockMinutes;
    expect(bangle.clockMinutes - start).toBe(Math.round((plain.clockMinutes - start) * 0.9));
  });
});
