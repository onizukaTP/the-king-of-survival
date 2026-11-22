import { describe, expect, it } from 'vitest';
import { loadContent, parseContent, type RawContent } from './loader';
import characters from './data/characters.json';
import items from './data/items.json';
import survival from './data/survival.json';
import loot from './data/loot.json';
import scavenging from './data/scavenging.json';
import water from './data/water.json';
import newGame from './data/new-game.json';
import roads from './data/roads.json';
import sites from './data/sites.json';
import tamilNadu from './data/tamil-nadu.json';
import world from './data/world.json';

const raw: RawContent = { characters, sites, items, world, survival, loot, scavenging, water, roads, outline: tamilNadu, newGame };
const prabu = characters[0]!;
const home = sites[0]!;

describe('content loader', () => {
  it('loads the shipped content', () => {
    const content = loadContent();
    expect(content.characters['character.prabu']?.name).toBe('Prabu');
    expect(Object.keys(content.sites)).toHaveLength(8);
    expect(content.roads.nodes.length).toBeGreaterThan(1000);
    // D-026 + D-037: the 28 approved items, the three starting-kit additions and lighter fuel.
    expect(Object.keys(content.items)).toHaveLength(32);
  });

  it('rejects bad ids and duplicates', () => {
    expect(() => parseContent({ ...raw, characters: [{ ...prabu, id: 'Prabu' }] })).toThrow();
    expect(() => parseContent({ ...raw, characters: [{ ...prabu, id: 'characterXprabu' }] })).toThrow();
    expect(() => parseContent({ ...raw, characters: [prabu, prabu] })).toThrow(/Duplicate character/);
    expect(() => parseContent({ ...raw, sites: [home, home] })).toThrow(/Duplicate site/);
    expect(() => parseContent({ ...raw, sites: [{ ...home, kind: 'castle' }] })).toThrow();
  });

  it('rejects dangling references', () => {
    expect(() => parseContent({ ...raw, newGame: { ...newGame, startingCharacter: 'character.ghost' } })).toThrow(/unknown character/);
    expect(() => parseContent({ ...raw, newGame: { ...newGame, startSite: 'loc.nowhere' } })).toThrow(/unknown site/);
    expect(() => parseContent({ ...raw, newGame: { ...newGame, startingWeapon: 'item.salt' } })).toThrow(/not a weapon/);
    expect(() => parseContent({ ...raw, newGame: { ...newGame, startingKit: [{ itemId: 'item.gold', count: 1 }] } })).toThrow(/unknown item/);
    expect(() => parseContent({ ...raw, items: [...items, { id: 'item.x', name: 'X', category: 'tool', weightKg: 1, leaves: 'item.nothing' }] })).toThrow(/unknown item/);
    expect(() => parseContent({ ...raw, loot: [{ siteId: 'loc.atlantis', search: [] }] })).toThrow(/unknown site/);
    expect(() => parseContent({ ...raw, loot: [{ siteId: 'loc.home', search: [{ itemId: 'item.gold', chance: 1, min: 1, max: 1 }] }] })).toThrow(/unknown item/);
    expect(() => parseContent({ ...raw, roads: { nodes: [[9.5, 77.6]], edges: [[0, 5, 1]] } })).toThrow(/points past/);
  });
});
