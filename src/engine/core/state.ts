import { z } from 'zod';
import type { Content } from '../../content/loader';
import { addStack, makeStack } from '../systems/inventory/inventory';
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

const stackSchema = z.object({
  itemId: z.string(),
  count: z.number().int().positive(),
  // Lighter lights or torch battery left.
  charge: z.number().int().nonnegative().optional(),
  // Game minute at which this food spoils (D-028).
  spoilsAt: z.number().int().optional(),
});

const inventorySchema = z.object({
  stacks: z.array(stackSchema),
  // The one weapon slot (D-036); it still counts towards the carried weight.
  weapon: z.string().nullable(),
});

// Meters run 0–100 and are kept unrounded; the UI rounds them (D-023, D-035).
const survivalStateSchema = z.object({
  health: z.number().min(0).max(100),
  food: z.number().min(0).max(100),
  water: z.number().min(0).max(100),
  rest: z.number().min(0).max(100),
  // Health can't recover until this is cured (D-039).
  injured: z.boolean(),
  // Game minute when the stomach illness from unsafe water ends (D-027), or null.
  illUntil: z.number().int().nullable(),
  // Lowers maximum Health one for one (D-035, D-043).
  radiation: z.number().min(0).max(100),
  // Minutes spent in the radiation zone not yet rolled for; every full hour rolls once (D-043).
  zoneMinutes: z.number().nonnegative(),
});

// Search depletion per site (P-013): missing sites are untouched (100%).
const siteStateSchema = z.object({
  richness: z.number().min(0).max(100),
  // When the site's loot refreshes to 100% (7 days after it was first searched since the last refresh).
  refreshAt: z.number().int().nullable(),
});

// Finds left behind and dropped items, which stay where they are for 96 hours (D-045).
const groundPileSchema = stackSchema.extend({
  lat: z.number(),
  lon: z.number(),
  expiresAt: z.number().int(),
});

// Inside a town map (D-049). `at` is where he stands: 'edge' (the town's site point), a building or
// water point id, or null after a walk stopped part-way.
const townStateSchema = z.object({ siteId: z.string(), at: z.string().nullable() });

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
  survival: survivalStateSchema,
  inventory: inventorySchema,
  sites: z.record(z.string(), siteStateSchema),
  ground: z.array(groundPileSchema),
  town: townStateSchema.nullable(),
  // Permadeath (D-038): once true, every command is refused.
  dead: z.boolean(),
});

export type GameState = z.infer<typeof gameStateSchema>;
export type MapState = z.infer<typeof mapStateSchema>;
export type Stack = z.infer<typeof stackSchema>;
export type Inventory = z.infer<typeof inventorySchema>;
export type SurvivalState = z.infer<typeof survivalStateSchema>;
export type Meter = 'health' | 'food' | 'water' | 'rest';
export type GroundPile = z.infer<typeof groundPileSchema>;
export type TownState = z.infer<typeof townStateSchema>;

export const maxHealth = (s: SurvivalState) => Math.max(0, 100 - s.radiation);

export function startingSurvival(content: Content): SurvivalState {
  return { ...content.survival.start, injured: false, illUntil: null, radiation: 0, zoneMinutes: 0 };
}

export function startingInventory(content: Content, clockMinutes: number): Inventory {
  const inventory: Inventory = { stacks: [], weapon: content.newGame.startingWeapon };
  for (const k of content.newGame.startingKit) addStack(inventory, makeStack(k.itemId, k.count, clockMinutes, content, k.charge));
  return inventory;
}

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
    survival: startingSurvival(content),
    inventory: startingInventory(content, content.newGame.startClockMinutes),
    sites: {},
    ground: [],
    town: null,
    dead: false,
  };
}
