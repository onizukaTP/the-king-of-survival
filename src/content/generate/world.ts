import type { BuildingType, Outline, Roads, Site, Terrain, Town, TownStreets, Water } from '../schemas';
import { withStreets } from '../streets';
import { generateDetail, type DetailConfig, type GenBuilding } from './detail';
import { generateRoads } from './roads';
import { generateLandCover } from './landcover';
import { generateSettlements, type Settlement, type SpawnConfig, type Tier } from './settlements';

// The generated map (M11; D-102 to D-107): the owner's places on a real backbone, with generated towns,
// villages, buildings, streets, roads and tanks. Built once when the game loads, the same every time.

export interface GeneratorConfig extends DetailConfig {
  landCover: { cellDeg: number };
  worldSeed: number;
  version: number;
  spawn: SpawnConfig;
  names: { prefixes: string[]; suffixes: string[] };
}

export interface BackbonePlace { id: string; name: string; tier: Tier; lat: number; lon: number }

export interface GeneratedWorld {
  sites: Record<string, Site>;
  towns: Record<string, Town>;
  townStreets: TownStreets;
  roads: Roads;
  water: Water;
  terrain: Terrain;
  settlements: Settlement[];
}

const KIND: Record<Tier, Site['kind']> = { city: 'city', town: 'town', village: 'village' };

export function generateWorld(input: {
  backbone: BackbonePlace[];
  /** The kept destinations (sites.json): home, the forest, the dam, the highway stretch, the station, the kept towns. */
  kept: Site[];
  /** The kept towns' landmarks (towns.json), by town. */
  landmarks: Record<string, GenBuilding[]>;
  buildingTypes: Record<string, BuildingType>;
  outline: Outline;
  highways: Roads;
  water: Water;
  forests: [number, number][][];
  rail: [number, number][][];
  cfg: GeneratorConfig;
}): GeneratedWorld {
  const { cfg } = input;
  const seed = cfg.worldSeed * 1000 + cfg.version;
  const keptById = new Map(input.kept.map((k) => [k.id, k]));

  // The owner's settlements: the backbone, plus kept towns that aren't on it (Srivilliputhur).
  const owners: Settlement[] = input.backbone.map((b) => ({ ...b, parent: null, owner: true }));
  for (const k of input.kept) {
    if (input.landmarks[k.id] && !owners.some((o) => o.id === k.id)) owners.push({ id: k.id, name: k.name, tier: 'town', lat: k.lat, lon: k.lon, parent: null, owner: true });
  }
  const settled = new Set(owners.map((o) => o.id));
  const otherKept = input.kept.filter((k) => !settled.has(k.id));
  const settlements = generateSettlements(owners, otherKept, input.outline, cfg.spawn, cfg.names, seed);

  const sites: Record<string, Site> = {};
  for (const k of input.kept) sites[k.id] = { ...k, owner: true };
  for (const s of settlements) {
    const kept = keptById.get(s.id);
    sites[s.id] = { id: s.id, name: kept?.name ?? s.name, kind: kept?.kind ?? KIND[s.tier], lat: s.lat, lon: s.lon, owner: s.owner, tier: s.tier };
  }

  const typeNames = Object.fromEntries(Object.values(input.buildingTypes).map((t) => [t.id, t.name]));
  const towns: Record<string, Town> = {};
  const townStreets: TownStreets = {};
  const tankRings: [number, number][][] = [];
  for (const s of settlements) {
    const d = generateDetail(s, cfg, typeNames, input.landmarks[s.id] ?? [], seed);
    towns[s.id] = { siteId: s.id, buildings: d.buildings, water: d.water, ends: [] };
    townStreets[s.id] = d.streets;
    tankRings.push(...d.tanks);
  }

  const roadLines = generateRoads(settlements, input.highways, seed);
  const roads = withStreets(input.highways, { ...townStreets, 'generated.roads': roadLines });
  const water: Water = { ...input.water, areas: [...input.water.areas, ...tankRings.map((ring) => ({ ring, river: false }))] };
  const terrain = { ...generateLandCover(input.outline, input.forests, input.water.rivers, settlements, cfg.landCover.cellDeg, seed), rail: input.rail };
  return { sites, towns, townStreets, roads, water, terrain, settlements };
}
