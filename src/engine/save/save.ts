import { z } from 'zod';
import type { Content } from '../../content/loader';
import { gameStateSchema, startingInventory, startingSurvival, startPosition, type GameState } from '../core/state';
import { initialMap } from '../systems/travel/travel';

export const SAVE_VERSION = 5;

const saveSchema = z.object({
  saveVersion: z.literal(SAVE_VERSION),
  createdAt: z.string(),
  gameState: gameStateSchema,
});

export type SaveFile = z.infer<typeof saveSchema>;
type RawSave = Record<string, unknown>;

// migrations[n] upgrades a save object from version n to n + 1. Never edit an existing entry.
const migrations: Record<number, (save: RawSave, content: Content) => RawSave> = {
  // v1 (M0) → v2 (M1): add position, map and travel; the clock now counts from Day 1 00:00.
  1: (save, content) => {
    const gs = save.gameState as { clockMinutes: number; player: object };
    const position = startPosition(content);
    return {
      ...save,
      saveVersion: 2,
      gameState: {
        ...gs,
        clockMinutes: gs.clockMinutes + content.newGame.startClockMinutes,
        player: { ...gs.player, position },
        map: initialMap(position, content),
        travel: null,
      },
    };
  },
  // v2 (M1) → v3 (M2 + M3): full meters, the starting kit, alive.
  2: (save, content) => {
    const gs = save.gameState as { clockMinutes: number };
    return {
      ...save,
      saveVersion: 3,
      gameState: { ...gs, survival: startingSurvival(content), inventory: startingInventory(content, gs.clockMinutes), dead: false },
    };
  },
  // v3 → v4 (M4): boiled water became clean water; radiation, site depletion and the ground.
  3: (save) => {
    const gs = save.gameState as { survival: object; inventory: { stacks: { itemId: string }[]; weapon: string | null } };
    const rename = (id: string) => (id === 'item.boiled_water' ? 'item.clean_water' : id);
    return {
      ...save,
      saveVersion: 4,
      gameState: {
        ...gs,
        survival: { ...gs.survival, radiation: 0, zoneMinutes: 0 },
        inventory: { ...gs.inventory, stacks: gs.inventory.stacks.map((s) => ({ ...s, itemId: rename(s.itemId) })) },
        sites: {},
        ground: [],
      },
    };
  },
  // v4 → v5 (town maps, D-049): not in a town; towns lose their town-wide search stock, since
  // their finds now live in buildings. Ground piles at a town's point stay at its edge.
  4: (save, content) => {
    const gs = save.gameState as { sites: Record<string, unknown> };
    const sites = Object.fromEntries(Object.entries(gs.sites).filter(([id]) => !content.towns[id]));
    return { ...save, saveVersion: 5, gameState: { ...gs, sites, town: null } };
  },
};

/** `createdAt` is passed in because the engine never reads the wall clock. */
export function createSave(gameState: GameState, createdAt: string): SaveFile {
  return { saveVersion: SAVE_VERSION, createdAt, gameState };
}

export type LoadResult = { ok: true; save: SaveFile } | { ok: false; error: string };

/** Accepts anything (IndexedDB, imported JSON) and returns a valid current-version save or a reason it isn't one. */
export function loadSave(raw: unknown, content: Content): LoadResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Save data is not an object.' };
  let data = raw as RawSave;
  let version = data.saveVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) return { ok: false, error: 'Save has no version.' };
  if (version > SAVE_VERSION) return { ok: false, error: `Save version ${version} is newer than this game (${SAVE_VERSION}).` };
  try {
    while (version < SAVE_VERSION) {
      const migrate = migrations[version];
      if (!migrate) return { ok: false, error: `No migration from save version ${version}.` };
      data = migrate(data, content);
      version += 1;
    }
  } catch (err) {
    return { ok: false, error: `Save is corrupted: ${String(err)}` };
  }
  const parsed = saveSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: `Save is corrupted: ${parsed.error.message}` };
  const { gameState } = parsed.data;
  // The save must point at content this build knows about.
  if (!content.characters[gameState.player.characterId]) return { ok: false, error: 'Save refers to an unknown character.' };
  if (gameState.map.discoveredSiteIds.some((id) => !content.sites[id])) return { ok: false, error: 'Save refers to an unknown place.' };
  const { stacks, weapon } = gameState.inventory;
  const items = [...stacks, ...gameState.ground].map((st) => st.itemId).concat(weapon ? [weapon] : []);
  if (items.some((id) => !content.items[id])) return { ok: false, error: 'Save refers to an unknown item.' };
  const buildingIds = new Set(Object.values(content.towns).flatMap((t) => t.buildings.map((b) => b.id)));
  if (Object.keys(gameState.sites).some((id) => !content.sites[id] && !buildingIds.has(id))) return { ok: false, error: 'Save refers to an unknown place.' };
  const { town } = gameState;
  if (town) {
    const map = content.towns[town.siteId];
    const spots = map ? ['edge', ...map.buildings.map((b) => b.id), ...map.water.map((w) => w.id)] : [];
    if (!map || (town.at !== null && !spots.includes(town.at))) return { ok: false, error: 'Save refers to an unknown town.' };
  }
  return { ok: true, save: parsed.data };
}
