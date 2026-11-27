import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command } from '../../core/commands';
import { createNewGame } from '../../core/state';
import { loadSave } from '../../save/save';
import { progress } from '../progression/progression';

const content = loadContent();
const run = (command: Command, s = createNewGame(content, 1)) => applyCommand(s, command, content);

describe('testing tools (D-068)', () => {
  it('opens any event; one that resolves itself (the ambush) goes straight into the fight', () => {
    const r = run({ type: 'debug.event', eventId: 'event.snake' });
    expect(r.ok && r.state.event).toEqual({ id: 'event.snake', result: null });
    const ambush = run({ type: 'debug.event', eventId: 'event.ambush' });
    expect(ambush.ok && ambush.state.event).toBeNull();
    expect(ambush.ok && ambush.state.combat?.combatants.filter((c) => c.side === 'enemy').every((c) => c.defId === 'enemy.raider_blade')).toBe(true);
    expect(run({ type: 'debug.event', eventId: 'event.dragon' })).toMatchObject({ ok: false });
  });

  it('starts any fight, ambush or not, and refuses an empty one', () => {
    const r = run({ type: 'debug.fight', enemies: [{ enemyId: 'enemy.wild_dog', count: 2 }, { enemyId: 'enemy.mutated_boar', count: 1 }], ambush: false });
    // Two dogs and the boar (two ranks) fill the four enemy ranks exactly; they may have moved before Prabu's first turn.
    const enemies = r.ok ? r.state.combat!.combatants.filter((c) => c.side === 'enemy') : [];
    expect(enemies.map((c) => c.defId).sort()).toEqual(['enemy.mutated_boar', 'enemy.wild_dog', 'enemy.wild_dog']);
    expect(enemies.flatMap((c) => Array.from({ length: c.size }, (_, i) => c.rank + i)).sort()).toEqual([1, 2, 3, 4]);
    const a = run({ type: 'debug.fight', enemies: [{ enemyId: 'enemy.raider_bow', count: 1 }], ambush: true });
    expect(a.ok && a.state.combat!.round).toBe(2);
    expect(run({ type: 'debug.fight', enemies: [{ enemyId: 'enemy.wild_dog', count: 0 }], ambush: false })).toMatchObject({ ok: false, error: { code: 'bad_target' } });
  });

  it('jumps to the next 22:00 without draining anything; refused while a card or fight is open', () => {
    const s = createNewGame(content, 1);
    const r = run({ type: 'debug.night' }, s);
    expect(r.ok && r.state.clockMinutes).toBe(22 * 60);
    expect(r.ok && r.state.survival).toEqual(s.survival);
    const again = r.ok ? run({ type: 'debug.night' }, r.state) : null;
    expect(again?.ok && again.state.clockMinutes).toBe(24 * 60 + 22 * 60);
    const open = run({ type: 'debug.event', eventId: 'event.snake' });
    expect(open.ok && run({ type: 'debug.night' }, open.state)).toMatchObject({ ok: false, error: { code: 'event_open' } });
  });

  it('gives any item, leaving what is past 50 kg on the ground', () => {
    const r = run({ type: 'debug.item', itemId: 'item.navaratna_ring', count: 2 });
    expect(r.ok && r.state.inventory.stacks.find((x) => x.itemId === 'item.navaratna_ring')?.count).toBe(2);
    const heavy = run({ type: 'debug.item', itemId: 'item.biodiesel', count: 12 });
    expect(heavy.ok && heavy.state.ground.length).toBe(1);
    expect(run({ type: 'debug.item', itemId: 'item.dragon', count: 1 })).toMatchObject({ ok: false });
  });

  it("parks any vehicle here in full repair, and sets the ridden vehicle's durability and fuel", () => {
    const r = run({ type: 'debug.vehicle', vehicleId: 'vehicle.auto_rickshaw' });
    if (!r.ok) throw new Error(r.error.message);
    expect(r.state.vehicles.list[0]).toMatchObject({ vehicleId: 'vehicle.auto_rickshaw', durability: 100, fuel: 10, cargo: [] });
    expect(run({ type: 'debug.vehicleState', durability: 5, fuel: 1 }, r.state)).toMatchObject({ ok: false, error: { code: 'no_vehicle' } });
    const on = run({ type: 'vehicle.board', uid: r.state.vehicles.list[0]!.uid }, r.state);
    const set = on.ok ? run({ type: 'debug.vehicleState', durability: 5, fuel: 99 }, on.state) : on;
    expect(set.ok && set.state.vehicles.list[0]).toMatchObject({ durability: 5, fuel: 10 });
  });
});

describe('XP multiplier (owner, 2026-11-27)', () => {
  it('multiplies every XP gain, keeps it in the save, and refuses values outside 0–100', () => {
    const set = run({ type: 'debug.xpMultiplier', multiplier: 10 });
    if (!set.ok) throw new Error(set.error.message);
    expect(set.state.progression).toMatchObject({ xp: 0, xpMultiplier: 10 });
    // A discovery is 15 XP; ×10 gives 150, which is level 4 (100) but not level 5 (155).
    const events = progress(structuredClone(set.state), [{ type: 'site_discovered', siteId: 'loc.rajapalayam' }], content);
    expect(events[0]).toEqual({ type: 'xp_gained', amount: 150 });
    expect(events.filter((e) => e.type === 'level_up').map((e) => (e as { level: number }).level)).toEqual([2, 3, 4]);
    for (const bad of [-1, 101, Number.NaN]) expect(run({ type: 'debug.xpMultiplier', multiplier: bad }).ok).toBe(false);
    expect(run({ type: 'debug.xpMultiplier', multiplier: 0 }).ok).toBe(true);
  });

  it('migrates a v11 save to normal XP and the level its XP reaches on the new table (D-091)', () => {
    const v11 = structuredClone(createNewGame(content, 1)) as unknown as { progression: Record<string, unknown> };
    delete v11.progression.xpMultiplier;
    v11.progression.xp = 123;
    v11.progression.level = 2;
    const result = loadSave({ saveVersion: 11, createdAt: 'x', gameState: v11 }, content);
    if (!result.ok) throw new Error(result.error);
    expect(result.save.gameState.progression).toMatchObject({ xp: 123, level: 4, xpMultiplier: 1 });
  });
});
