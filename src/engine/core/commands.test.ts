import { describe, expect, it } from 'vitest';
import { loadContent } from '../../content/loader';
import { applyCommand } from './commands';
import { createNewGame } from './state';

describe('applyCommand', () => {
  it('rejects unknown commands without touching state', () => {
    const state = createNewGame(loadContent(), 7);
    const before = structuredClone(state);
    const result = applyCommand(state, { type: 'does.not_exist' });
    expect(result).toEqual({ ok: false, error: { code: 'unknown_command', message: 'Unknown command: does.not_exist' } });
    expect(state).toEqual(before);
  });
});

describe('createNewGame', () => {
  it('starts as Prabu at time zero with the given seed', () => {
    expect(createNewGame(loadContent(), 123)).toEqual({ rngState: 123, clockMinutes: 0, player: { characterId: 'character.prabu' } });
  });
});
