import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command } from '../../core/commands';
import { createNewGame } from '../../core/state';

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
});
