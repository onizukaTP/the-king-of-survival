import { z } from 'zod';
import type { Content } from '../../content/loader';
import { initialMap } from '../systems/travel/travel';

const latLon = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) });

const mapStateSchema = z.object({
  discoveredSiteIds: z.array(z.string()),
  // Points whose surroundings are clear of fog (one per ~1 km cell).
  revealed: z.array(latLon),
});

const travelSchema = z.object({
  destination: latLon,
  siteId: z.string().nullable(),
  legs: z.array(z.object({ minutes: z.number().int().nonnegative(), km: z.number().nonnegative(), path: z.array(latLon).min(2) })).min(1),
  nextLeg: z.number().int().nonnegative(),
});

// The schema is the single source of truth for GameState's shape; saves are validated against it.
// Changing it means bumping SAVE_VERSION and adding a migration (src/engine/save/save.ts).
export const gameStateSchema = z.object({
  rngState: z.number().int().nonnegative(),
  // Minutes since Day 1 00:00.
  clockMinutes: z.number().int().nonnegative(),
  player: z.object({ characterId: z.string(), position: latLon }),
  map: mapStateSchema,
  // Set while a trip is under way; never mid-leg (D-010).
  travel: travelSchema.nullable(),
});

export type GameState = z.infer<typeof gameStateSchema>;
export type MapState = z.infer<typeof mapStateSchema>;

export function startPosition(content: Content) {
  const site = content.sites[content.newGame.startSite]!;
  return { lat: site.lat, lon: site.lon };
}

export function createNewGame(content: Content, seed: number): GameState {
  const position = startPosition(content);
  return {
    rngState: seed >>> 0,
    clockMinutes: content.newGame.startClockMinutes,
    player: { characterId: content.newGame.startingCharacter, position },
    map: initialMap(position, content),
    travel: null,
  };
}
