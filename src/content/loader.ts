import { z } from 'zod';
import {
  abilitySchema, buildingTypeSchema, combatSchema, statsSchema, type Ability, conditionSchema, enemySchema, eventsSchema, type CombatConfig, type Enemy, fireSchema, type Condition, type EventsConfig, recipeSchema, type FireConfig, type Recipe, type BuildingType, type Town, type TownStreets,
  backboneSchema, landmarksSchema, generatorSchema, type GeneratorRules,
  progressionSchema, storySchema, type ProgressionConfig, type Story,
  charmsSchema, vehiclesSchema, type CharmsConfig, type Vehicle, type VehiclesConfig,
  characterSchema, itemSchema, lootSchema, railSchema, forestsSchema, terrainLootSchema, type Terrain, type TerrainKind, type TerrainLoot, newGameSchema, outlineSchema, roadsSchema, scavengingSchema, siteSchema, survivalSchema, waterSchema, worldSchema,
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
import abilities from './data/abilities.json';
import combat from './data/combat.json';
import water from './data/water.json';
import buildingTypes from './data/building-types.json';
import backbone from './data/backbone.json';
import landmarks from './data/landmarks.json';
import generator from './data/generator.json';
import { generateWorld } from './generate/world';
import survival from './data/survival.json';
import newGame from './data/new-game.json';
import progression from './data/progression.json';
import story from './data/story.json';
import charms from './data/charms.json';
import vehicles from './data/vehicles.json';
import roads from './data/roads.json';
import rail from './data/rail.json';
import forests from './data/forests.json';
import terrainLoot from './data/terrain-loot.json';
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
  abilities: Record<string, Ability>;
  combat: CombatConfig;
  water: Water;
  buildingTypes: Record<string, BuildingType>;
  // Keyed by the settlement's site id: every town, city and village, generated with the map (M11).
  towns: Record<string, Town>;
  townStreets: TownStreets;
  // The generator's rules (M11), for what the generated places give.
  generator: GeneratorRules;
  roads: Roads;
  terrain: Terrain;
  terrainLoot: Omit<TerrainLoot, 'kinds'> & { byId: Record<string, TerrainKind> };
  outline: Outline;
  newGame: NewGameConfig;
  progression: ProgressionConfig;
  story: Story;
  charms: CharmsConfig;
  vehicles: Omit<VehiclesConfig, 'vehicles'> & { byId: Record<string, Vehicle> };
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
  abilities: unknown;
  combat: unknown;
  water: unknown;
  buildingTypes: unknown;
  backbone: unknown;
  landmarks: unknown;
  generator: unknown;
  roads: unknown;
  rail: unknown;
  forests: unknown;
  terrainLoot: unknown;
  outline: unknown;
  newGame: unknown;
  progression: unknown;
  story: unknown;
  charms: unknown;
  vehicles: unknown;
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
  // M11: the map is generated on a real backbone (D-102 to D-107), the same every time.
  const kept = Object.values(byId(z.array(siteSchema).parse(raw.sites), 'site'));
  const buildingTypes = byId(z.array(buildingTypeSchema).parse(raw.buildingTypes), 'building type');
  const outline = outlineSchema.parse(raw.outline);
  const rules = generatorSchema.parse(raw.generator);
  const world = generateWorld({
    backbone: backboneSchema.parse(raw.backbone).places,
    kept,
    landmarks: Object.fromEntries(landmarksSchema.parse(raw.landmarks).map((l) => [l.siteId, l.buildings])),
    buildingTypes,
    outline,
    highways: checkedRoads(roadsSchema.parse(raw.roads)),
    water: waterSchema.parse(raw.water),
    forests: forestsSchema.parse(raw.forests).rings,
    rail: railSchema.parse(raw.rail).lines,
    cfg: rules,
  });
  const content: Content = {
    characters: byId(z.array(characterSchema).parse(raw.characters), 'character'),
    sites: world.sites,
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
    abilities: byId(z.array(abilitySchema).parse(raw.abilities), 'ability'),
    combat: combatSchema.parse(raw.combat),
    water: world.water,
    buildingTypes,
    towns: world.towns,
    townStreets: world.townStreets,
    // D-099: trips inside towns follow their streets; generated roads join the highways (M11).
    roads: world.roads,
    generator: rules,
    terrain: world.terrain,
    terrainLoot: (({ kinds, ...rest }) => ({ ...rest, byId: Object.fromEntries(kinds.map((k) => [k.id, k])) }))(terrainLootSchema.parse(raw.terrainLoot)),
    outline,
    newGame: newGameSchema.parse(raw.newGame),
    progression: progressionSchema.parse(raw.progression),
    story: storySchema.parse(raw.story),
    charms: charmsSchema.parse(raw.charms),
    vehicles: (({ vehicles: list, ...rest }) => ({ ...rest, byId: byId(list, 'vehicle') }))(vehiclesSchema.parse(raw.vehicles)),
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
  // D-069: abilities, statuses and stats must all point at things that exist.
  const statKeys = new Set(Object.keys(statsSchema.shape));
  const { statuses } = content.combat;
  const movements = new Set(['push', 'pull', 'shuffle', 'cleanse', 'extra_turn']);
  if (!statKeys.has(content.combat.moveResist)) throw new Error(`combat.json: moveResist ${content.combat.moveResist} is not a stat`);
  for (const [kind, st] of Object.entries(statuses)) if (st.resist && !statKeys.has(st.resist)) throw new Error(`combat.json: ${kind} resisted by unknown stat ${st.resist}`);
  for (const a of Object.values(content.abilities)) {
    for (const e of a.effects ?? []) {
      if (!statuses[e.kind] && !movements.has(e.kind)) throw new Error(`abilities.json ${a.id}: unknown effect ${e.kind}`);
      if (statuses[e.kind]?.modifiesStat && (!e.stat || !statKeys.has(e.stat))) throw new Error(`abilities.json ${a.id}: ${e.kind} needs a known stat`);
    }
    if (a.target.side !== 'self' && !a.target.ranks.length) throw new Error(`abilities.json ${a.id}: no target ranks`);
  }
  const ability = (id: string, where: string) => {
    if (!content.abilities[id]) throw new Error(`${where}: unknown ability ${id}`);
  };
  for (const ch of Object.values(content.characters)) for (const id of ch.abilities) ability(id, `characters.json ${ch.id}`);
  for (const id of content.combat.unarmed.abilities) ability(id, 'combat.json unarmed');
  for (const it of Object.values(content.items)) {
    if (it.combat?.ammo) item(it.combat.ammo, `items.json ${it.id} ammo`);
    for (const id of it.combat?.abilities ?? []) ability(id, `items.json ${it.id}`);
  }
  for (const e of Object.values(content.enemies)) {
    for (const a of e.abilities) ability(a.id, `enemies.json ${e.id}`);
    for (const entry of e.loot) item(entry.itemId, `enemies.json ${e.id}`);
    if (e.critCondition) condition(e.critCondition.conditionId, `enemies.json ${e.id}`);
    if (e.damage[0] > e.damage[1]) throw new Error(`enemies.json ${e.id}: damage min is above max`);
  }
  // D-101: the land-cover grid fills its box, and terrain loot names real items.
  const t = content.terrain;
  if (t.grid.length !== t.rows * t.cols) throw new Error(`the land cover has ${t.grid.length} squares, not ${t.rows} × ${t.cols}`);
  for (const k of Object.values(content.terrainLoot.byId)) {
    for (const e of [...k.search, ...(k.hunt?.entries ?? [])]) if (!content.items[e.itemId]) throw new Error(`terrain-loot.json: ${k.id} has unknown item ${e.itemId}`);
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
    if (!site) throw new Error(`a town: unknown site ${t.siteId}`);
    // A town's finds live in its buildings; a town-wide table as well would be a content mistake.
    if (content.loot[t.siteId]) throw new Error(`loot.json: ${t.siteId} has a town map, so it has no town-wide loot`);
    const spots = [{ id: 'its edge', lat: site.lat, lon: site.lon }, ...t.buildings, ...t.water, ...t.ends];
    for (const b of t.buildings) if (!content.buildingTypes[b.typeId]) throw new Error(`a town's ${b.id}: unknown building type ${b.typeId}`);
    for (const [i, a] of spots.entries()) {
      if (i > 0 && spotIds.has(a.id)) throw new Error(`towns.json: duplicate id ${a.id}`);
      spotIds.add(a.id);
      // Ground piles count as "here" within 50 m, so spots must be clearly apart or piles would mix.
      for (const b of spots.slice(i + 1)) if (distanceKm(a, b) < 0.1) throw new Error(`${t.siteId}: ${a.id} and ${b.id} are under 100 m apart`);
    }
  }
  // D-076: levels follow one another from 2, each needing more XP than the last.
  content.progression.levels.forEach((l, i) => {
    const prev = content.progression.levels[i - 1];
    if (l.level !== i + 2) throw new Error(`progression.json: level ${l.level} is out of order`);
    if (prev && l.xp <= prev.xp) throw new Error(`progression.json: level ${l.level} needs no more XP than level ${prev.level}`);
  });
  // Charms and vehicles (D-085, D-086): finds point at building types or sites; every rarity found has a charm.
  const place = (id: string, where: string) => {
    if (!content.buildingTypes[id] && !content.sites[id]) throw new Error(`${where}: unknown building type or site ${id}`);
  };
  for (const f of content.charms.finds) {
    for (const id of f.at) place(id, 'charms.json');
    for (const id of f.towns ?? []) if (!content.towns[id]) throw new Error(`charms.json: ${id} has no town map`);
    if (!Object.values(content.items).some((it) => it.charm?.rarity === f.rarity)) throw new Error(`charms.json: no ${f.rarity} charm`);
  }
  for (const it of Object.values(content.items)) {
    if ((it.category === 'charm') !== Boolean(it.charm)) throw new Error(`items.json ${it.id}: charm category and profile must go together`);
    for (const id of Object.keys(it.charm?.conditionTime ?? {})) condition(id, `items.json ${it.id}`);
  }
  item(content.vehicles.repair.itemId, 'vehicles.json repair');
  item(content.vehicles.repair.tool, 'vehicles.json repair');
  for (const v of Object.values(content.vehicles.byId)) {
    const where = `vehicles.json ${v.id}`;
    for (const f of v.finds) place(f.at, where);
    if (v.fuel) item(v.fuel.itemId, where);
    if (v.durability && v.durability.foundAt[0] > v.durability.foundAt[1]) throw new Error(`${where}: foundAt min is above max`);
    if (v.build) {
      for (const id of v.build.vehicles) if (!content.vehicles.byId[id]) throw new Error(`${where}: unknown vehicle ${id}`);
      for (const i of v.build.inputs) item(i.itemId, where);
      if (v.build.tool) item(v.build.tool, where);
    }
  }
  return content;
}

export function loadContent(): Content {
  return parseContent({ characters, sites, items, world, survival, loot, scavenging, fire, recipes, conditions, events, enemies, abilities, combat, water, buildingTypes, backbone, landmarks, generator, roads, rail, forests, terrainLoot, outline: tamilNadu, newGame, progression, story, charms, vehicles });
}

/** roads.json checked as shipped; the generator joins its roads and streets to it (M11). */
function checkedRoads(roads: Roads): Roads {
  const nodeCount = roads.nodes.length;
  const badEdge = roads.edges.find(([a, b]) => a >= nodeCount || b >= nodeCount);
  if (badEdge) throw new Error(`roads.json: edge ${badEdge.join(',')} points past the ${nodeCount} nodes`);
  return roads;
}
