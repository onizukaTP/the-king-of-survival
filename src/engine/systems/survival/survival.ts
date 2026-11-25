import type { Content } from '../../../content/loader';
import type { CommandResult, DeathCause, GameEvent } from '../../core/commands';
import { nextRandom } from '../../core/rng';
import { maxHealth, type GameState, type Meter } from '../../core/state';
import { carriedKg, loadMultiplier } from '../inventory/inventory';
import { addCondition, conditionEffects, expireConditions, removeCondition } from '../conditions/conditions';
import { maybeEvent } from '../events/events';
import { fireMinutesLeft } from '../fire/fire';
import { isNight } from '../night/night';
import { siteAt } from '../travel/travel';
import { inRadiationZone } from './radiation';
import { carryLimits, charmEffects } from '../charms/charms';
import { riddenDef } from '../vehicles/ridden';

/** What Prabu is doing while time passes: only travel carries the overload cost, only sleep restores Rest. */
export type Activity = 'travel' | 'sleep' | 'work';

const METERS: Meter[] = ['health', 'food', 'water', 'rest'];
// Snaps float dust to the ends so "empty" and "full" are exact (10 − 60 × 10/60 must be 0, not 1e-15).
const clamp = (v: number) => (v < 1e-9 ? 0 : v > 100 - 1e-9 ? 100 : v);

/**
 * Advances the clock minute by minute, applying survival drain (D-023, D-035, D-036, D-027),
 * then spoils food (D-028). Stops early if Prabu dies. Mutates `state`, which is always a copy.
 */
export function passTime(
  state: GameState, minutes: number, activity: Activity, content: Content, events: GameEvent[],
  // Share of this time spent in the radiation zone; a travel leg passes its path's share, everything else is where he stands.
  zoneShare = inRadiationZone(state.player.position, content) ? 1 : 0,
) {
  const cfg = content.survival;
  const s = state.survival;
  const before = { ...s };
  // Moving: the pack's weight (D-036) and the effort of pushing or pedalling a vehicle (P-021).
  const load = activity === 'travel' ? loadMultiplier(carriedKg(state.inventory, content), carryLimits(state, content)) * (riddenDef(state, content)?.effort ?? 1) : 1;
  let fx = conditionEffects(s, content);
  const charmRest = charmEffects(state.inventory, content).restDrain;

  // Stepping by the minute keeps every threshold (Rest hitting 0, a meter emptying) exact, and is cheap.
  for (let i = 0; i < minutes; i++) {
    const exhausted = s.rest <= 0 ? cfg.exhaustedDrainMultiplier : 1;
    const ill = s.illUntil !== null ? cfg.illness.waterDrainMultiplier : 1;
    s.food = clamp(s.food - (cfg.drainPerHour.food / 60) * exhausted * load);
    s.water = clamp(s.water - (cfg.drainPerHour.water / 60) * exhausted * load * ill);
    s.rest = activity === 'sleep' ? clamp(s.rest + cfg.sleepRestPerHour / 60) : clamp(s.rest - (cfg.drainPerHour.rest / 60) * load * fx.restDrain * charmRest);

    const emptyMeters = (s.food <= 0 ? 1 : 0) + (s.water <= 0 ? 1 : 0);
    s.health = clamp(s.health - (cfg.emptyMeterHealthPerHour / 60) * emptyMeters + fx.healthPerHour / 60);
    const canHeal = activity === 'sleep' && !s.injured && !fx.blocksHealing && s.food > cfg.sleepHealAbove && s.water > cfg.sleepHealAbove;
    if (canHeal) s.health = Math.min(maxHealth(s, content), clamp(s.health + cfg.sleepHealthPerHour / 60));

    state.clockMinutes += 1;
    if (s.illUntil !== null && state.clockMinutes >= s.illUntil) {
      s.illUntil = null;
      events.push({ type: 'recovered' });
    }
    if (s.conditions.length && expireConditions(state, events)) fx = conditionEffects(s, content);
    if (s.health <= 0) {
      state.dead = true;
      // With food and water left, it was a wound (D-061) that killed him.
      const cause: DeathCause = s.food <= 0 && s.water <= 0 ? 'hunger_and_thirst' : s.food <= 0 ? 'hunger' : s.water <= 0 ? 'thirst' : 'injury';
      events.push({ type: 'died', cause });
      return;
    }
  }

  // D-043: every full hour inside the zone rolls once; part-hours carry over to the next action.
  const rad = content.scavenging.radiation;
  s.zoneMinutes += minutes * zoneShare;
  while (s.zoneMinutes >= 60) {
    s.zoneMinutes -= 60;
    const [value, next] = nextRandom(state.rngState);
    state.rngState = next;
    if (value < rad.chancePerHour) {
      s.radiation = Math.min(100, s.radiation + rad.amount);
      s.health = Math.min(s.health, maxHealth(s, content));
      events.push({ type: 'irradiated', amount: rad.amount });
    }
  }
  if (s.health <= 0) {
    state.dead = true;
    events.push({ type: 'died', cause: 'radiation' });
    return;
  }

  for (const meter of METERS) {
    if (before[meter] > 0 && s[meter] <= 0) events.push({ type: 'meter_low', meter, empty: true });
    else if (before[meter] > cfg.warnAt && s[meter] <= cfg.warnAt) events.push({ type: 'meter_low', meter, empty: false });
  }

  const fresh = (stack: { itemId: string; count: number; spoilsAt?: number }) => {
    if (stack.spoilsAt === undefined || stack.spoilsAt > state.clockMinutes) return true;
    events.push({ type: 'item_spoiled', itemId: stack.itemId, count: stack.count });
    return false;
  };
  state.inventory.stacks = state.inventory.stacks.filter(fresh);
  // Food in a vehicle's cargo spoils too.
  for (const v of state.vehicles.list) v.cargo = v.cargo.filter(fresh);
  // Things left on the ground vanish after 96 hours (D-045), and food there spoils as usual.
  state.ground = state.ground.filter((p) => p.expiresAt > state.clockMinutes && (p.spoilsAt === undefined || p.spoilsAt > state.clockMinutes));
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
  const home = !state.town && siteAt(state.player.position, content)?.id === content.newGame.startSite;
  // At home or beside a fire he sleeps sheltered (D-061); outdoors at night something may come (D-059).
  const sheltered = home || fireMinutesLeft(state) > 0;
  // A night disturbance spoils the sleep: it neither ends Restless nor leaves him well rested.
  let interrupted = false;
  for (let slept = 0; slept < duration && !state.dead;) {
    const hour = Math.min(60, duration - slept);
    passTime(state, hour, 'sleep', content, events);
    slept += hour;
    const outdoors = !state.town && !home && fireMinutesLeft(state) === 0;
    if (hour === 60 && !state.dead && outdoors && isNight(state.clockMinutes, content.world.night) && maybeEvent(state, { on: 'rest' }, content, events)) {
      interrupted = true;
      break;
    }
  }
  const slept = state.clockMinutes - start;
  events.unshift({ type: 'rested', minutes: slept });
  if (state.dead) return { ok: true, state, events };
  const time = charmEffects(state.inventory, content).conditionTime;
  for (const c of [...state.survival.conditions]) {
    const def = content.conditions[c.id]!;
    // The rudraksha halves the rest some conditions need (P-022).
    const t = time[c.id] ?? 1;
    if (!interrupted && def.endsAfterSleepMinutes && slept >= def.endsAfterSleepMinutes * t) removeCondition(state, c.id, events);
    if (sheltered && def.endsAfterShelteredRestMinutes && slept >= def.endsAfterShelteredRestMinutes * t) removeCondition(state, c.id, events);
  }
  if (sheltered && !interrupted && state.survival.rest >= 100) addCondition(state, content.survival.shelteredSleepCondition, content, events);
  return { ok: true, state, events };
}
