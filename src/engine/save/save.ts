import { z } from 'zod';
import { gameStateSchema, type GameState } from '../core/state';

export const SAVE_VERSION = 1;

const saveSchema = z.object({
  saveVersion: z.literal(SAVE_VERSION),
  createdAt: z.string(),
  gameState: gameStateSchema,
});

export type SaveFile = z.infer<typeof saveSchema>;

// migrations[n] upgrades a save object from version n to n + 1. Never edit an existing entry.
const migrations: Record<number, (save: Record<string, unknown>) => Record<string, unknown>> = {};

/** `createdAt` is passed in because the engine never reads the wall clock. */
export function createSave(gameState: GameState, createdAt: string): SaveFile {
  return { saveVersion: SAVE_VERSION, createdAt, gameState };
}

export type LoadResult = { ok: true; save: SaveFile } | { ok: false; error: string };

/** Accepts anything (IndexedDB, imported JSON) and returns a valid current-version save or a reason it isn't one. */
export function loadSave(raw: unknown): LoadResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Save data is not an object.' };
  let data = raw as Record<string, unknown>;
  let version = data.saveVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) return { ok: false, error: 'Save has no version.' };
  if (version > SAVE_VERSION) return { ok: false, error: `Save version ${version} is newer than this game (${SAVE_VERSION}).` };
  while (version < SAVE_VERSION) {
    const migrate = migrations[version];
    if (!migrate) return { ok: false, error: `No migration from save version ${version}.` };
    data = migrate(data);
    version += 1;
  }
  const parsed = saveSchema.safeParse(data);
  return parsed.success ? { ok: true, save: parsed.data } : { ok: false, error: `Save is corrupted: ${parsed.error.message}` };
}
