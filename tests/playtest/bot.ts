/**
 * A scripted player for the M9 balance pass. It plays a run through the real engine the way a
 * careful player would: drink and eat when low, treat injuries, sleep when tired, search places
 * until they run thin, hunt and cook, fight when healthy and flee when hurt. It isn't clever on
 * purpose: if this player struggles or cruises, a human will too.
 *
 * Each turn it lists the commands it would like, best first, and the first one the engine
 * accepts is played. That keeps the bot short and means it never breaks a rule.
 */
import type { Content } from '../../src/content/loader';
import { applyCommand, type Command, type GameEvent } from '../../src/engine/core/commands';
import { createNewGame, maxHealth, type GameState } from '../../src/engine/core/state';
import { actingNow } from '../../src/engine/systems/combat/combat';
import { abilitiesOf } from '../../src/engine/systems/combat/fighters';
import { fireMinutesLeft } from '../../src/engine/systems/fire/fire';
import { carriedKg } from '../../src/engine/systems/inventory/inventory';
import { groundHere, searchOptions, waterAt, waterHere } from '../../src/engine/systems/scavenging/scavenging';
import { townSpots } from '../../src/engine/systems/town/town';
import { distanceKm } from '../../src/engine/systems/travel/geo';
import { siteAt } from '../../src/engine/systems/travel/travel';

export type RunReport = {
  seed: number;
  died: boolean;
  cause: string | null;
  days: number;
  level: number;
  xp: number;
  fights: number;
  won: number;
  fled: number;
  events: number;
  searches: number;
  hunts: number;
  huntsHit: number;
  injuries: number;
  ill: number;
  lowest: { food: number; water: number; health: number };
  /** Hours spent with Food or Water at 0. */
  starvingHours: number;
  stuck: boolean;
  /** XP at the end of each whole day. */
  xpByDay: number[];
};

const EAT = ['item.cooked_meat', 'item.millet_porridge', 'item.dried_meat', 'item.tinned_food', 'item.tender_coconut'];
const DRINK = ['item.clean_water', 'item.tender_coconut', 'item.unsafe_water'];
const CURE = ['item.neem_turmeric_paste', 'item.sterile_bandage', 'item.neem_paste', 'item.cloth_bandage'];
// What a careful player picks up; scrap, hide, bamboo and fuel are left unless there's room to spare.
const KEEP = new Set([
  ...EAT, ...DRINK, ...CURE, 'item.raw_meat', 'item.millet', 'item.salt', 'item.empty_bottle', 'item.old_pills',
  'item.cloth', 'item.neem_leaves', 'item.turmeric', 'item.firewood', 'item.matchbox', 'item.flint', 'item.lighter_fuel',
  'item.can_opener', 'item.cooking_pot', 'item.aruval', 'item.bamboo_spear', 'item.bow', 'item.arrow', 'item.crank_charger', 'item.torch',
]);
const EVENT_PREFERENCE = ['search', 'look', 'catch', 'throw_meat', 'flame', 'pin', 'step_around', 'shelter', 'shade', 'back_away', 'turn_back', 'avoid', 'leave', 'push_on', 'run'];
const FAR = 'loc.madurai';
// A careful player stops picking things up past these counts.
const CAP: Record<string, number> = {
  'item.cooking_pot': 1, 'item.empty_bottle': 6, 'item.clean_water': 6, 'item.unsafe_water': 6, 'item.firewood': 3, 'item.cloth': 6,
  'item.neem_leaves': 6, 'item.salt': 2, 'item.millet': 4, 'item.torch': 1, 'item.flint': 1, 'item.matchbox': 2, 'item.can_opener': 1, 'item.crank_charger': 1,
  'item.aruval': 1, 'item.bamboo_spear': 1, 'item.bow': 1,
};
const EXHAUSTED_FOR = 7 * 1440;

type Memory = { exhausted: Record<string, number>; goal: { lat: number; lon: number; target: Command } | null };

export function playRun(content: Content, seed: number, maxDays = 10, trace?: (line: string) => void): RunReport {
  let state = createNewGame(content, seed);
  const report: RunReport = {
    seed, died: false, cause: null, days: 0, level: 1, xp: 0, fights: 0, won: 0, fled: 0, events: 0, searches: 0,
    hunts: 0, huntsHit: 0, injuries: 0, ill: 0, lowest: { food: 100, water: 100, health: 100 }, starvingHours: 0, stuck: false, xpByDay: [],
  };
  // Places (and town buildings) searched down to a thin stock, with when.
  const mem: Memory = { exhausted: {}, goal: null };
  const end = state.clockMinutes + maxDays * 1440;
  let steps = 0;

  while (!state.dead && state.clockMinutes < end) {
    if (++steps > 40000) { report.stuck = true; break; }
    const before = state.clockMinutes;
    const wasInjured = state.survival.injured;
    const wasIll = state.survival.illUntil !== null;
    const played = playOne(state, content, mem);
    if (!played) { report.stuck = true; break; }
    if (trace) {
      const sv = played.state.survival;
      const inv = played.state.inventory.stacks.map((x) => `${x.itemId.replace('item.', '')}×${x.count}`).join(' ');
      trace(`d${((played.state.clockMinutes - content.newGame.startClockMinutes) / 1440).toFixed(2)} ${played.command.type}${'recipeId' in played.command ? ':' + played.command.recipeId : ''}${'method' in played.command ? ':' + played.command.method : ''}${'target' in played.command && played.command.type === 'travel.start' ? '→' + JSON.stringify(played.command.target) : ''} @${played.state.town ? played.state.town.siteId + '/' + played.state.town.at : siteAt(played.state.player.position, content)?.id ?? 'open'} H${sv.health.toFixed(0)} F${sv.food.toFixed(0)} W${sv.water.toFixed(0)} R${sv.rest.toFixed(0)} | ${inv} | ${played.events.map((e) => e.type).join(',')}`);
    }
    state = played.state;
    count(report, played.events);
    const s = state.survival;
    if (s.injured && !wasInjured) report.injuries++;
    if (s.illUntil !== null && !wasIll) report.ill++;
    report.lowest.food = Math.min(report.lowest.food, s.food);
    report.lowest.water = Math.min(report.lowest.water, s.water);
    report.lowest.health = Math.min(report.lowest.health, s.health);
    if (s.food === 0 || s.water === 0) report.starvingHours += (state.clockMinutes - before) / 60;
    while (state.clockMinutes - content.newGame.startClockMinutes >= (report.xpByDay.length + 1) * 1440) report.xpByDay.push(state.progression.xp);
  }
  report.died = state.dead;
  report.days = Math.round(((state.clockMinutes - content.newGame.startClockMinutes) / 1440) * 10) / 10;
  report.level = state.progression.level;
  report.xp = state.progression.xp;
  return report;
}

function count(r: RunReport, events: GameEvent[]) {
  for (const e of events) {
    if (e.type === 'died') r.cause = e.cause;
    else if (e.type === 'combat_started') r.fights++;
    else if (e.type === 'combat_ended') { if (e.outcome === 'won') r.won++; else r.fled++; }
    else if (e.type === 'event_started') r.events++;
    else if (e.type === 'searched') r.searches++;
    else if (e.type === 'hunted') { r.hunts++; if (e.success) r.huntsHit++; }
  }
}

function playOne(state: GameState, content: Content, mem: Memory) {
  const exhausted = mem.exhausted;
  for (const command of wishes(state, content, mem)) {
    const r = applyCommand(state, command, content);
    if (r.ok) {
      if (command.type === 'travel.start') {
        const t = command.target;
        const p = 'siteId' in t ? content.sites[t.siteId]! : t.point;
        mem.goal = { lat: p.lat, lon: p.lon, target: command };
      }
      if (command.type === 'scavenge.search') {
        const left = searchOptions(r.state, content);
        if (left.richness < 30) exhausted[searchKey(r.state, content)] = r.state.clockMinutes;
      }
      return { ...r, command };
    }
  }
  return null;
}

const searchKey = (s: GameState, content: Content) => (s.town ? `${s.town.siteId}/${s.town.at}` : siteAt(s.player.position, content)?.id ?? `${s.player.position.lat},${s.player.position.lon}`);

const has = (s: GameState, id: string) => s.inventory.stacks.findIndex((x) => x.itemId === id);
const countOf = (s: GameState, ids: string[]) => s.inventory.stacks.filter((x) => ids.includes(x.itemId)).reduce((n, x) => n + x.count, 0);
const isNight = (s: GameState) => { const h = (s.clockMinutes % 1440) / 60; return h >= 19 || h < 6; };

function applyFirst(s: GameState, ids: string[]): Command[] {
  return ids.map((id) => has(s, id)).filter((i) => i >= 0).map((index) => ({ type: 'item.use', index }));
}

function* wishes(s: GameState, content: Content, mem: Memory): Generator<Command> {
  const exhausted = mem.exhausted;
  if (mem.goal && distanceKm(s.player.position, mem.goal) < 0.1) mem.goal = null;
  if (!s.introSeen) yield { type: 'intro.done' };

  if (s.combat) { yield* combatWishes(s, content); return; }

  if (s.event) {
    if (s.event.result) { yield { type: 'event.close' }; return; }
    const def = content.events.events.find((e) => e.id === s.event!.id)!;
    const ids = def.choices.map((c) => c.id);
    const healthy = s.survival.health >= 60 && s.inventory.weapon !== null;
    const order = [...(healthy ? ['fight'] : []), ...EVENT_PREFERENCE, ...ids];
    for (const id of order) if (ids.includes(id)) yield { type: 'event.choose', choiceId: id };
    return;
  }

  const sv = s.survival;
  // Care first: injuries, then thirst, hunger and pain.
  if (sv.injured) yield* applyFirst(s, CURE);
  // An infected wound needs neem–turmeric paste or a sterilized bandage (D-061).
  const infected = sv.conditions.some((c) => c.id === 'condition.infected_wound');
  if (infected) {
    yield* applyFirst(s, ['item.neem_turmeric_paste', 'item.sterile_bandage']);
    yield { type: 'craft', recipeId: 'recipe.neem_turmeric_paste' };
    if (fireMinutesLeft(s) > 0) yield { type: 'fire.cook', recipeId: 'recipe.sterilize_rags' };
    else if (countOf(s, ['item.cloth']) && has(s, 'item.cooking_pot') >= 0) for (const m of ['matchbox', 'lighter', 'flint', 'sticks']) yield { type: 'fire.make', method: m };
  }
  if (sv.water < 55) {
    const w = waterHere(s, content);
    if (w === 'river' || w === 'well') yield { type: 'water.drink' };
    yield* applyFirst(s, DRINK.filter((id) => id !== 'item.unsafe_water'));
    if (w && sv.water < 30) yield { type: 'water.drink' };
    if (sv.water < 30) yield* applyFirst(s, ['item.unsafe_water']);
  }
  if (sv.food < 55) yield* applyFirst(s, EAT);
  if (sv.health < maxHealth(s.survival, content) - 30) yield* applyFirst(s, ['item.old_pills']);

  if (s.travel) { yield { type: 'travel.advance' }; return; }

  // Pick up what's worth carrying.
  const ground = groundHere(s);
  if (ground.length) {
    const room = 24 - carriedKg(s.inventory, content);
    const take = ground.filter((i) => {
      const id = s.ground[i]!.itemId;
      const capped = CAP[id] !== undefined && countOf(s, [id]) + countOf(s, id.endsWith('_water') || id === 'item.empty_bottle' ? ['item.empty_bottle', 'item.clean_water', 'item.unsafe_water'] : []) >= CAP[id]!;
      return !capped && (KEEP.has(id) || content.items[id]?.charm || room > 8);
    });
    if (take.length) yield { type: 'ground.take', indexes: take };
    for (const i of take) yield { type: 'ground.take', indexes: [i] };
  }
  for (const i of s.inventory.stacks.map((x, n) => (content.items[x.itemId]?.charm ? n : -1)).filter((n) => n >= 0)) yield { type: 'charm.wear', index: i };
  if (s.inventory.weapon === 'item.hunting_knife') for (const w of ['item.aruval', 'item.bamboo_spear']) if (has(s, w) >= 0) yield { type: 'item.equip', index: has(s, w) };

  // Water and food work.
  const here = waterHere(s, content);
  if (here && has(s, 'item.empty_bottle') >= 0) yield { type: 'water.fill' };
  if (sv.injured || countOf(s, CURE) === 0) for (const r of ['recipe.neem_turmeric_paste', 'recipe.cloth_bandage', 'recipe.neem_paste']) yield { type: 'craft', recipeId: r };
  const raw = countOf(s, ['item.raw_meat']);
  const unsafe = countOf(s, ['item.unsafe_water']);
  if (fireMinutesLeft(s) > 0) {
    if (raw) yield { type: 'fire.cook', recipeId: 'recipe.cook_meat' };
    if (unsafe && has(s, 'item.cooking_pot') >= 0) yield { type: 'fire.cook', recipeId: 'recipe.boil_water' };
    if (countOf(s, ['item.millet']) && has(s, 'item.cooking_pot') >= 0) yield { type: 'fire.cook', recipeId: 'recipe.millet_porridge' };
  } else if (raw || (unsafe && has(s, 'item.cooking_pot') >= 0) || (sv.food < 60 && countOf(s, ['item.millet']) && has(s, 'item.cooking_pot') >= 0) || (sv.rest < 25 && isNight(s))) {
    for (const m of ['matchbox', 'lighter', 'flint', 'sticks']) yield { type: 'fire.make', method: m };
  }
  if (raw >= 2 && countOf(s, ['item.salt'])) yield { type: 'craft', recipeId: 'recipe.dried_meat' };

  // Sleep when tired.
  if (sv.rest < 25) {
    if (s.town) { yield { type: 'town.walk', spotId: 'edge' }; yield { type: 'town.leave' }; }
    yield { type: 'rest', minutes: 'until_rested' };
  }

  // Scavenge.
  const opts = searchOptions(s, content);
  const key = searchKey(s, content);
  // Food and drink in hand, in meter points (raw meat counts as cooked).
  // Tins only count with a can opener; millet only with a pot.
  const usable = (id: string) => (id !== 'item.tinned_food' || has(s, 'item.can_opener') >= 0);
  const pot = has(s, 'item.cooking_pot') >= 0;
  const cookable = fireMinutesLeft(s) > 0 || countOf(s, ['item.firewood']) > 0;
  const points = (meter: 'food' | 'water') => s.inventory.stacks.reduce((n, x) => n + x.count * (
    meter === 'food' && x.itemId === 'item.raw_meat' ? (cookable ? 30 : 0) : meter === 'food' && x.itemId === 'item.millet' && pot && cookable ? 25 : usable(x.itemId) ? content.items[x.itemId]?.effects?.[meter] ?? 0 : 0), 0);
  const hungry = points('food') < 90;
  const firewood = countOf(s, ['item.firewood']);
  // Hunting is no use without firewood to cook on.
  if (opts.canHunt && !firewood && opts.canSearch) yield { type: 'scavenge.search', torch: opts.torch && isNight(s) };
  if (opts.canHunt && hungry) yield { type: 'scavenge.hunt' };
  const starving = hungry && sv.food < 40;
  if (starving && s.town) { yield { type: 'town.walk', spotId: 'edge' }; yield { type: 'town.leave' }; }
  if (starving && !s.town) {
    const p0 = s.player.position;
    const grounds = Object.values(content.sites).filter((k) => content.loot[k.id]?.hunt?.length).sort((a, b) => distanceKm(p0, a) - distanceKm(p0, b));
    for (const site of grounds) if (distanceKm(p0, site) > 0.1) yield { type: 'travel.start', target: { siteId: site.id } };
  }
  if (opts.canSearch && opts.richness >= 30 && !(exhausted[key] !== undefined && s.clockMinutes - exhausted[key]! < EXHAUSTED_FOR)) {
    yield { type: 'scavenge.search', torch: opts.torch && isNight(s) };
  }

  // In town: the next building with stock, then out.
  if (s.town) {
    const town = content.towns[s.town.siteId]!;
    const pos = s.player.position;
    const next = townSpots(town, content)
      .filter((sp) => sp.kind === 'building' && !(exhausted[`${s.town!.siteId}/${sp.id}`] !== undefined && s.clockMinutes - exhausted[`${s.town!.siteId}/${sp.id}`]! < EXHAUSTED_FOR))
      .sort((a, b) => distanceKm(pos, a) - distanceKm(pos, b))[0];
    const thirsty = sv.water < 60 && countOf(s, DRINK) === 0;
    const well = townSpots(town, content).find((sp) => sp.kind === 'water' && sp.water === 'well');
    if (thirsty && well && s.town.at !== well.id) yield { type: 'town.walk', spotId: well.id };
    if (next && s.town.at !== next.id) yield { type: 'town.walk', spotId: next.id };
    if (!next) exhausted[s.town.siteId] = s.clockMinutes;
    yield { type: 'town.walk', spotId: 'edge' };
    yield { type: 'town.leave' };
    return;
  }
  if (opts.canEnterTown && !(exhausted[opts.site!.id] !== undefined && s.clockMinutes - exhausted[opts.site!.id]! < EXHAUSTED_FOR)) yield { type: 'town.enter' };

  // Travel: carry on to an interrupted trip's goal, then water if dry, otherwise the nearest place not yet searched out.
  if (mem.goal && !s.town) yield mem.goal.target;
  const pos = s.player.position;
  const known = Object.values(content.sites).filter((k) => k.id !== FAR);
  const near = (list: typeof known) => list.sort((a, b) => distanceKm(pos, a) - distanceKm(pos, b));
  const dry = points('water') < 50 && sv.water < 80;
  const clean = (k: (typeof known)[number]) => { const w = waterAt(k, content); return w === 'river' || w === 'well'; };
  if (dry) for (const site of [...near(known.filter(clean)), ...near(known.filter((k) => waterAt(k, content)))]) if (distanceKm(pos, site) > 0.1) yield { type: 'travel.start', target: { siteId: site.id } };
  if (hungry) for (const site of near(known.filter((k) => content.loot[k.id]?.hunt?.length))) if (distanceKm(pos, site) > 0.1) yield { type: 'travel.start', target: { siteId: site.id } };
  const fresh = near(known.filter((k) => distanceKm(pos, k) > 0.1 && !(exhausted[k.id] !== undefined && s.clockMinutes - exhausted[k.id]! < EXHAUSTED_FOR)));
  for (const site of fresh) yield { type: 'travel.start', target: { siteId: site.id } };
  // Nothing left nearby: wait it out.
  yield { type: 'rest', minutes: 240 };
}

/** The bot's fighting: heal or flee when low, otherwise the hardest-hitting ability on the weakest enemy. */
export function* combatWishes(s: GameState, content: Content, fleeBelow = 25): Generator<Command> {
  if (!s.combat) return;
  if (s.combat.result) { yield { type: 'combat.close' }; return; }
  const me = actingNow(s);
  if (s.survival.health < 30) yield* applyFirst(s, ['item.old_pills', ...CURE]);
  if (s.survival.health < fleeBelow) yield { type: 'combat.act', action: 'flee' };
  if (me) {
    const abilities = abilitiesOf(s, me, content).sort((a, b) => (b.damage ?? 0) - (a.damage ?? 0));
    // Living enemies first, weakest first; then remains in the way, which some abilities can clear.
    const enemies = s.combat.combatants.filter((c) => c.side === 'enemy').sort((a, b) => Number(a.corpse) - Number(b.corpse) || a.hp - b.hp);
    for (const a of abilities) {
      if (a.target.side === 'enemy') for (const e of enemies) yield { type: 'combat.act', action: 'ability', abilityId: a.id, target: e.uid };
    }
    yield { type: 'combat.act', action: 'move', steps: -1 };
    yield { type: 'combat.act', action: 'move', steps: 1 };
  }
  yield { type: 'combat.act', action: 'flee' };
  yield { type: 'combat.act', action: 'pass' };
}
