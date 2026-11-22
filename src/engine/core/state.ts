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
  survival: survivalStateSchema,
  inventory: inventorySchema,
  // Permadeath (D-038): once true, every command is refused.
  dead: z.boolean(),
});

export type GameState = z.infer<typeof gameStateSchema>;
export type MapState = z.infer<typeof mapStateSchema>;
export type Stack = z.infer<typeof stackSchema>;
export type Inventory = z.infer<typeof inventorySchema>;
export type SurvivalState = z.infer<typeof survivalStateSchema>;
export type Meter = 'health' | 'food' | 'water' | 'rest';

export function startingSurvival(content: Content): SurvivalState {
  return { ...content.survival.start, injured: false, illUntil: null };
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
    dead: false,
  };
}
