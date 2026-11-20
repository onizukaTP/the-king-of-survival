import { z } from 'zod';
import type { Content } from '../../content/loader';

// The schema is the single source of truth for GameState's shape; saves are validated against it.
// Changing it means bumping SAVE_VERSION and adding a migration (src/engine/save/save.ts).
export const gameStateSchema = z.object({
  rngState: z.number().int().nonnegative(),
  clockMinutes: z.number().int().nonnegative(),
  player: z.object({ characterId: z.string() }),
});

export type GameState = z.infer<typeof gameStateSchema>;

export function createNewGame(content: Content, seed: number): GameState {
  return {
    rngState: seed >>> 0,
    clockMinutes: 0,
    player: { characterId: content.newGame.startingCharacter },
  };
}
