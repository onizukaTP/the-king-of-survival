import { describe, expect, it } from 'vitest';
import { loadContent } from '../../../content/loader';
import { applyCommand, type Command } from '../../core/commands';
import { createNewGame, type GameState } from '../../core/state';
import { darkMinutes, isDark, isFullMoonNight, isNight } from './night';

const loaded = loadContent();
// Night tests only look at the torch; events are tested on their own.
const content = { ...loaded, events: { ...loaded.events, events: [] } };
const cfg = content.world.night;
const at = (day: number, hh: number, mm = 0) => (day - 1) * 1440 + hh * 60 + mm;

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command, content);
  if (!result.ok) throw new Error(`${command.type} failed: ${result.error.code}`);
  return result;
}
const torch = (s: GameState) => s.inventory.stacks.find((st) => st.itemId === 'item.torch')?.charge;

describe('night and the moon (D-060)', () => {
  it('runs from 18:30 to 06:00', () => {
    expect(isNight(at(1, 18, 29), cfg)).toBe(false);
    expect(isNight(at(1, 18, 30), cfg)).toBe(true);
    expect(isNight(at(2, 5, 59), cfg)).toBe(true);
    expect(isNight(at(2, 6), cfg)).toBe(false);
  });

  it('has full-moon nights on days 14 to 16 of each 30-day cycle; a night belongs to its evening', () => {
    expect(isFullMoonNight(at(13, 22), cfg)).toBe(false);
    expect(isFullMoonNight(at(14, 22), cfg)).toBe(true);
    expect(isFullMoonNight(at(15, 3), cfg)).toBe(true);
    expect(isFullMoonNight(at(17, 3), cfg)).toBe(true);
    expect(isFullMoonNight(at(17, 22), cfg)).toBe(false);
    expect(isFullMoonNight(at(44, 22), cfg)).toBe(true);
    expect(isFullMoonNight(at(14, 12), cfg)).toBe(false);
    expect(isDark(at(14, 22), cfg)).toBe(false);
    expect(isDark(at(13, 22), cfg)).toBe(true);
  });

  it('counts the dark minutes of a stretch of time', () => {
    expect(darkMinutes(at(1, 18), 60, cfg)).toBe(30);
    expect(darkMinutes(at(1, 12), 60, cfg)).toBe(0);
    expect(darkMinutes(at(14, 20), 60, cfg)).toBe(0);
  });
});

describe('the torch on the road (P-015)', () => {
  const trip = (clock: number, change: (s: GameState) => void = () => {}) => {
    const s = createNewGame(content, 1);
    s.clockMinutes = clock;
    change(s);
    const started = ok(s, { type: 'travel.start', target: { siteId: 'loc.srivilliputhur' } }).state;
    return { leg: started.travel!.legs[0]!, after: ok(started, { type: 'travel.advance' }) };
  };

  it('switches on by itself in the dark and uses 10% an hour', () => {
    const { leg, after } = trip(at(1, 20));
    expect(torch(after.state)).toBe(50 - Math.ceil(leg.minutes / 6));
  });

  it('stays off by day and on full-moon nights', () => {
    expect(torch(trip(at(1, 9)).after.state)).toBe(50);
    expect(torch(trip(at(14, 21)).after.state)).toBe(50);
  });

  it('says so when it runs flat', () => {
    const { after } = trip(at(1, 20), (s) => (s.inventory.stacks.find((st) => st.itemId === 'item.torch')!.charge = 2));
    expect(torch(after.state)).toBe(0);
    expect(after.events).toContainEqual({ type: 'torch_flat' });
  });
});
