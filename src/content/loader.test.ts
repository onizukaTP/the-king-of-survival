import { describe, expect, it } from 'vitest';
import { loadContent, parseContent, type RawContent } from './loader';
import characters from './data/characters.json';
import items from './data/items.json';
import survival from './data/survival.json';
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
import towns from './data/towns.json';
import townStreets from './data/town-streets.json';
import newGame from './data/new-game.json';
import roads from './data/roads.json';
import sites from './data/sites.json';
import tamilNadu from './data/tamil-nadu.json';
import world from './data/world.json';

const raw: RawContent = { characters, sites, items, world, survival, loot, scavenging, fire, recipes, conditions, events, enemies, abilities, combat, water, buildingTypes, towns, townStreets, roads, outline: tamilNadu, newGame };
const prabu = characters[0]!;
const home = sites[0]!;

describe('content loader', () => {
  it('loads the shipped content', () => {
    const content = loadContent();
    expect(content.characters['character.prabu']?.name).toBe('Prabu');
    expect(Object.keys(content.sites)).toHaveLength(8);
    expect(content.roads.nodes.length).toBeGreaterThan(1000);
    // D-026 + D-037: the 28 approved items, the three starting-kit additions and lighter fuel.
    expect(Object.keys(content.items)).toHaveLength(37);
    // P-014: 16 building types; 13, 16 and 24 buildings; 39 mapped wells.
    expect(Object.keys(content.buildingTypes)).toHaveLength(16);
    expect(Object.values(content.towns).map((t) => t.buildings.length)).toEqual([13, 16, 24]);
    expect(content.water.wells).toHaveLength(39);
    // D-059, D-061, D-066: the 12 starter events plus the boar and the ambush; 6 conditions; 4 enemies.
    expect(content.events.events).toHaveLength(14);
    expect(Object.keys(content.enemies)).toHaveLength(4);
    expect(Object.keys(content.conditions)).toHaveLength(6);
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
    const [sri] = towns;
    const moved = { ...sri!, buildings: sri!.buildings.map((b, i) => (i === 1 ? { ...b, lat: sri!.buildings[0]!.lat, lon: sri!.buildings[0]!.lon } : b)) };
    expect(() => parseContent({ ...raw, towns: [moved] })).toThrow(/under 100 m apart/);
    expect(() => parseContent({ ...raw, towns: [{ ...sri!, buildings: [{ ...sri!.buildings[0]!, typeId: 'btype.castle' }] }] })).toThrow(/unknown building type/);
    expect(() => parseContent({ ...raw, loot: [...loot, { siteId: 'loc.madurai', search: [] }] })).toThrow(/town-wide loot/);
  });
});
