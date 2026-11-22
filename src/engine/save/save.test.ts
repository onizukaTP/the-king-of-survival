import { describe, expect, it } from 'vitest';
import { loadContent } from '../../content/loader';
import { applyCommand } from '../core/commands';
import { createNewGame } from '../core/state';
import { createSave, loadSave, SAVE_VERSION } from './save';

const content = loadContent();

describe('save/load', () => {
  const state = createNewGame(content, 99);

  it('round-trips through JSON to an identical state, including a trip under way', () => {
    const started = applyCommand(state, { type: 'travel.start', target: { siteId: 'loc.nh744' } }, content);
    if (!started.ok) throw new Error(started.error.code);
    const moved = applyCommand(started.state, { type: 'travel.advance' }, content);
    if (!moved.ok) throw new Error(moved.error.code);
    for (const s of [state, moved.state]) {
      const raw = JSON.parse(JSON.stringify(createSave(s, '2026-01-01T00:00:00.000Z')));
      const result = loadSave(raw, content);
      expect(result.ok && result.save.gameState).toEqual(s);
    }
  });

  it('migrates an M0 (v1) save: same seed, start position, known places, clock moved to 06:00', () => {
    const v1 = { saveVersion: 1, createdAt: 'x', gameState: { rngState: 42, clockMinutes: 0, player: { characterId: 'character.prabu' } } };
    const result = loadSave(v1, content);
    if (!result.ok) throw new Error(result.error);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    expect(result.save.gameState).toEqual({ ...createNewGame(content, 42) });
  });

  it('migrates an M1 (v2) save: keeps the trip state, adds full meters and the starting kit', () => {
    const v2State: Record<string, unknown> = { ...state, clockMinutes: 2000 };
    for (const key of ['survival', 'inventory', 'dead']) delete v2State[key];
    const result = loadSave({ saveVersion: 2, createdAt: 'x', gameState: v2State }, content);
    if (!result.ok) throw new Error(result.error);
    expect(result.save.gameState.clockMinutes).toBe(2000);
    expect(result.save.gameState.survival).toMatchObject({ health: 100, food: 100, water: 100, rest: 100 });
    expect(result.save.gameState.inventory.weapon).toBe('item.hunting_knife');
    expect(result.save.gameState.dead).toBe(false);
  });

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['no version', { gameState: state }],
    ['a future version', { saveVersion: SAVE_VERSION + 1, createdAt: 'x', gameState: state }],
    ['a version with no migration', { saveVersion: 0, createdAt: 'x', gameState: state }],
    ['a corrupted state', { saveVersion: SAVE_VERSION, createdAt: 'x', gameState: { ...state, clockMinutes: -5 } }],
    ['a broken v1 save', { saveVersion: 1, createdAt: 'x', gameState: null }],
    ['an unknown place', { saveVersion: SAVE_VERSION, createdAt: 'x', gameState: { ...state, map: { ...state.map, discoveredSiteIds: ['loc.atlantis'] } } }],
    ['an unknown item', { saveVersion: SAVE_VERSION, createdAt: 'x', gameState: { ...state, inventory: { stacks: [{ itemId: 'item.gold', count: 1 }], weapon: null } } }],
    ['a meter out of range', { saveVersion: SAVE_VERSION, createdAt: 'x', gameState: { ...state, survival: { ...state.survival, food: 140 } } }],
    ['an unknown character', { saveVersion: SAVE_VERSION, createdAt: 'x', gameState: { ...state, player: { ...state.player, characterId: 'character.ghost' } } }],
  ])('rejects %s', (_, raw) => {
    expect(loadSave(raw, content).ok).toBe(false);
  });
});
