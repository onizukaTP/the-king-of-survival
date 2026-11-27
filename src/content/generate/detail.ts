import { between, streamFor, weighted } from './rng';
import { km, offset, type Settlement, type Tier } from './settlements';

// D-102, D-103: what is inside a settlement. A main street through its centre with side streets across
// it; buildings along the streets 100 m or more apart; wells among the buildings and a tank at the edge.
// The owner's landmarks keep their places; generic buildings fill in around them.

export interface SizeConfig {
  buildings: [number, number];
  streetKm: number;
  sideStreets: [number, number];
  wells: [number, number];
  tanks: [number, number];
}
export interface MixConfig { always: string[]; oneOf?: string[][]; weights: Record<string, number> }
export interface DetailConfig {
  sizes: Record<Tier, SizeConfig>;
  mix: Record<Tier, MixConfig>;
  buildingGapKm: number;
  tankChanceVillage: number;
  dryWellChance: number;
}

export interface GenBuilding { id: string; typeId: string; name: string; lat: number; lon: number; scarce?: boolean }
export interface GenWater { id: string; kind: 'well' | 'tank'; name: string; lat: number; lon: number; dry?: boolean }
export interface Detail {
  buildings: GenBuilding[];
  water: GenWater[];
  /** Street lines, [lon, lat], the main street first; its middle vertex is the settlement's centre. */
  streets: [number, number][][];
  /** Each tank's water, a ring [lon, lat]. */
  tanks: [number, number][][];
}

const round = (n: number) => Math.round(n * 1e5) / 1e5;
const slugOf = (id: string) => id.replace(/^loc\./, '');

export function generateDetail(
  s: Settlement,
  cfg: DetailConfig,
  typeNames: Record<string, string>,
  landmarks: GenBuilding[],
  seed: number,
): Detail {
  const r = streamFor(seed, `detail:${s.id}`);
  const size = cfg.sizes[s.tier];
  const slug = slugOf(s.id);

  // Streets: a main street through the centre, side streets across it.
  const angle = r() * Math.PI;
  const half = size.streetKm / 2;
  const line = (from: { lat: number; lon: number }, a: number, len: number, steps: number): { lat: number; lon: number }[] =>
    Array.from({ length: steps + 1 }, (_, i) => offset(from, (len * i) / steps, a));
  const start = offset(s, half, angle + Math.PI);
  const steps = Math.max(2, Math.round(size.streetKm / 0.2)) & ~1; // even, so the centre is a vertex
  const main = line(start, angle, size.streetKm, steps);
  main[steps / 2] = { lat: s.lat, lon: s.lon };
  const streets = [main];
  const sides = between(r, size.sideStreets);
  for (let i = 0; i < sides; i++) {
    // Each side street crosses the main street at one of its points, so they join on the road graph.
    const at = main[1 + Math.floor(r() * (main.length - 2))]!;
    const len = size.streetKm * (0.3 + r() * 0.3);
    const n = Math.max(1, Math.round(len / 0.4));
    const across = angle + Math.PI / 2;
    const back = line(at, across + Math.PI, len / 2, n).reverse();
    streets.push([...back.slice(0, -1), at, ...line(at, across, len / 2, n).slice(1)]);
  }

  // Places along the streets, kept apart from each other, the centre and the landmarks (with 10 m to
  // spare, since positions are rounded and the load-time check measures a little differently).
  const gap = cfg.buildingGapKm + 0.01;
  const taken: { lat: number; lon: number }[] = [{ lat: s.lat, lon: s.lon }, ...landmarks];
  const spot = (): { lat: number; lon: number } | null => {
    for (let t = 0; t < 120; t++) {
      const street = streets[Math.floor(r() * streets.length)]!;
      const i = Math.floor(r() * (street.length - 1));
      const a = street[i]!, b = street[i + 1]!, f = r();
      const p = { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f };
      if (taken.every((q) => km(p, q) >= gap)) {
        taken.push(p);
        return { lat: round(p.lat), lon: round(p.lon) };
      }
    }
    return null;
  };

  // Building types: the tier's must-haves, one of each either-or group, the rest by weight.
  const mix = cfg.mix[s.tier];
  const total = Math.max(0, between(r, size.buildings) - landmarks.length);
  const types = [...mix.always, ...(mix.oneOf ?? []).map((group) => group[Math.floor(r() * group.length)]!)];
  while (types.length < total) types.push(weighted(r, mix.weights));
  const buildings: GenBuilding[] = [];
  types.slice(0, Math.max(total, 0)).forEach((typeId, i) => {
    const p = spot();
    if (!p) return;
    const name = typeId === 'btype.house' ? 'House' : typeNames[typeId] ?? typeId;
    buildings.push({ id: `building.${slug}_${i + 1}`, typeId, name, ...p, ...(s.owner ? {} : { scarce: true }) });
  });

  // Wells among the buildings (most are dry in generated places, D-103); a tank at the edge.
  const water: GenWater[] = [];
  const wells = between(r, size.wells);
  for (let i = 0; i < wells; i++) {
    const p = spot();
    if (!p) continue;
    const dry = !s.owner && r() < cfg.dryWellChance;
    water.push({ id: `waterpoint.${slug}_well_${i + 1}`, kind: 'well', name: dry ? 'Dry well' : 'Well', ...p, ...(dry ? { dry } : {}) });
  }
  const tankCount = s.tier === 'village' ? (r() < cfg.tankChanceVillage ? 1 : 0) : between(r, size.tanks);
  const tanks: [number, number][][] = [];
  for (let i = 0; i < tankCount; i++) {
    // At the edge of the settlement, clear of every building and well (piles must never mix).
    for (let t = 0; t < 20; t++) {
      const radius = 0.12 + r() * 0.1;
      const centre = offset(s, half + radius + 0.15 + t * 0.05, angle + Math.PI / 2 + (r() - 0.5) * 2 + (i % 2) * Math.PI);
      // The spot to fish and fill from: the shore facing the settlement.
      const toward = Math.atan2(s.lat - centre.lat, (s.lon - centre.lon) * Math.cos((s.lat * Math.PI) / 180));
      const shore = offset(centre, radius, toward);
      if (!taken.every((q) => km(shore, q) >= gap)) continue;
      taken.push(shore);
      const ring: [number, number][] = Array.from({ length: 13 }, (_, k) => {
        const p = offset(centre, radius * (0.85 + 0.3 * r()), (k % 12) * (Math.PI / 6));
        return [round(p.lon), round(p.lat)] as [number, number];
      });
      ring[12] = ring[0]!;
      tanks.push(ring);
      water.push({ id: `waterpoint.${slug}_tank_${i + 1}`, kind: 'tank', name: 'Tank', lat: round(shore.lat), lon: round(shore.lon) });
      break;
    }
  }

  return {
    buildings: [...landmarks, ...buildings],
    water,
    streets: streets.map((st) => st.map((p) => [round(p.lon), round(p.lat)] as [number, number])),
    tanks,
  };
}
