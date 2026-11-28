import type { BuildingType, Outline, Roads, Site, Terrain, Town, TownStreets, Water } from '../schemas';
import { withStreets } from '../streets';
import { distanceToLineKm, insideRing, samplePath, type LatLon } from '../../engine/systems/travel/geo';
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
  // Rivers and big reservoirs stay where they are; buildings and wells keep off them. Smaller water that
  // anything built touches is left out below.
  const large = input.water.areas.filter((a) => a.river || ringKm(a.ring) >= LARGE_WATER_KM);
  const small = input.water.areas.filter((a) => !large.includes(a));
  const wetIndex = large.map((a) => ({ ring: a.ring, box: box(a.ring, 0.001) }));
  const wetWithin = (clearKm: number) => (p: LatLon) =>
    wetIndex.some(({ ring, box: [s, n, w, e] }) => p.lat >= s - clearKm / 100 && p.lat <= n + clearKm / 100 && p.lon >= w - clearKm / 100 && p.lon <= e + clearKm / 100 && (insideRing(p, ring) || distanceToLineKm(p, ring) <= clearKm));
  const wet = wetWithin(CLEAR_KM);
  // A generated place's centre keeps 300 m from them, so its streets have room before the shore.
  const settlements = generateSettlements(owners, otherKept, input.outline, cfg.spawn, cfg.names, seed, wetWithin(0.3));

  const sites: Record<string, Site> = {};
  for (const k of input.kept) sites[k.id] = { ...k, owner: true };
  for (const s of settlements) {
    const kept = keptById.get(s.id);
    sites[s.id] = { id: s.id, name: kept?.name ?? s.name, kind: kept?.kind ?? KIND[s.tier], lat: s.lat, lon: s.lon, owner: s.owner, tier: s.tier };
  }

  const typeNames = Object.fromEntries(Object.values(input.buildingTypes).map((t) => [t.id, t.name]));
  const towns: Record<string, Town> = {};
  const townStreets: TownStreets = {};
  const details = settlements.map((s) => generateDetail(s, cfg, typeNames, input.landmarks[s.id] ?? [], seed, wet));
  const built = new BuiltIndex();
  details.forEach((d, k) => built.add(k, d));

  // Water stays outside towns, cities and villages (owner, 2026-11-28): a tank, pond or small lake that
  // one of their buildings, wells or streets touches is left out, and so is a tank that reaches another place.
  const tankRings: [number, number][][] = [];
  details.forEach((d, k) => {
    const s = settlements[k]!;
    const tankIds = d.water.filter((w) => w.kind === 'tank').map((w) => w.id);
    const dropped = new Set<string>();
    d.tanks.forEach((ring, i) => (built.touches(ring, k) ? dropped.add(tankIds[i]!) : tankRings.push(ring)));
    towns[s.id] = { siteId: s.id, buildings: d.buildings, water: d.water.filter((w) => !dropped.has(w.id)), ends: [] };
    townStreets[s.id] = d.streets;
  });

  const roadLines = generateRoads(settlements, input.highways, seed);
  const roads = withStreets(input.highways, { ...townStreets, 'generated.roads': roadLines });
  const water: Water = { ...input.water, areas: [...large, ...small.filter((a) => !built.touches(a.ring)), ...tankRings.map((ring) => ({ ring, river: false }))] };
  const terrain = { ...generateLandCover(input.outline, input.forests, input.water.rivers, settlements, cfg.landCover.cellDeg, seed), rail: input.rail };
  return { sites, towns, townStreets, roads, water, terrain, settlements };
}

/** Water this wide or wider (or a river) is kept even beside a settlement; smaller water is moved out of the way. */
const LARGE_WATER_KM = 2;
/** How far anything built keeps from water. */
const CLEAR_KM = 0.05;

/** A ring's bounding box [south, north, west, east], padded by pad degrees. */
function box(ring: [number, number][], pad: number): [number, number, number, number] {
  const lons = ring.map((q) => q[0]), lats = ring.map((q) => q[1]);
  return [Math.min(...lats) - pad, Math.max(...lats) + pad, Math.min(...lons) - pad, Math.max(...lons) + pad];
}
const ringKm = (ring: [number, number][]) => {
  const [s, n, w, e] = box(ring, 0);
  return Math.hypot((n - s) * 110.57, (e - w) * 111.32 * Math.cos((s * Math.PI) / 180));
};

/** Where settlements have built (buildings, wells, streets every 100 m), on a ~1 km grid, to keep water out. */
class BuiltIndex {
  private static readonly CELL = 0.01;
  private grid = new Map<string, { p: LatLon; owner: number }[]>();
  private key = (lat: number, lon: number) => `${Math.floor(lat / BuiltIndex.CELL)},${Math.floor(lon / BuiltIndex.CELL)}`;

  add(owner: number, d: { buildings: LatLon[]; water: { kind: string; lat: number; lon: number }[]; streets: [number, number][][] }) {
    const points = [
      ...d.buildings,
      ...d.water.filter((w) => w.kind === 'well'), // a tank's spot is its own shore
      ...d.streets.flatMap((line) => samplePath(line.map(([lon, lat]) => ({ lat, lon })), 0.1)),
    ];
    for (const p of points) {
      const k = this.key(p.lat, p.lon);
      const cell = this.grid.get(k) ?? [];
      cell.push({ p, owner });
      this.grid.set(k, cell);
    }
  }

  /** Whether anything built (by a settlement other than `except`) is in the ring or within 50 m of it. */
  touches(ring: [number, number][], except = -1): boolean {
    const [s, n, w, e] = box(ring, 0.001);
    for (let i = Math.floor(s / BuiltIndex.CELL); i <= Math.floor(n / BuiltIndex.CELL); i++) {
      for (let j = Math.floor(w / BuiltIndex.CELL); j <= Math.floor(e / BuiltIndex.CELL); j++) {
        for (const { p, owner } of this.grid.get(`${i},${j}`) ?? []) {
          if (owner === except || p.lat < s || p.lat > n || p.lon < w || p.lon > e) continue;
          if (insideRing(p, ring) || distanceToLineKm(p, ring) <= CLEAR_KM) return true;
        }
      }
    }
    return false;
  }
}
