import { z } from 'zod';
import {
  characterSchema, itemSchema, lootSchema, newGameSchema, outlineSchema, roadsSchema, scavengingSchema, siteSchema, survivalSchema, waterSchema, worldSchema,
  type Character, type Item, type Loot, type NewGameConfig, type Outline, type Roads, type ScavengingConfig, type Site, type SurvivalConfig, type Water, type WorldConfig,
} from './schemas';
import characters from './data/characters.json';
import items from './data/items.json';
import loot from './data/loot.json';
import scavenging from './data/scavenging.json';
import water from './data/water.json';
import survival from './data/survival.json';
import newGame from './data/new-game.json';
import roads from './data/roads.json';
import sites from './data/sites.json';
import tamilNadu from './data/tamil-nadu.json';
import world from './data/world.json';

export interface Content {
  characters: Record<string, Character>;
  sites: Record<string, Site>;
  items: Record<string, Item>;
  world: WorldConfig;
  survival: SurvivalConfig;
  loot: Record<string, Loot>;
  scavenging: ScavengingConfig;
  water: Water;
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
  water: unknown;
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
    water: waterSchema.parse(raw.water),
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
    if (it.recharges && !item(it.recharges.itemId, `items.json ${it.id} recharges`).charge) {
      throw new Error(`items.json: ${it.id} recharges ${it.recharges.itemId}, which has no charge`);
    }
  }
  const { startingWeapon, startingKit } = content.newGame;
  if (startingWeapon && !item(startingWeapon, 'new-game.json').weapon) throw new Error(`new-game.json: ${startingWeapon} is not a weapon`);
  for (const k of startingKit) item(k.itemId, 'new-game.json');
  for (const id of Object.values(content.scavenging.bottles)) item(id, 'scavenging.json bottles');
  if (!item(content.scavenging.torchItemId, 'scavenging.json torchItemId').charge) throw new Error('scavenging.json: the torch item has no charge');
  for (const l of Object.values(content.loot)) {
    if (!content.sites[l.siteId]) throw new Error(`loot.json: unknown site ${l.siteId}`);
    for (const e of [...l.search, ...(l.hunt ?? [])]) {
      item(e.itemId, `loot.json ${l.siteId}`);
      if (e.min > e.max) throw new Error(`loot.json ${l.siteId}: ${e.itemId} min is above max`);
    }
  }
  const nodeCount = content.roads.nodes.length;
  const badEdge = content.roads.edges.find(([a, b]) => a >= nodeCount || b >= nodeCount);
  if (badEdge) throw new Error(`roads.json: edge ${badEdge.join(',')} points past the ${nodeCount} nodes`);
  return content;
}

export function loadContent(): Content {
  return parseContent({ characters, sites, items, world, survival, loot, scavenging, water, roads, outline: tamilNadu, newGame });
}
