import { z } from 'zod';
import {
  characterSchema, itemSchema, newGameSchema, outlineSchema, roadsSchema, siteSchema, survivalSchema, worldSchema,
  type Character, type Item, type NewGameConfig, type Outline, type Roads, type Site, type SurvivalConfig, type WorldConfig,
} from './schemas';
import characters from './data/characters.json';
import items from './data/items.json';
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
  const nodeCount = content.roads.nodes.length;
  const badEdge = content.roads.edges.find(([a, b]) => a >= nodeCount || b >= nodeCount);
  if (badEdge) throw new Error(`roads.json: edge ${badEdge.join(',')} points past the ${nodeCount} nodes`);
  return content;
}

export function loadContent(): Content {
  return parseContent({ characters, sites, items, world, survival, roads, outline: tamilNadu, newGame });
}
