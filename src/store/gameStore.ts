import { create } from 'zustand';
import { loadContent } from '../content/loader';
import { createNewGame, type GameState } from '../engine/core/state';
import { createSave, loadSave } from '../engine/save/save';
import { readSave, writeSave } from './saveStorage';

export const content = loadContent();

type Screen = 'title' | 'game';

interface GameStore {
  screen: Screen;
  game: GameState | null;
  hasSave: boolean;
  message: string | null;
  checkForSave: () => Promise<void>;
  newGame: () => void;
  saveGame: () => Promise<void>;
  loadGame: () => Promise<void>;
  quitToTitle: () => void;
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'title',
  game: null,
  hasSave: false,
  message: null,

  checkForSave: async () => {
    try {
      set({ hasSave: (await readSave()) !== undefined });
    } catch (err) {
      set({ hasSave: false, message: `Saves unavailable: ${errorText(err)}` });
    }
  },

  newGame: () => {
    const [seed = 0] = crypto.getRandomValues(new Uint32Array(1));
    set({ screen: 'game', game: createNewGame(content, seed), message: null });
  },

  saveGame: async () => {
    const { game } = get();
    if (!game) return;
    try {
      await writeSave(createSave(game, new Date().toISOString()));
      set({ hasSave: true, message: 'Game saved.' });
    } catch (err) {
      set({ message: `Save failed: ${errorText(err)}` });
    }
  },

  loadGame: async () => {
    try {
      const result = loadSave(await readSave());
      if (!result.ok) return set({ message: `Could not load: ${result.error}` });
      set({ screen: 'game', game: result.save.gameState, message: null });
    } catch (err) {
      set({ message: `Could not load: ${errorText(err)}` });
    }
  },

  quitToTitle: () => set({ screen: 'title', game: null, message: null }),
}));
