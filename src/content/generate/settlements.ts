import type { Outline } from '../schemas';
import { between, pick, streamFor } from './rng';

// D-102 to D-107: the owner's backbone places at their real positions; around each city 3–5 generated
// towns, around each town (the owner's and the generated) 4–8 generated villages. Positions and names
// come from the world seed, so the world is the same every time.

export type Tier = 'city' | 'town' | 'village';

export interface Settlement {
  id: string;
  name: string;
  tier: Tier;
  lat: number;
  lon: number;
  /** The settlement this one was spawned around; null for the owner's places. */
  parent: string | null;
  /** One of the owner's places (D-104, D-107): normal loot, working wells, first-visit XP. */
  owner: boolean;
}

export interface SpawnConfig {
  townsPerCity: [number, number];
  townKm: [number, number];
  villagesPerTown: [number, number];
  villageKm: [number, number];
  minGapKm: number;
  villageToParentMinKm: number;
  keptSiteGapKm: number;
  tries: number;
}

const R = 6371;
export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The point `dist` km from p at `angle` radians (0 = east). */
export function offset(p: { lat: number; lon: number }, dist: number, angle: number) {
  const lat = p.lat + (dist * Math.sin(angle)) / 111.32;
  const lon = p.lon + (dist * Math.cos(angle)) / (111.32 * Math.cos((p.lat * Math.PI) / 180));
  return { lat, lon };
}

function insideRing(p: { lat: number; lon: number }, ring: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if ((yi > p.lat) !== (yj > p.lat) && p.lon < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const onLand = (p: { lat: number; lon: number }, outline: Outline) =>
  outline.polygons.some((polygon) => polygon.reduce((inside, ring) => (insideRing(p, ring) ? !inside : inside), false));

const slugOf = (id: string) => id.replace(/^loc\./, '');

/** Names from common parts of Tamil place names (D-103), none used twice. */
function namer(seed: number, parts: { prefixes: string[]; suffixes: string[] }, taken: Set<string>) {
  return (key: string): string => {
    const r = streamFor(seed, `name:${key}`);
    for (let i = 0; i < 200; i++) {
      const name = pick(r, parts.prefixes) + pick(r, parts.suffixes);
      if (!taken.has(name.toLowerCase())) {
        taken.add(name.toLowerCase());
        return name;
      }
    }
    throw new Error(`no free name for ${key}`);
  };
}

export function generateSettlements(
  owners: Settlement[],
  keptSites: { lat: number; lon: number }[],
  outline: Outline,
  cfg: SpawnConfig,
  names: { prefixes: string[]; suffixes: string[] },
  seed: number,
): Settlement[] {
  const all: Settlement[] = [...owners];
  const name = namer(seed, names, new Set(owners.map((o) => o.name.toLowerCase())));

  const fits = (p: { lat: number; lon: number }, parent: Settlement, gapToParent: number) =>
    onLand(p, outline)
    && keptSites.every((k) => km(p, k) >= cfg.keptSiteGapKm)
    && all.every((s) => km(p, s) >= (s.id === parent.id ? gapToParent : cfg.minGapKm));

  const spawn = (parent: Settlement, tier: Tier, count: [number, number], dist: [number, number], gapToParent: number) => {
    const r = streamFor(seed, `${tier}s:${parent.id}`);
    const n = between(r, count);
    const made: Settlement[] = [];
    for (let k = 1; k <= n; k++) {
      for (let t = 0; t < cfg.tries; t++) {
        const p = offset(parent, dist[0] + r() * (dist[1] - dist[0]), r() * 2 * Math.PI);
        if (!fits(p, parent, gapToParent)) continue;
        const base = slugOf(parent.id);
        const id = `loc.${base.startsWith('g_') ? '' : 'g_'}${base}_${tier[0]}${k}`;
        const s: Settlement = { id, name: name(id), tier, lat: Math.round(p.lat * 1e5) / 1e5, lon: Math.round(p.lon * 1e5) / 1e5, parent: parent.id, owner: false };
        all.push(s);
        made.push(s);
        break;
      }
    }
    return made;
  };

  const towns: Settlement[] = owners.filter((o) => o.tier === 'town');
  for (const city of owners.filter((o) => o.tier === 'city')) towns.push(...spawn(city, 'town', cfg.townsPerCity, cfg.townKm, cfg.minGapKm));
  for (const town of towns) spawn(town, 'village', cfg.villagesPerTown, cfg.villageKm, cfg.villageToParentMinKm);
  return all;
}
