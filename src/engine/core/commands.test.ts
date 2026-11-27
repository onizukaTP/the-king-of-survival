import { describe, expect, it } from 'vitest';
import { loadContent } from '../../content/loader';
import { applyCommand, type Command } from './commands';
import { createNewGame } from './state';

const content = loadContent();

describe('applyCommand', () => {
  it('rejects unknown commands without touching state', () => {
    const state = createNewGame(content, 7);
    const before = structuredClone(state);
    const result = applyCommand(state, { type: 'does.not_exist' } as unknown as Command, content);
    expect(result).toEqual({ ok: false, error: { code: 'unknown_command', message: 'Unknown command: does.not_exist' } });
    expect(state).toEqual(before);
  });

  it('turns a thrown error into internal_error', () => {
    const state = createNewGame(content, 7);
    const broken = { ...content, sites: null } as unknown as typeof content;
    const result = applyCommand(state, { type: 'travel.start', target: { siteId: 'loc.srivilliputhur' } }, broken);
    expect(result.ok || result.error.code).toBe('internal_error');
  });
});

describe('createNewGame', () => {
  it('starts Prabu at home on Day 1 12:00 knowing the nearby places, before the intro (D-017, D-075)', () => {
    const state = createNewGame(content, 123);
    expect(state.rngState).toBe(123);
    expect(state.clockMinutes).toBe(720);
    expect(state.introSeen).toBe(false);
    expect(state.progression).toEqual({ xp: 0, level: 1, crafted: [], xpMultiplier: 1 });
    expect(state.player.position).toEqual({ lat: 9.5599, lon: 77.6251 });
    expect(state.map.discoveredSiteIds.sort()).toEqual(
      ['loc.home', 'loc.nh744', 'loc.sanctuary_forest', 'loc.srivilliputhur', 'loc.srivilliputhur_station'].sort(),
    );
    expect(state.map.revealed).toHaveLength(1);
    expect(state.travel).toBeNull();
  });
});
