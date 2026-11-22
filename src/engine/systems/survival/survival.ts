import type { Content } from '../../../content/loader';
import type { CommandResult, DeathCause, GameEvent } from '../../core/commands';
import type { GameState, Meter } from '../../core/state';
import { carriedKg, loadMultiplier } from '../inventory/inventory';

/** What Prabu is doing while time passes: only travel carries the overload cost, only sleep restores Rest. */
export type Activity = 'travel' | 'sleep' | 'work';

const METERS: Meter[] = ['health', 'food', 'water', 'rest'];
// Snaps float dust to the ends so "empty" and "full" are exact (10 − 60 × 10/60 must be 0, not 1e-15).
const clamp = (v: number) => (v < 1e-9 ? 0 : v > 100 - 1e-9 ? 100 : v);

/**
 * Advances the clock minute by minute, applying survival drain (D-023, D-035, D-036, D-027),
 * then spoils food (D-028). Stops early if Prabu dies. Mutates `state`, which is always a copy.
 */
export function passTime(state: GameState, minutes: number, activity: Activity, content: Content, events: GameEvent[]) {
  const cfg = content.survival;
  const s = state.survival;
  const before = { ...s };
  const load = activity === 'travel' ? loadMultiplier(carriedKg(state.inventory, content), cfg.carry) : 1;

  // Stepping by the minute keeps every threshold (Rest hitting 0, a meter emptying) exact, and is cheap.
  for (let i = 0; i < minutes; i++) {
    const exhausted = s.rest <= 0 ? cfg.exhaustedDrainMultiplier : 1;
    const ill = s.illUntil !== null ? cfg.illness.waterDrainMultiplier : 1;
    s.food = clamp(s.food - (cfg.drainPerHour.food / 60) * exhausted * load);
    s.water = clamp(s.water - (cfg.drainPerHour.water / 60) * exhausted * load * ill);
    s.rest = activity === 'sleep' ? clamp(s.rest + cfg.sleepRestPerHour / 60) : clamp(s.rest - (cfg.drainPerHour.rest / 60) * load);

    const emptyMeters = (s.food <= 0 ? 1 : 0) + (s.water <= 0 ? 1 : 0);
    s.health = clamp(s.health - (cfg.emptyMeterHealthPerHour / 60) * emptyMeters);
    const canHeal = activity === 'sleep' && !s.injured && s.food > cfg.sleepHealAbove && s.water > cfg.sleepHealAbove;
    if (canHeal) s.health = clamp(s.health + cfg.sleepHealthPerHour / 60);

    state.clockMinutes += 1;
    if (s.illUntil !== null && state.clockMinutes >= s.illUntil) {
      s.illUntil = null;
      events.push({ type: 'recovered' });
    }
    if (s.health <= 0) {
      state.dead = true;
      const cause: DeathCause = s.food <= 0 && s.water <= 0 ? 'hunger_and_thirst' : s.food <= 0 ? 'hunger' : 'thirst';
      events.push({ type: 'died', cause });
      return;
    }
  }

  for (const meter of METERS) {
    if (before[meter] > 0 && s[meter] <= 0) events.push({ type: 'meter_low', meter, empty: true });
    else if (before[meter] > cfg.warnAt && s[meter] <= cfg.warnAt) events.push({ type: 'meter_low', meter, empty: false });
  }

  state.inventory.stacks = state.inventory.stacks.filter((stack) => {
    if (stack.spoilsAt === undefined || stack.spoilsAt > state.clockMinutes) return true;
    events.push({ type: 'item_spoiled', itemId: stack.itemId, count: stack.count });
    return false;
  });
}

/** Sleeps for a while, anywhere (D-035). Resolves instantly; the clock jumps. */
export function rest(state: GameState, minutes: number | 'until_rested', content: Content): CommandResult {
  if (state.travel) return { ok: false, error: { code: 'travel_in_progress', message: 'Prabu can\'t rest while travelling.' } };
  let duration: number;
  if (minutes === 'until_rested') {
    const missing = 100 - state.survival.rest;
    if (missing < 0.5) return { ok: false, error: { code: 'already_rested', message: 'Prabu is already rested.' } };
    duration = Math.ceil((missing / content.survival.sleepRestPerHour) * 60);
  } else {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 24 * 60) {
      return { ok: false, error: { code: 'bad_duration', message: 'Rest between 1 minute and 24 hours.' } };
    }
    duration = minutes;
  }
  const events: GameEvent[] = [];
  const start = state.clockMinutes;
  passTime(state, duration, 'sleep', content, events);
  events.unshift({ type: 'rested', minutes: state.clockMinutes - start });
  return { ok: true, state, events };
}
