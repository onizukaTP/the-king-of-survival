import { z } from 'zod';
import {
  buildingTypeSchema, fireSchema, townSchema, type FireConfig, townStreetsSchema, type BuildingType, type Town, type TownStreets,
  characterSchema, itemSchema, lootSchema, newGameSchema, outlineSchema, roadsSchema, scavengingSchema, siteSchema, survivalSchema, waterSchema, worldSchema,
  type Character, type Item, type Loot, type NewGameConfig, type Outline, type Roads, type ScavengingConfig, type Site, type SurvivalConfig, type Water, type WorldConfig,
} from './schemas';
import characters from './data/characters.json';
import items from './data/items.json';
import loot from './data/loot.json';
import scavenging from './data/scavenging.json';
import fire from './data/fire.json';
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
  return parseContent({ characters, sites, items, world, survival, loot, scavenging, fire, water, buildingTypes, towns, townStreets, roads, outline: tamilNadu, newGame });
}
