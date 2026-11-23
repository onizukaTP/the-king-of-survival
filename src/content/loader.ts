import { z } from 'zod';
import {
  buildingTypeSchema, combatSchema, conditionSchema, enemySchema, eventsSchema, type CombatConfig, type Enemy, fireSchema, type Condition, type EventsConfig, recipeSchema, townSchema, type FireConfig, type Recipe, townStreetsSchema, type BuildingType, type Town, type TownStreets,
  characterSchema, itemSchema, lootSchema, newGameSchema, outlineSchema, roadsSchema, scavengingSchema, siteSchema, survivalSchema, waterSchema, worldSchema,
  type Character, type Item, type Loot, type NewGameConfig, type Outline, type Roads, type ScavengingConfig, type Site, type SurvivalConfig, type Water, type WorldConfig,
} from './schemas';
import characters from './data/characters.json';
import items from './data/items.json';
import loot from './data/loot.json';
import scavenging from './data/scavenging.json';
import fire from './data/fire.json';
import recipes from './data/recipes.json';
import conditions from './data/conditions.json';
import events from './data/events.json';
import enemies from './data/enemies.json';
import combat from './data/combat.json';
import water from './data/water.json';
import buildingTypes from './data/building-types.json';
import towns from './data/towns.json';
import townStreets from './data/town-streets.json';
import survival from './data/survival.json';
import newGame from './data/new-game.json';
import roads from './data/roads.json';
import sites from './data/sites.json';
import tamilNadu from './data/tamil-nadu.json';
import world from './data/world.json';
import { distanceKm } from '../engine/systems/travel/geo';

export interface Content {
  characters: Record<string, Character>;
  sites: Record<string, Site>;
  items: Record<string, Item>;
  world: WorldConfig;
  survival: SurvivalConfig;
  loot: Record<string, Loot>;
  scavenging: ScavengingConfig;
  fire: FireConfig;
  recipes: Record<string, Recipe>;
  conditions: Record<string, Condition>;
  events: EventsConfig;
  enemies: Record<string, Enemy>;
  combat: CombatConfig;
  water: Water;
  buildingTypes: Record<string, BuildingType>;
  // Keyed by the town's site id.
  towns: Record<string, Town>;
  townStreets: TownStreets;
  roads: Roads;
  outline: Outline;
  newGame: NewGameConfig;
}

export interface RawContent {
  characters: unknown;
  sites: unknown;
  items: unknown;
  world: unknown;
  survival: unknown;
  loot: unknown;
  scavenging: unknown;
  fire: unknown;
  recipes: unknown;
  conditions: unknown;
  events: unknown;
  enemies: unknown;
  combat: unknown;
  water: unknown;
  buildingTypes: unknown;
  towns: unknown;
  townStreets: unknown;
  roads: unknown;
  outline: unknown;
  newGame: unknown;
}

function byId<T extends { id: string }>(list: T[], label: string): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of list) {
    if (out[item.id]) throw new Error(`Duplicate ${label} id: ${item.id}`);
    out[item.id] = item;
  }
  return out;
}

/** Validates raw content and cross-references; throws a readable error, since bad content is a build bug. */
export function parseContent(raw: RawContent): Content {
  const content: Content = {
    characters: byId(z.array(characterSchema).parse(raw.characters), 'character'),
    sites: byId(z.array(siteSchema).parse(raw.sites), 'site'),
    items: byId(z.array(itemSchema).parse(raw.items), 'item'),
    world: worldSchema.parse(raw.world),
    survival: survivalSchema.parse(raw.survival),
    loot: Object.fromEntries(z.array(lootSchema).parse(raw.loot).map((l) => [l.siteId, l])),
    scavenging: scavengingSchema.parse(raw.scavenging),
    fire: fireSchema.parse(raw.fire),
    recipes: byId(z.array(recipeSchema).parse(raw.recipes), 'recipe'),
    conditions: byId(z.array(conditionSchema).parse(raw.conditions), 'condition'),
    events: eventsSchema.parse(raw.events),
    enemies: byId(z.array(enemySchema).parse(raw.enemies), 'enemy'),
    combat: combatSchema.parse(raw.combat),
    water: waterSchema.parse(raw.water),
    buildingTypes: byId(z.array(buildingTypeSchema).parse(raw.buildingTypes), 'building type'),
    towns: Object.fromEntries(z.array(townSchema).parse(raw.towns).map((t) => [t.siteId, t])),
    townStreets: townStreetsSchema.parse(raw.townStreets),
    roads: roadsSchema.parse(raw.roads),
    outline: outlineSchema.parse(raw.outline),
    newGame: newGameSchema.parse(raw.newGame),
  };
  const { startingCharacter, startSite } = content.newGame;
  if (!content.characters[startingCharacter]) throw new Error(`new-game.json: unknown character ${startingCharacter}`);
  if (!content.sites[startSite]) throw new Error(`new-game.json: unknown site ${startSite}`);
  const item = (id: string, where: string) => {
    const found = content.items[id];
    if (!found) throw new Error(`${where}: unknown item ${id}`);
    return found;
  };
  for (const it of Object.values(content.items)) {
    if (it.leaves) item(it.leaves, `items.json ${it.id} leaves`);
    if (it.needsItem) item(it.needsItem, `items.json ${it.id} needsItem`);
    if (it.recharges && !item(it.recharges.itemId, `items.json ${it.id} recharges`).charge) {
      throw new Error(`items.json: ${it.id} recharges ${it.recharges.itemId}, which has no charge`);
    }
  }
  const { startingWeapon, startingKit } = content.newGame;
  if (startingWeapon && !item(startingWeapon, 'new-game.json').weapon) throw new Error(`new-game.json: ${startingWeapon} is not a weapon`);
  for (const k of startingKit) item(k.itemId, 'new-game.json');
  for (const id of Object.values(content.scavenging.bottles)) item(id, 'scavenging.json bottles');
  if (!item(content.scavenging.torchItemId, 'scavenging.json torchItemId').charge) throw new Error('scavenging.json: the torch item has no charge');
  const { fire } = content;
  item(fire.firewoodItemId, 'fire.json firewoodItemId');
  for (const id of fire.waterItemIds) item(id, 'fire.json waterItemIds');
  for (const m of fire.methods) {
    if (m.itemId && m.chargePerFire > 0 && !item(m.itemId, `fire.json ${m.id}`).charge) throw new Error(`fire.json: ${m.id} uses charge, but ${m.itemId} has none`);
    if (m.itemId) item(m.itemId, `fire.json ${m.id}`);
  }
  for (const r of fire.recipes) for (const id of [r.from, r.to, ...(r.tool ? [r.tool] : [])]) item(id, `fire.json ${r.id}`);
  for (const r of Object.values(content.recipes)) {
    for (const id of [...r.inputs.map((i) => i.itemId), r.output.itemId, ...(r.tool ? [r.tool] : [])]) item(id, `recipes.json ${r.id}`);
    if (fire.recipes.some((f) => f.id === r.id)) throw new Error(`recipes.json: ${r.id} is also a fire recipe`);
  }
  const condition = (id: string, where: string) => {
    if (!content.conditions[id]) throw new Error(`${where}: unknown condition ${id}`);
  };
  for (const c of Object.values(content.conditions)) for (const id of c.curedBy ?? []) item(id, `conditions.json ${c.id} curedBy`);
  condition(content.survival.shelteredSleepCondition, 'survival.json shelteredSleepCondition');
  condition(content.events.nightThreatCondition, 'events.json nightThreatCondition');
  byId(content.events.events, 'event');
  for (const e of content.events.events) {
    const where = `events.json ${e.id}`;
    for (const id of e.buildingTypes ?? []) if (!content.buildingTypes[id]) throw new Error(`${where}: unknown building type ${id}`);
    byId(e.choices, `${where} choice`);
    // A choice with no label resolves by itself, so it must be the only one.
    if (e.choices.some((c) => !c.label) && e.choices.length > 1) throw new Error(`${where}: an unlabelled choice must be the only one`);
    for (const c of e.choices) {
      for (const n of c.needs ?? []) for (const id of n.items ?? []) item(id, where);
      const total = c.outcomes.reduce((sum, o) => sum + o.chance, 0);
      if (Math.abs(total - 1) > 1e-9) throw new Error(`${where} ${c.id}: outcome chances add up to ${total}, not 1`);
      for (const o of c.outcomes) {
        for (const id of o.conditions ?? []) condition(id, where);
        for (const f of o.fight?.enemies ?? []) {
          if (!content.enemies[f.enemyId]) throw new Error(`${where}: unknown enemy ${f.enemyId}`);
          if (f.min > f.max) throw new Error(`${where}: ${f.enemyId} min is above max`);
        }
        for (const id of o.lose?.items ?? []) item(id, where);
        for (const entry of o.loot?.entries ?? []) item(entry.itemId, where);
      }
    }
  }
  for (const it of Object.values(content.items)) if (it.combat?.ammo) item(it.combat.ammo, `items.json ${it.id} ammo`);
  for (const e of Object.values(content.enemies)) {
    for (const entry of e.loot) item(entry.itemId, `enemies.json ${e.id}`);
    if (e.critCondition) condition(e.critCondition.conditionId, `enemies.json ${e.id}`);
    if (e.damage[0] > e.damage[1]) throw new Error(`enemies.json ${e.id}: damage min is above max`);
  }
  for (const l of Object.values(content.loot)) {
    if (!content.sites[l.siteId]) throw new Error(`loot.json: unknown site ${l.siteId}`);
    for (const e of [...l.search, ...(l.hunt ?? [])]) {
      item(e.itemId, `loot.json ${l.siteId}`);
      if (e.min > e.max) throw new Error(`loot.json ${l.siteId}: ${e.itemId} min is above max`);
    }
  }
  for (const bt of Object.values(content.buildingTypes)) {
    for (const e of bt.search) {
      item(e.itemId, `building-types.json ${bt.id}`);
      if (e.min > e.max) throw new Error(`building-types.json ${bt.id}: ${e.itemId} min is above max`);
    }
  }
  const spotIds = new Set<string>();
  for (const t of Object.values(content.towns)) {
    const site = content.sites[t.siteId];
    if (!site) throw new Error(`towns.json: unknown site ${t.siteId}`);
    // A town's finds live in its buildings; a town-wide table as well would be a content mistake.
    if (content.loot[t.siteId]) throw new Error(`loot.json: ${t.siteId} has a town map, so it has no town-wide loot`);
    const spots = [{ id: 'its edge', lat: site.lat, lon: site.lon }, ...t.buildings, ...t.water, ...t.ends];
    for (const b of t.buildings) if (!content.buildingTypes[b.typeId]) throw new Error(`towns.json ${b.id}: unknown building type ${b.typeId}`);
    for (const [i, a] of spots.entries()) {
      if (i > 0 && spotIds.has(a.id)) throw new Error(`towns.json: duplicate id ${a.id}`);
      spotIds.add(a.id);
      // Ground piles count as "here" within 50 m, so spots must be clearly apart or piles would mix.
      for (const b of spots.slice(i + 1)) if (distanceKm(a, b) < 0.1) throw new Error(`towns.json ${t.siteId}: ${a.id} and ${b.id} are under 100 m apart`);
    }
  }
  for (const id of Object.keys(content.townStreets)) if (!content.towns[id]) throw new Error(`town-streets.json: ${id} has no town map`);
  const nodeCount = content.roads.nodes.length;
  const badEdge = content.roads.edges.find(([a, b]) => a >= nodeCount || b >= nodeCount);
  if (badEdge) throw new Error(`roads.json: edge ${badEdge.join(',')} points past the ${nodeCount} nodes`);
  return content;
}

export function loadContent(): Content {
  return parseContent({ characters, sites, items, world, survival, loot, scavenging, fire, recipes, conditions, events, enemies, combat, water, buildingTypes, towns, townStreets, roads, outline: tamilNadu, newGame });
}
