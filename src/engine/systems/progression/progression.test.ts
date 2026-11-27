import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command, type GameEvent } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { loadSave } from '../../save/save';
import { playerStats } from '../combat/stats';
import { addItems } from '../inventory/inventory';
import { levelGains, progress } from './progression';

const content = loadContent();
const fresh = () => createNewGame(content, 1);
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code} ${result.error.message}`);
  return result;
}
const xpOf = (events: GameEvent[]) => events.reduce((n, e) => n + (e.type === 'xp_gained' ? e.amount : 0), 0);

describe('XP sources (D-070, D-076)', () => {
  it('gives XP for discovering a place, a search with finds and a successful hunt, and a note for the place', () => {
    const s = fresh();
    expect(xpOf(progress(s, [{ type: 'site_discovered', siteId: 'loc.rajapalayam' }], content))).toBe(15);
    expect(s.journal.notes).toEqual([{ at: s.clockMinutes, kind: 'discovered', siteId: 'loc.rajapalayam' }]);
    expect(xpOf(progress(s, [{ type: 'searched', finds: [{ itemId: 'item.cloth', count: 1 }], torch: false }], content))).toBe(2);
    expect(xpOf(progress(s, [{ type: 'searched', finds: [], torch: false }], content))).toBe(0);
    expect(xpOf(progress(s, [{ type: 'hunted', finds: [], success: true }], content))).toBe(10);
    expect(xpOf(progress(s, [{ type: 'hunted', finds: [], success: false }], content))).toBe(0);
    expect(s.progression.xp).toBe(27);
  });

  it('gives the first craft of a recipe 5 XP, and the second nothing', () => {
    const s = fresh();
    addItems(s, 'item.cloth', 4, content);
    const first = ok(s, { type: 'craft', recipeId: 'recipe.cloth_bandage' });
    expect(xpOf(first.events)).toBe(5);
    const second = ok(first.state, { type: 'craft', recipeId: 'recipe.cloth_bandage' });
    expect(xpOf(second.events)).toBe(0);
    expect(second.state.progression).toMatchObject({ xp: 5, crafted: ['recipe.cloth_bandage'] });
  });

  it('gives event outcomes their XP: catching the goat 10, letting it be nothing', () => {
    const s = fresh();
    expect(xpOf(progress(s, [{ type: 'event_resolved', eventId: 'event.stray_goat', choiceId: 'catch', outcome: 0 }], content))).toBe(10);
    expect(xpOf(progress(s, [{ type: 'event_resolved', eventId: 'event.stray_goat', choiceId: 'catch', outcome: 1 }], content))).toBe(0);
    expect(xpOf(progress(s, [{ type: 'event_resolved', eventId: 'event.stray_goat', choiceId: 'leave', outcome: 0 }], content))).toBe(0);
  });

  it('gives a won fight the XP of every enemy defeated and a note; fleeing gives none', () => {
    const s = ok(fresh(), { type: 'debug.fight', enemies: [{ enemyId: 'enemy.wild_dog', count: 2 }], ambush: false }).state;
    s.combat!.defeated = ['enemy.wild_dog', 'enemy.wild_dog'];
    expect(xpOf(progress(s, [{ type: 'combat_ended', outcome: 'fled' }], content))).toBe(0);
    expect(xpOf(progress(s, [{ type: 'combat_ended', outcome: 'won' }], content))).toBe(20);
    // 20 XP is level 2 now (D-091), so the level note may come after the fight's note.
    expect(s.journal.notes).toContainEqual(expect.objectContaining({ kind: 'won', enemies: ['enemy.wild_dog', 'enemy.wild_dog'] }));
  });

  it('gives a dead man nothing', () => {
    const s = fresh();
    s.dead = true;
    expect(progress(s, [{ type: 'site_discovered', siteId: 'loc.rajapalayam' }], content)).toEqual([]);
  });
});

describe('levels (D-076)', () => {
  it('levels up at each threshold, several at once if need be, with a note for each', () => {
    const s = fresh();
    const events = progress(s, [{ type: 'event_resolved', eventId: 'event.stray_goat', choiceId: 'catch', outcome: 0 }], content);
    expect(events).toEqual([{ type: 'xp_gained', amount: 10 }]);
    s.progression.xp = 50;
    const up = progress(s, [{ type: 'site_discovered', siteId: 'loc.rajapalayam' }], content);
    expect(up.filter((e) => e.type === 'level_up')).toEqual([{ type: 'level_up', level: 2 }, { type: 'level_up', level: 3 }]);
    expect(s.progression.level).toBe(3);
    expect(s.journal.notes.filter((n) => n.kind === 'level').map((n) => n.level)).toEqual([2, 3]);
  });

  it('stops at level 10, though XP still counts', () => {
    const s = fresh();
    s.progression.xp = 100000;
    progress(s, [{ type: 'site_discovered', siteId: 'loc.rajapalayam' }], content);
    expect(s.progression).toMatchObject({ level: 10, xp: 100015 });
  });

  it('adds the fixed gains of every level reached to his stats, in fights and hunts alike', () => {
    expect(levelGains(1, content)).toEqual({});
    expect(levelGains(3, content)).toEqual({ atk: 1, acc: 3, dodge: 2 });
    expect(levelGains(10, content)).toEqual({ atk: 3, acc: 6, dodge: 4, spd: 2, hunting: 5, critRate: 5, def: 5, deathblowRes: 5 });
    const s = fresh();
    const before = playerStats(s, content);
    s.progression.level = 5;
    const after = playerStats(s, content);
    expect(after.atk - before.atk).toBe(1);
    expect(after.hunting - before.hunting).toBe(5);
    expect(after.critRate - before.critRate).toBe(2);
  });

  it('keeps the last 30 journal notes', () => {
    const s = fresh();
    const siteIds = Object.keys(content.sites);
    for (let i = 0; i < 35; i++) {
      s.clockMinutes += 1;
      progress(s, [{ type: 'site_discovered', siteId: siteIds[i % siteIds.length]! }], content);
    }
    expect(s.journal.notes).toHaveLength(30);
    // The newest stays; the first discoveries went.
    expect(s.journal.notes.at(-1)!.at).toBe(s.clockMinutes);
    expect(s.journal.notes.some((n) => n.at === s.clockMinutes - 34)).toBe(false);
  });
});

describe('the intro (D-071, D-076)', () => {
  it('a new run starts before the intro, at 12:00; intro.done marks it seen', () => {
    const s = fresh();
    expect(s.introSeen).toBe(false);
    expect(s.clockMinutes).toBe(12 * 60);
    const r = ok(s, { type: 'intro.done' });
    expect(r.state.introSeen).toBe(true);
    expect(r.events).toEqual([{ type: 'intro_done' }]);
    expect(r.state.clockMinutes).toBe(s.clockMinutes);
  });

  it('ships five intro screens and the sister entry', () => {
    expect(content.story.intro.screens).toHaveLength(5);
    expect(content.story.journal.quest.title).toBe('Find my sister');
  });
});

describe('save v10 (D-076)', () => {
  it('migrates a v9 run to level 1, no XP, an empty journal and the intro seen', () => {
    const v9: Record<string, unknown> = { ...fresh() };
    for (const key of ['progression', 'journal', 'introSeen']) delete v9[key];
    const result = loadSave({ saveVersion: 9, createdAt: 'x', gameState: v9 }, content);
    if (!result.ok) throw new Error(result.error);
    expect(result.save.gameState).toMatchObject({ progression: { xp: 0, level: 1, crafted: [] }, journal: { notes: [] }, introSeen: true });
  });
});
