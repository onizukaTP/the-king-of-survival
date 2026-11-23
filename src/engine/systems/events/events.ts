import type { Content } from '../../../content/loader';
import type { EventChoice, EventNeed, GameEventDef, LootEntry, WorldConfig } from '../../../content/schemas';
import type { CommandError, CommandResult, GameEvent } from '../../core/commands';
import { nextRandom } from '../../core/rng';
import { maxHealth, type GameState } from '../../core/state';
import { addCondition, healingBlocked } from '../conditions/conditions';
import { stowFinds, takeOne } from '../inventory/inventory';
import { startFight } from '../combat/combat';
import { isNight } from '../night/night';
import type { Find } from '../scavenging/scavenging';
import { passTime } from '../survival/survival';
import { spotHere } from '../town/town';
import { distanceKm } from '../travel/geo';
import type { Leg } from '../travel/route';

const fail = (code: CommandError['code'], message: string) => ({ ok: false as const, error: { code, message } });
const clamp = (v: number) => Math.min(100, Math.max(0, v));

/** What just happened that might turn into an event (D-059). */
export type Trigger =
  | { on: 'travel'; minutes: number; crossShare: number; unlit: boolean }
  | { on: 'walk'; minutes: number; unlit: boolean }
  | { on: 'search'; buildingTypeId: string | null }
  | { on: 'rest' }
  | { on: 'hunt' };

function roll(state: GameState): number {
  const [value, next] = nextRandom(state.rngState);
  state.rngState = next;
  return value;
}

/** Share of a leg that went cross-country, worked out from its length and time (D-019 speeds). */
export function crossShare(leg: Leg, world: WorldConfig): number {
  const roadHours = leg.km / world.roadSpeedKmh;
  const crossHours = leg.km / world.crossCountrySpeedKmh;
  if (crossHours <= roadHours) return 0;
  return Math.min(1, Math.max(0, (leg.minutes / 60 - roadHours) / (crossHours - roadHours)));
}

function fits(e: GameEventDef, t: Trigger, state: GameState, night: boolean, content: Content): boolean {
  if (!e.on.includes(t.on)) return false;
  // Ground only matters on the road; a town walk has none, and hunting is always off the road.
  if (e.ground && t.on === 'walk') return false;
  if (e.ground && t.on === 'travel' && (t.crossShare >= 0.5 ? 'cross' : 'road') !== e.ground) return false;
  if ((e.when === 'day' && night) || (e.when === 'night' && !night)) return false;
  if (e.unlit && !('unlit' in t && t.unlit)) return false;
  if (e.hours) {
    const hour = Math.floor((state.clockMinutes % (24 * 60)) / 60);
    if (hour < e.hours[0] || hour >= e.hours[1]) return false;
  }
  if (e.waterBelow !== undefined && state.survival.water >= e.waterBelow) return false;
  if (e.nearTownKm !== undefined) {
    const near = Object.keys(content.towns).some((id) => distanceKm(state.player.position, content.sites[id]!) <= e.nearTownKm!);
    if (!near) return false;
  }
  if (e.buildingTypes && !(t.on === 'search' && t.buildingTypeId && e.buildingTypes.includes(t.buildingTypeId))) return false;
  return true;
}

/**
 * Rolls for an event after a leg, a walk, a search or an hour of rest outdoors at night (D-059).
 * Returns whether one fired; it is then open in `state.event`. Mutates `state`.
 */
export function maybeEvent(state: GameState, t: Trigger, content: Content, events: GameEvent[]): boolean {
  const cfg = content.events;
  if (state.event || state.dead) return false;
  if (state.lastEventAt !== null && state.clockMinutes - state.lastEventAt < cfg.cooldownMinutes) return false;
  const night = isNight(state.clockMinutes, content.world.night);
  const pool = cfg.events.filter((e) => fits(e, t, state, night, content));
  if (!pool.length) return false;

  const legShare = (minutes: number) => minutes / content.world.legMaxMinutes;
  const { road, cross } = cfg.travelChancePerLeg;
  let chance =
    t.on === 'travel' ? (road + t.crossShare * (cross - road)) * legShare(t.minutes)
      : t.on === 'walk' ? road * legShare(t.minutes)
        : t.on === 'search' ? cfg.searchChance : t.on === 'hunt' ? cfg.huntChance : cfg.restChancePerHour;
  if ((t.on === 'travel' || t.on === 'walk') && t.unlit) chance *= cfg.unlitMultiplier;
  const weight = (e: GameEventDef) => (night && e.nightWeight ? e.nightWeight : e.weight);
  const total = pool.reduce((sum, e) => sum + weight(e), 0);
  // D-023: with Rest at 0, threats are more likely.
  const exhausted = state.survival.rest <= 0;

  const r = roll(state);
  let acc = 0;
  for (const e of pool) {
    acc += (chance * weight(e) / total) * (e.threat && exhausted ? cfg.exhaustedThreatMultiplier : 1);
    if (r < acc) {
      openEvent(state, e, content, events);
      return true;
    }
  }
  return false;
}

/** Puts an event's card on screen. Mutates `state`. */
export function openEvent(state: GameState, e: GameEventDef, content: Content, events: GameEvent[]) {
  state.event = { id: e.id, result: null };
  state.lastEventAt = state.clockMinutes;
  events.push({ type: 'event_started', eventId: e.id });
  // An event with one unlabelled choice has nothing to decide: it resolves at once.
  const only = e.choices[0]!;
  if (e.choices.length === 1 && !only.label) resolve(state, e, only, content, events);
}

function hasItem(state: GameState, itemId: string, content: Content): boolean {
  if (state.inventory.weapon === itemId) return true;
  const charged = Boolean(content.items[itemId]?.charge);
  return state.inventory.stacks.some((s) => s.itemId === itemId && (!charged || (s.charge ?? 0) > 0));
}

function needMet(state: GameState, n: EventNeed, content: Content): boolean {
  if (n.items && !n.items.every((id) => hasItem(state, id, content))) return false;
  if (n.categories && !state.inventory.stacks.some((s) => n.categories!.includes(content.items[s.itemId]!.category))) return false;
  if (n.weapon && !state.inventory.weapon) return false;
  if (n.night && !isNight(state.clockMinutes, content.world.night)) return false;
  return true;
}

/** Why a choice can't be taken now, or null if it can (shown on the disabled button). */
export function choiceMissing(state: GameState, choice: EventChoice, content: Content): string | null {
  if (!choice.needs || choice.needs.some((n) => needMet(state, n, content))) return null;
  if (choice.needs.every((n) => n.night && !n.items && !n.categories && !n.weapon)) return 'Only at night';
  const describe = (n: EventNeed) => {
    const parts = [
      ...(n.items ?? []).map((id) => content.items[id]!.name.toLowerCase()),
      ...(n.categories ? [`some ${n.categories.join(' or ')}`] : []),
      ...(n.weapon ? ['a weapon in hand'] : []),
    ];
    return `${parts.join(' and ')}${n.night ? ' at night' : ''}`;
  };
  return `Needs ${choice.needs.map(describe).join(' or ')}`;
}

/** One draw: the first entry that hits (as in searching, P-013). */
function draw(state: GameState, entries: LootEntry[]): Find | null {
  for (const entry of entries) {
    if (roll(state) >= entry.chance) continue;
    const find: Find = { itemId: entry.itemId, count: entry.min + Math.floor(roll(state) * (entry.max - entry.min + 1)) };
    if (entry.charge) find.charge = entry.charge[0] + Math.floor(roll(state) * (entry.charge[1] - entry.charge[0] + 1));
    return find;
  }
  return null;
}

/** Rolls the choice's outcome and applies it. Mutates `state`. */
function resolve(state: GameState, def: GameEventDef, choice: EventChoice, content: Content, events: GameEvent[]) {
  const r = roll(state);
  let acc = 0;
  let index = choice.outcomes.findIndex((o) => (acc += o.chance) > r);
  if (index < 0) index = choice.outcomes.length - 1;
  const o = choice.outcomes[index]!;
  const s = state.survival;
  const inv = state.inventory;
  const result = { choiceId: choice.id, outcome: index, found: [] as Find[], left: [] as Find[], lost: [] as string[], conditions: [] as string[], siteId: null as string | null };
  state.event = { id: def.id, result };

  if (o.lose) {
    let i = inv.stacks.findIndex((st) => o.lose!.items?.includes(st.itemId));
    if (i < 0) i = inv.stacks.findIndex((st) => o.lose!.categories?.includes(content.items[st.itemId]!.category));
    if (i >= 0) result.lost.push(takeOne(inv, i).itemId);
  }
  if (o.food) s.food = clamp(s.food + o.food);
  if (o.water) s.water = clamp(s.water + o.water);
  if (o.rest) s.rest = clamp(s.rest + o.rest);
  if (o.injure) s.injured = true;
  if (o.ill) {
    s.illUntil = state.clockMinutes + content.survival.illness.minutes;
    events.push({ type: 'fell_ill' });
  }
  const conditions = [...(o.conditions ?? [])];
  // D-061: any threat met at night leaves him shaken.
  if (def.threat && isNight(state.clockMinutes, content.world.night)) conditions.push(content.events.nightThreatCondition);
  for (const id of new Set(conditions)) {
    addCondition(state, id, content, events);
    result.conditions.push(id);
  }
  if (o.health && o.health < 0) s.health = Math.max(0, s.health + o.health);
  if (o.health && o.health > 0 && !healingBlocked(s, content)) s.health = Math.min(maxHealth(s, content), s.health + o.health);

  const finds: Find[] = [];
  for (let d = 0; d < (o.loot?.draws ?? 0); d++) {
    const f = draw(state, o.loot!.entries);
    if (f) finds.push(f);
  }
  const spot = spotHere(state, content);
  if (o.extraFind && spot?.kind === 'building') {
    const f = draw(state, spot.type.search);
    if (f) finds.push(f);
  }
  const stowed = stowFinds(state, finds, content);
  result.found.push(...stowed.found);
  result.left.push(...stowed.left);
  if (o.revealNearest) {
    const here = state.player.position;
    const site = Object.values(content.sites)
      .filter((x) => !state.map.discoveredSiteIds.includes(x.id))
      .sort((a, b) => distanceKm(here, a) - distanceKm(here, b))[0];
    if (site) {
      state.map.discoveredSiteIds.push(site.id);
      events.push({ type: 'site_discovered', siteId: site.id });
      result.siteId = site.id;
    }
  }
  events.unshift({ type: 'event_resolved', eventId: def.id, choiceId: choice.id, outcome: index });

  if (s.health <= 0) {
    state.dead = true;
    state.travel = null;
    events.push({ type: 'died', cause: 'injury' });
    return;
  }
  if (o.stopTravel && state.travel) {
    state.travel = null;
    events.push({ type: 'travel_stopped', reason: 'event' });
  }
  // A fight (M7) takes over from the card: the combat screen shows instead.
  if (o.fight) {
    state.event = null;
    startFight(state, o.fight, content, events);
    return;
  }
  if (o.minutes) {
    const before = events.length;
    passTime(state, o.minutes, o.activity ?? 'work', content, events);
    if (state.dead) {
      state.travel = null;
    } else if (state.travel && events.slice(before).some((e) => e.type === 'meter_low')) {
      // D-035: a meter falling low still ends the trip, as after a leg.
      state.travel = null;
      events.push({ type: 'travel_stopped', reason: 'meter' });
    }
  }
}

/** The player picks a choice on the open event card. */
export function chooseEvent(state: GameState, choiceId: string, content: Content): CommandResult {
  if (!state.event) return fail('no_event', 'Nothing is happening.');
  if (state.event.result) return fail('bad_choice', 'That has already been decided.');
  const def = content.events.events.find((e) => e.id === state.event!.id)!;
  const choice = def.choices.find((c) => c.id === choiceId);
  if (!choice) return fail('bad_choice', 'That isn\'t one of the choices.');
  const missing = choiceMissing(state, choice, content);
  if (missing) return fail('missing_item', `${missing}.`);
  const events: GameEvent[] = [];
  resolve(state, def, choice, content, events);
  return { ok: true, state, events };
}

/** Closes the card after its outcome has been read; a trip under way carries on. */
export function closeEvent(state: GameState): CommandResult {
  if (!state.event) return fail('no_event', 'Nothing is happening.');
  if (!state.event.result) return fail('bad_choice', 'Choose what to do first.');
  state.event = null;
  return { ok: true, state, events: [{ type: 'event_closed' }] };
}

/** Whether the open event's outcome stops movement (a sprained ankle, turning back). */
export function eventStopsMovement(state: GameState, content: Content): boolean {
  const open = state.event;
  if (!open?.result) return false;
  const def = content.events.events.find((e) => e.id === open.id);
  return Boolean(def?.choices.find((c) => c.id === open.result!.choiceId)?.outcomes[open.result.outcome]?.stopTravel);
}
