import { describe, expect, it } from 'vitest';
import { loadContent } from '../../content/loader';
import { createNewGame } from '../core/state';
import { createSave, loadSave, SAVE_VERSION } from './save';

describe('save/load', () => {
  const state = createNewGame(loadContent(), 99);

  it('round-trips through JSON to an identical state', () => {
    const raw = JSON.parse(JSON.stringify(createSave(state, '2026-01-01T00:00:00.000Z')));
    const result = loadSave(raw);
    expect(result.ok && result.save.gameState).toEqual(state);
  });

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['no version', { gameState: state }],
    ['a future version', { saveVersion: SAVE_VERSION + 1, createdAt: 'x', gameState: state }],
    ['a version with no migration', { saveVersion: 0, createdAt: 'x', gameState: state }],
    ['a corrupted state', { saveVersion: SAVE_VERSION, createdAt: 'x', gameState: { ...state, clockMinutes: -5 } }],
  ])('rejects %s', (_, raw) => {
    expect(loadSave(raw).ok).toBe(false);
  });
});
