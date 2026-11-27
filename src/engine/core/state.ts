import { z } from 'zod';
import type { Content } from '../../content/loader';
import { addStack, makeStack } from '../systems/inventory/inventory';
import { initialMap } from '../systems/travel/travel';

const latLon = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) });

// The map is open (D-094): every place is known; this keeps the places Prabu has been to (first visit = XP).
const mapStateSchema = z.object({
  visitedSiteIds: z.array(z.string()),
});

const travelSchema = z.object({
  destination: latLon,
  siteId: z.string().nullable(),
  legs: z.array(z.object({ minutes: z.number().int().nonnegative(), km: z.number().nonnegative(), path: z.array(latLon).min(2) })).min(1),
  nextLeg: z.number().int().nonnegative(),
  // Speeds the legs were planned at (km/h): walking, or the vehicle he rides (P-021).
  speeds: z.object({ road: z.number().positive(), cross: z.number().positive() }).optional(),
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
  // Charms worn (D-086): item ids, weightless while worn; the slots are in charms.json.
  charms: z.array(z.string()),
});

// A vehicle he owns (P-021): parked at lat/lon, or ridden (then it goes where he goes).
const vehicleStateSchema = z.object({
  uid: z.string(),
  vehicleId: z.string(),
  lat: z.number(),
  lon: z.number(),
  // null for the bullock cart, which never wears (D-085).
  durability: z.number().min(0).max(100).nullable(),
  // Litres in the tank, or null for a vehicle without fuel.
  fuel: z.number().min(0).nullable(),
  cargo: z.array(stackSchema),
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
  // Lasting modifiers (D-061); `until` is the game minute it ends, or null for "until treated or slept off".
  conditions: z.array(z.object({ id: z.string(), until: z.number().int().nullable() })),
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

// The one fire burning, where it was lit, until the game minute it burns out (D-056, P-016).
const fireStateSchema = z.object({ lat: z.number(), lon: z.number(), outAt: z.number().int() });

const findSchema = z.object({ itemId: z.string(), count: z.number().int().positive(), charge: z.number().int().nonnegative().optional() });

// The event card on screen (D-059). `result` is set once a choice is made, and kept until the player
// closes the card, so a reload shows the same outcome rather than rolling again.
const eventStateSchema = z.object({
  id: z.string(),
  result: z.object({
    choiceId: z.string(),
    outcome: z.number().int().nonnegative(),
    // Finds that went into the pack, and those left on the ground because they were too heavy.
    found: z.array(findSchema),
    left: z.array(findSchema),
    lost: z.array(z.string()),
    conditions: z.array(z.string()),
    siteId: z.string().nullable(),
  }).nullable(),
});

// A status on a fighter (D-069): bleed, blight, stun, mark, buff, debuff and any kind added to combat.json.
const statusSchema = z.object({
  kind: z.string(),
  // Damage a turn, or the stat change.
  amount: z.number().optional(),
  stat: z.string().optional(),
  // Turns left: counted down at the start of each of the holder's turns.
  rounds: z.number().int().nonnegative(),
});

// A fighter in the formation (D-069). The protagonist's Health is the real Health meter, so `hp` is
// kept only for the others. Rank 1 is the front; a fighter of size 2 takes ranks rank and rank + 1.
const combatantSchema = z.object({
  uid: z.string(),
  side: z.enum(['player', 'enemy']),
  // A character id (player side) or an enemy id.
  defId: z.string(),
  protagonist: z.boolean(),
  hp: z.number().int(),
  rank: z.number().int().min(1).max(4),
  size: z.number().int().min(1).max(2),
  statuses: z.array(statusSchema),
  deathsDoor: z.boolean(),
  // Dead but its remains still hold its ranks; `hp` is then the corpse's.
  corpse: z.boolean(),
});

// What happened since the player last acted, for the combat screen and its numbers. Kinds:
// ability, hit, miss, heal, status, resisted, dot, move, stunned, expired, deaths_door, deathblow,
// killed, corpse_cleared, pass, item, flee_failed.
const combatLogSchema = z.object({
  kind: z.string(),
  actor: z.string().optional(),
  target: z.string().optional(),
  abilityId: z.string().optional(),
  amount: z.number().optional(),
  crit: z.boolean().optional(),
  status: z.string().optional(),
  survived: z.boolean().optional(),
  itemId: z.string().optional(),
  // Who it was, for lines about fighters no longer on the field.
  defId: z.string().optional(),
});

// A fight under way (D-069). Saved between turns, so a reload goes back into the same turn.
const combatStateSchema = z.object({
  combatants: z.array(combatantSchema),
  round: z.number().int().positive(),
  // Turns still to come this round, in initiative order; the first is acting now.
  queue: z.array(z.string()),
  // Whether the first in the queue has begun its turn (its bleed and stun already resolved).
  turnStarted: z.boolean(),
  // The enemies defeated so far, for the loot.
  defeated: z.array(z.string()),
  arrowsShot: z.number().int().nonnegative(),
  log: z.array(combatLogSchema),
  result: z.object({
    outcome: z.enum(['won', 'fled']),
    found: z.array(findSchema),
    left: z.array(findSchema),
  }).nullable(),
});

// Experience and level (D-070, D-076), and the recipes made at least once (the first craft gives XP).
const progressionStateSchema = z.object({
  xp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  crafted: z.array(z.string()),
  // Testing tool (owner, 2026-11-27): every XP gain is multiplied by this; 1 in a normal run.
  xpMultiplier: z.number().min(0).max(100),
});

// A journal note (D-076), kept as data so the UI words it: a place found (older runs) or first visited,
// a fight won, a level gained.
const journalNoteSchema = z.object({
  at: z.number().int().nonnegative(),
  kind: z.enum(['discovered', 'visited', 'won', 'level']),
  siteId: z.string().optional(),
  enemies: z.array(z.string()).optional(),
  level: z.number().int().optional(),
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
  sites: z.record(z.string(), siteStateSchema),
  ground: z.array(groundPileSchema),
  town: townStateSchema.nullable(),
  fire: fireStateSchema.nullable(),
  event: eventStateSchema.nullable(),
  // Game minute the last event fired, for the cooldown (D-059).
  lastEventAt: z.number().int().nullable(),
  combat: combatStateSchema.nullable(),
  progression: progressionStateSchema,
  journal: z.object({ notes: z.array(journalNoteSchema) }),
  // Vehicles (M10): `riding` is the uid of the one in use; `seq` numbers new ones.
  vehicles: z.object({ list: z.array(vehicleStateSchema), riding: z.string().nullable(), seq: z.number().int().nonnegative() }),
  // The intro shows once per run, before the map (D-071, D-076).
  introSeen: z.boolean(),
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
export type FireState = z.infer<typeof fireStateSchema>;
export type EventState = z.infer<typeof eventStateSchema>;
export type CombatState = z.infer<typeof combatStateSchema>;
export type CombatLog = z.infer<typeof combatLogSchema>;
export type Combatant = z.infer<typeof combatantSchema>;
export type CombatStatus = z.infer<typeof statusSchema>;
export type JournalNote = z.infer<typeof journalNoteSchema>;
export type VehicleState = z.infer<typeof vehicleStateSchema>;

/** Radiation (D-035, D-043) and conditions such as Weak (D-061) lower maximum Health. */
export function maxHealth(s: SurvivalState, content: Content): number {
  const fromConditions = s.conditions.reduce((sum, c) => sum + (content.conditions[c.id]?.maxHealth ?? 0), 0);
  return Math.max(0, 100 - s.radiation + fromConditions);
}

export function startingSurvival(content: Content): SurvivalState {
  return { ...content.survival.start, injured: false, illUntil: null, radiation: 0, zoneMinutes: 0, conditions: [] };
}

export function startingInventory(content: Content, clockMinutes: number): Inventory {
  const inventory: Inventory = { stacks: [], weapon: content.newGame.startingWeapon, charms: [] };
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
    fire: null,
    event: null,
    lastEventAt: null,
    combat: null,
    progression: { xp: 0, level: 1, crafted: [], xpMultiplier: 1 },
    journal: { notes: [] },
    vehicles: { list: [], riding: null, seq: 0 },
    introSeen: false,
    dead: false,
  };
}
