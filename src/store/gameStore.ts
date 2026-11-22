import { create } from 'zustand';
import { loadContent } from '../content/loader';
import { applyCommand, type Command, type DeathCause, type GameEvent } from '../engine/core/commands';
import { createNewGame, type GameState } from '../engine/core/state';
import { createSave, loadSave } from '../engine/save/save';
import type { LatLon } from '../engine/systems/travel/geo';
import type { TravelTarget } from '../engine/systems/travel/travel';
import { deleteSave, readSave, writeSave } from './saveStorage';

export const content = loadContent();

// How long each leg's marker animation plays (D-010: cosmetic only, the leg is already resolved).
export const LEG_ANIMATION_MS = 600;

type Screen = 'title' | 'game' | 'gameover';
/** What the side panel shows when no trip is under way (D-016 plus the approved Pack layout). */
export type PanelMode = 'pack' | 'rest' | 'here' | null;
/** Pack order: grouped by kind, or a flat list by name or heaviest first. Price joins with trading. */
export type PackSort = 'type' | 'name' | 'weight';

interface GameStore {
  screen: Screen;
  game: GameState | null;
  hasSave: boolean;
  message: string | null;
  selection: TravelTarget | null;
  /** The building or water point picked on a town map (P-014). */
  townSelection: string | null;
  panel: PanelMode;
  /** How the Pack lists items; kept while the panel is closed. */
  packSort: PackSort;
  setPackSort: (sort: PackSort) => void;
  death: { cause: DeathCause; clockMinutes: number } | null;
  /** Path of the leg that just resolved, for the marker animation. */
  lastLegPath: LatLon[] | null;
  stopRequested: boolean;
  checkForSave: () => Promise<void>;
  newGame: () => void;
  saveAndQuit: () => Promise<void>;
  loadGame: () => Promise<void>;
  quitToTitle: () => void;
  select: (target: TravelTarget | null) => void;
  selectSpot: (spotId: string | null) => void;
  walk: (spotId: string) => void;
  openPanel: (panel: PanelMode) => void;
  travel: () => Promise<void>;
  requestStop: () => void;
  /** Runs one command from the UI (rest, items); returns whether it was accepted. */
  act: (command: Command) => boolean;
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const itemName = (id: string) => content.items[id]?.name ?? id;
const METER_NAMES = { health: 'Health', food: 'Food', water: 'Water', rest: 'Rest' } as const;

function describe(events: GameEvent[]): string | null {
  const notes: string[] = [];
  const found = events.flatMap((e) => (e.type === 'site_discovered' ? [content.sites[e.siteId]?.name ?? e.siteId] : []));
  if (found.length) notes.push(`Discovered: ${found.join(', ')}.`);
  for (const e of events) {
    if (e.type === 'item_used') {
      const category = content.items[e.itemId]?.category;
      notes.push(`${category === 'food' ? 'Ate' : category === 'water' ? 'Drank' : 'Used'} ${itemName(e.itemId).toLowerCase()}.`);
    }
    if (e.type === 'rested') notes.push(`Rested ${Math.round((e.minutes / 60) * 10) / 10} h.`);
    if (e.type === 'fell_ill') notes.push('Prabu is ill from the unsafe water.');
    if (e.type === 'recovered') notes.push('Prabu has recovered from the illness.');
    if (e.type === 'injury_cured') notes.push('Injury treated.');
    if (e.type === 'item_spoiled') notes.push(`${itemName(e.itemId)} ×${e.count} spoiled.`);
    if (e.type === 'meter_low') notes.push(`${METER_NAMES[e.meter]} is ${e.empty ? 'empty' : 'low'}.`);
    if (e.type === 'travel_stopped' && e.reason === 'meter') notes.push('Trip stopped.');
    if (e.type === 'searched' || e.type === 'hunted') {
      const finds = e.finds.map((f) => `${itemName(f.itemId).toLowerCase()}${f.count > 1 ? ` ×${f.count}` : ''}`);
      notes.push(finds.length ? `Found: ${finds.join(', ')}. It's on the ground here.` : 'Found nothing.');
    }
    if (e.type === 'bottles_filled') notes.push(`Filled ${e.count} bottle${e.count > 1 ? 's' : ''} with ${e.clean ? 'clean' : 'unsafe'} water.`);
    if (e.type === 'drank') notes.push(e.clean ? 'Drank clean water.' : 'Drank unsafe water.');
    if (e.type === 'town_entered') notes.push(`Entered ${content.sites[e.siteId]?.name ?? 'the town'}.`);
    if (e.type === 'items_taken') notes.push('Taken.');
    if (e.type === 'irradiated') notes.push(`Radiation +${e.amount}.`);
    if (e.type === 'fire_lit') notes.push('Lit a fire.');
    if (e.type === 'fire_fed') notes.push('Added firewood.');
    if (e.type === 'cooked') {
      const to = content.fire.recipes.find((r) => r.id === e.recipeId)?.to;
      notes.push(`Made ${to ? itemName(to).toLowerCase() : 'it'}${e.count > 1 ? ` ×${e.count}` : ''}.`);
    }
  }
  return notes.length ? notes.join(' ') : null;
}

export const useGameStore = create<GameStore>((set, get) => {
  // Writes go one after another, so a slow write can't land after a newer one or after the death delete.
  let saving: Promise<void> = Promise.resolve();
  const queue = (op: () => Promise<void>) => {
    saving = saving.then(op).catch((err) => set({ message: `Save failed: ${errorText(err)}` }));
    return saving;
  };
  const autosave = (game: GameState) => queue(() => writeSave(createSave(game, new Date().toISOString())));

  // Each trip loop gets an id; quitting, loading or dying bumps it so a sleeping old loop can't advance the new game.
  let currentRun = 0;

  /** Applies a command; on rejection shows why and returns false. Autosaves every accepted change (D-038). */
  const dispatch = (command: Command): boolean => {
    const { game } = get();
    if (!game) return false;
    const result = applyCommand(game, command, content);
    if (!result.ok) {
      set({ message: result.error.message });
      return false;
    }
    const died = result.events.find((e) => e.type === 'died');
    if (died) {
      currentRun += 1;
      // Permadeath: the run is over and its save goes with it.
      void queue(deleteSave);
      set({
        game: result.state, screen: 'gameover', hasSave: false, selection: null, panel: null,
        death: { cause: died.cause, clockMinutes: result.state.clockMinutes },
      });
      return true;
    }
    const note = describe(result.events);
    // Clear the animation path: only the travel loop sets it, right after a leg. Left set, any later
    // command (rest, eat) would replay the old leg on the marker.
    set({ game: result.state, hasSave: true, lastLegPath: null, ...(note ? { message: note } : {}) });
    void autosave(result.state);
    return true;
  };

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

  const reset = { message: null, selection: null, townSelection: null, panel: null, lastLegPath: null, stopRequested: false, death: null };

  return {
    screen: 'title',
    game: null,
    hasSave: false,
    packSort: 'type',
    ...reset,

    checkForSave: async () => {
      try {
        set({ hasSave: (await readSave()) !== undefined });
      } catch (err) {
        set({ hasSave: false, message: `Saves unavailable: ${errorText(err)}` });
      }
    },

    newGame: () => {
      const [seed = 0] = crypto.getRandomValues(new Uint32Array(1));
      const game = createNewGame(content, seed);
      currentRun += 1;
      set({ screen: 'game', game, hasSave: true, ...reset });
      void autosave(game);
    },

    saveAndQuit: async () => {
      const { game } = get();
      if (game && !game.dead) await autosave(game);
      get().quitToTitle();
    },

    loadGame: async () => {
      try {
        const result = loadSave(await readSave(), content);
        if (!result.ok) return set({ message: `Could not load: ${result.error}` });
        set({ screen: 'game', game: result.save.gameState, ...reset });
        // A save made between legs resumes the trip.
        if (result.save.gameState.travel) void runLegs();
      } catch (err) {
        set({ message: `Could not load: ${errorText(err)}` });
      }
    },

    quitToTitle: () => {
      currentRun += 1;
      set({ screen: 'title', game: null, ...reset });
    },

    select: (target) => set({ selection: target, panel: null, message: null }),
    selectSpot: (spotId) => set({ townSelection: spotId, panel: null, message: null }),
    walk: (spotId) => {
      if (dispatch({ type: 'town.walk', spotId })) set({ townSelection: null, panel: null });
    },
    openPanel: (panel) => set({ panel, selection: null, townSelection: null }),
    setPackSort: (packSort) => set({ packSort }),

    travel: async () => {
      const { selection } = get();
      if (!selection || !dispatch({ type: 'travel.start', target: selection })) return;
      set({ selection: null, panel: null, stopRequested: false });
      await runLegs();
    },

    requestStop: () => set({ stopRequested: true }),
    act: dispatch,
  };
});
