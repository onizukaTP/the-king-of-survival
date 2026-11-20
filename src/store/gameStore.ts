import { create } from 'zustand';
import { loadContent } from '../content/loader';
import { applyCommand, type Command, type GameEvent } from '../engine/core/commands';
import { createNewGame, type GameState } from '../engine/core/state';
import { createSave, loadSave } from '../engine/save/save';
import type { LatLon } from '../engine/systems/travel/geo';
import type { TravelTarget } from '../engine/systems/travel/travel';
import { readSave, writeSave } from './saveStorage';

export const content = loadContent();

// How long each leg's marker animation plays (D-010: cosmetic only, the leg is already resolved).
export const LEG_ANIMATION_MS = 600;

type Screen = 'title' | 'game';

interface GameStore {
  screen: Screen;
  game: GameState | null;
  hasSave: boolean;
  message: string | null;
  selection: TravelTarget | null;
  /** Path of the leg that just resolved, for the marker animation. */
  lastLegPath: LatLon[] | null;
  stopRequested: boolean;
  checkForSave: () => Promise<void>;
  newGame: () => void;
  saveGame: () => Promise<void>;
  loadGame: () => Promise<void>;
  quitToTitle: () => void;
  select: (target: TravelTarget | null) => void;
  travel: () => Promise<void>;
  requestStop: () => void;
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function describe(events: GameEvent[]): string | null {
  const found = events.flatMap((e) => (e.type === 'site_discovered' ? [content.sites[e.siteId]?.name ?? e.siteId] : []));
  return found.length ? `Discovered: ${found.join(', ')}` : null;
}

export const useGameStore = create<GameStore>((set, get) => {
  /** Applies a command; on rejection shows why and returns false. */
  const dispatch = (command: Command): boolean => {
    const { game } = get();
    if (!game) return false;
    const result = applyCommand(game, command, content);
    if (!result.ok) {
      set({ message: result.error.message });
      return false;
    }
    const note = describe(result.events);
    set({ game: result.state, ...(note ? { message: note } : {}) });
    return true;
  };

  // Each trip loop gets an id; quitting or loading bumps it so a sleeping old loop can't advance the new game.
  let currentRun = 0;

  /** Resolves legs one at a time with a short animation between them, until arrival or a stop. */
  const runLegs = async () => {
    const run = ++currentRun;
    while (run === currentRun && get().game?.travel) {
      if (get().stopRequested) {
        dispatch({ type: 'travel.stop' });
        break;
      }
      const travel = get().game!.travel!;
      const path = travel.legs[travel.nextLeg]!.path;
      if (!dispatch({ type: 'travel.advance' })) break;
      set({ lastLegPath: path });
      await sleep(LEG_ANIMATION_MS);
    }
    if (run === currentRun) set({ stopRequested: false });
  };

  return {
    screen: 'title',
    game: null,
    hasSave: false,
    message: null,
    selection: null,
    lastLegPath: null,
    stopRequested: false,

    checkForSave: async () => {
      try {
        set({ hasSave: (await readSave()) !== undefined });
      } catch (err) {
        set({ hasSave: false, message: `Saves unavailable: ${errorText(err)}` });
      }
    },

    newGame: () => {
      const [seed = 0] = crypto.getRandomValues(new Uint32Array(1));
      set({ screen: 'game', game: createNewGame(content, seed), message: null, selection: null, lastLegPath: null });
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
        const result = loadSave(await readSave(), content);
        if (!result.ok) return set({ message: `Could not load: ${result.error}` });
        set({ screen: 'game', game: result.save.gameState, message: null, selection: null, lastLegPath: null, stopRequested: false });
        // A save made between legs resumes the trip.
        if (result.save.gameState.travel) void runLegs();
      } catch (err) {
        set({ message: `Could not load: ${errorText(err)}` });
      }
    },

    quitToTitle: () => {
      currentRun += 1;
      set({ screen: 'title', game: null, message: null, selection: null, lastLegPath: null, stopRequested: false });
    },

    select: (target) => set({ selection: target, message: null }),

    travel: async () => {
      const { selection } = get();
      if (!selection || !dispatch({ type: 'travel.start', target: selection })) return;
      set({ selection: null, stopRequested: false });
      await runLegs();
    },

    requestStop: () => set({ stopRequested: true }),
  };
});
