import { describe, expect, it } from 'vitest';
import { loadContent, parseContent, type RawContent } from './loader';
import { distanceToLineKm, insideRing } from '../engine/systems/travel/geo';
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
import landmarks from './data/landmarks.json';
import backbone from './data/backbone.json';
import generator from './data/generator.json';
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

const raw: RawContent = { characters, sites, items, world, survival, loot, scavenging, fire, recipes, conditions, events, enemies, abilities, combat, water, buildingTypes, backbone, landmarks, generator, roads, rail, forests, terrainLoot, outline: tamilNadu, newGame, progression, story, charms, vehicles };
const prabu = characters[0]!;
const home = sites[0]!;

describe('content loader', () => {
  it('loads the shipped content', () => {
    const content = loadContent();
    expect(content.characters['character.prabu']?.name).toBe('Prabu');
    // M11: the 8 kept destinations, the owner's 72 backbone places (Madurai and Rajapalayam among both)
    // and the generated towns and villages around them.
    const sites = Object.values(content.sites);
    expect(sites.filter((s) => s.owner !== false)).toHaveLength(8 + 72 - 2);
    expect(sites.filter((s) => s.owner === false).length).toBeGreaterThan(400);
    expect(content.roads.nodes.length).toBeGreaterThan(1000);
    // D-026 + D-037: the 28 approved items, the three starting-kit additions and lighter fuel (37 with D-057, D-058);
    // M10 adds biodiesel and the 13 charms (P-021, P-022).
    expect(Object.keys(content.items)).toHaveLength(63);
    expect(Object.values(content.items).filter((i) => i.charm)).toHaveLength(13);
    expect(Object.keys(content.vehicles.byId)).toEqual(['vehicle.hand_cart', 'vehicle.cycle', 'vehicle.cycle_trailer', 'vehicle.auto_rickshaw', 'vehicle.bullock_cart']);
    // P-014: 16 building types. M11: every settlement has its buildings; Madurai (a city) keeps its five
    // named landmarks among 25–40 buildings.
    expect(Object.keys(content.buildingTypes)).toHaveLength(16);
    expect(Object.keys(content.towns)).toHaveLength(sites.filter((s) => s.tier).length);
    const madurai = content.towns['loc.madurai']!.buildings;
    expect(madurai.length).toBeGreaterThanOrEqual(25);
    expect(madurai.length).toBeLessThanOrEqual(40);
    expect(madurai.filter((b) => b.id.startsWith('building.mdu_')).map((b) => b.name)).toContain('Meenakshi Amman temple');
    expect(content.water.wells).toHaveLength(39);
    // D-059, D-061, D-066: the 12 starter events plus the boar and the ambush; 6 conditions; 4 enemies.
    expect(content.events.events).toHaveLength(14);
    expect(Object.keys(content.enemies)).toHaveLength(4);
    expect(Object.keys(content.conditions)).toHaveLength(6);
  });

  it('keeps water out of towns, cities and villages: no building or well stands in water (owner, 2026-11-28)', () => {
    const content = loadContent();
    const areas = content.water.areas.map((a) => {
      const lons = a.ring.map((q) => q[0]), lats = a.ring.map((q) => q[1]);
      return { ring: a.ring, s: Math.min(...lats) - 0.001, n: Math.max(...lats) + 0.001, w: Math.min(...lons) - 0.001, e: Math.max(...lons) + 0.001 };
    });
    const spots = Object.values(content.towns).flatMap((t) => [...t.buildings, ...t.water.filter((w) => w.kind === 'well')]);
    const wet = spots.filter((p) => areas.some((a) => p.lat >= a.s && p.lat <= a.n && p.lon >= a.w && p.lon <= a.e && (insideRing(p, a.ring) || distanceToLineKm(p, a.ring) < 0.05)));
    expect(wet.map((p) => p.id)).toEqual([]);
    // Streets end at the shore: no street point lies in water.
    const streetPoints = Object.values(content.townStreets).flat(2).map(([lon, lat]) => ({ lat, lon }));
    expect(streetPoints.filter((p) => areas.some((a) => p.lat >= a.s && p.lat <= a.n && p.lon >= a.w && p.lon <= a.e && insideRing(p, a.ring)))).toEqual([]);
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
    const [sri] = landmarks;
    const moved = { ...sri!, buildings: sri!.buildings.map((b, i) => (i === 1 ? { ...b, lat: sri!.buildings[0]!.lat, lon: sri!.buildings[0]!.lon } : b)) };
    expect(() => parseContent({ ...raw, landmarks: [moved] })).toThrow(/under 100 m apart/);
    expect(() => parseContent({ ...raw, landmarks: [{ ...sri!, buildings: [{ ...sri!.buildings[0]!, typeId: 'btype.castle' }] }] })).toThrow(/unknown building type/);
    expect(() => parseContent({ ...raw, loot: [...loot, { siteId: 'loc.madurai', search: [] }] })).toThrow(/town-wide loot/);
  });
});
