import { z } from 'zod';
import { characterSchema, newGameSchema, type Character, type NewGameConfig } from './schemas';
import characters from './data/characters.json';
import newGame from './data/new-game.json';

export interface Content {
  characters: Record<string, Character>;
  newGame: NewGameConfig;
}

/** Validates raw content and cross-references; throws a readable error, since bad content is a build bug. */
export function parseContent(raw: { characters: unknown; newGame: unknown }): Content {
  const list = z.array(characterSchema).parse(raw.characters);
  const byId: Record<string, Character> = {};
  for (const c of list) {
    if (byId[c.id]) throw new Error(`Duplicate character id: ${c.id}`);
    byId[c.id] = c;
  }
  const config = newGameSchema.parse(raw.newGame);
  if (!byId[config.startingCharacter]) throw new Error(`new-game.json: unknown character ${config.startingCharacter}`);
  return { characters: byId, newGame: config };
}

export function loadContent(): Content {
  return parseContent({ characters, newGame });
}
