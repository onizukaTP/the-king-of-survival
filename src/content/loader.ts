import { z } from 'zod';
import {
  characterSchema, newGameSchema, outlineSchema, roadsSchema, siteSchema, worldSchema,
  type Character, type NewGameConfig, type Outline, type Roads, type Site, type WorldConfig,
} from './schemas';
import characters from './data/characters.json';
import newGame from './data/new-game.json';
import roads from './data/roads.json';
import sites from './data/sites.json';
import tamilNadu from './data/tamil-nadu.json';
import world from './data/world.json';

export interface Content {
  characters: Record<string, Character>;
  sites: Record<string, Site>;
  world: WorldConfig;
  roads: Roads;
  outline: Outline;
  newGame: NewGameConfig;
}

export interface RawContent {
  characters: unknown;
  sites: unknown;
  world: unknown;
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
    world: worldSchema.parse(raw.world),
    roads: roadsSchema.parse(raw.roads),
    outline: outlineSchema.parse(raw.outline),
    newGame: newGameSchema.parse(raw.newGame),
  };
  const { startingCharacter, startSite } = content.newGame;
  if (!content.characters[startingCharacter]) throw new Error(`new-game.json: unknown character ${startingCharacter}`);
  if (!content.sites[startSite]) throw new Error(`new-game.json: unknown site ${startSite}`);
  const nodeCount = content.roads.nodes.length;
  const badEdge = content.roads.edges.find(([a, b]) => a >= nodeCount || b >= nodeCount);
  if (badEdge) throw new Error(`roads.json: edge ${badEdge.join(',')} points past the ${nodeCount} nodes`);
  return content;
}

export function loadContent(): Content {
  return parseContent({ characters, sites, world, roads, outline: tamilNadu, newGame });
}
