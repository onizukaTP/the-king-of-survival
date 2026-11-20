import { z } from 'zod';
import type { Content } from '../../content/loader';
import { gameStateSchema, startPosition, type GameState } from '../core/state';
import { initialMap } from '../systems/travel/travel';

export const SAVE_VERSION = 2;

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
  return { ok: true, save: parsed.data };
}
