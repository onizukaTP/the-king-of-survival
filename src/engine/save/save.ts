import { z } from 'zod';
import type { Content } from '../../content/loader';
import { gameStateSchema, startingInventory, startingSurvival, startPosition, type GameState } from '../core/state';
import { initialMap } from '../systems/travel/travel';

export const SAVE_VERSION = 15;

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
        // M0's clock counted from the 06:00 start of that time (D-020), so this stays 360 whatever new-game.json says now.
        clockMinutes: gs.clockMinutes + 360,
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
  // v5 → v6 (fire, D-056): no fire burning.
  5: (save) => ({ ...save, saveVersion: 6, gameState: { ...(save.gameState as object), fire: null } }),
  // v6 → v7 (events and conditions, D-059, D-061): no conditions, no event open, none yet.
  6: (save) => {
    const gs = save.gameState as { survival: object };
    return { ...save, saveVersion: 7, gameState: { ...gs, survival: { ...gs.survival, conditions: [] }, event: null, lastEventAt: null } };
  },
  // v7 → v8 (combat, M7): no fight under way.
  7: (save) => ({ ...save, saveVersion: 8, gameState: { ...(save.gameState as object), combat: null } }),
  // v8 → v9 (four-rank combat, D-069): a band fight under way becomes a formation. Prabu holds
  // rank 1; the enemies still standing line up nearest first (Close, Mid, Far), as many as four ranks
  // take; those already dead count as defeated for the loot. It is Prabu's turn.
  8: (save, content) => {
    type OldEnemy = { id: string; hp: number; band: 'close' | 'mid' | 'far' };
    type OldCombat = { enemies: OldEnemy[]; round: number; arrowsShot: number; result: unknown };
    const gs = save.gameState as { combat: OldCombat | null; survival: { health: number }; player: { characterId: string } };
    const old = gs.combat;
    if (!old) return { ...save, saveVersion: 9 };
    const order = { close: 0, mid: 1, far: 2 };
    const standing = old.enemies.filter((e) => e.hp > 0).sort((a, b) => order[a.band] - order[b.band]);
    const combatants: unknown[] = [{
      uid: 'p0', side: 'player', defId: gs.player.characterId, protagonist: true, hp: Math.round(gs.survival.health),
      rank: 1, size: 1, statuses: [], deathsDoor: false, corpse: false,
    }];
    let rank = 1;
    standing.forEach((e, i) => {
      const size = content.enemies[e.id]?.size ?? 1;
      if (rank + size - 1 > 4) return;
      combatants.push({ uid: `e${i}`, side: 'enemy', defId: e.id, protagonist: false, hp: e.hp, rank, size, statuses: [], deathsDoor: false, corpse: false });
      rank += size;
    });
    const combat = {
      combatants, round: old.round, queue: ['p0'], turnStarted: true,
      defeated: old.enemies.filter((e) => e.hp <= 0).map((e) => e.id), arrowsShot: old.arrowsShot, log: [], result: old.result,
    };
    return { ...save, saveVersion: 9, gameState: { ...gs, combat } };
  },
  // v9 → v10 (progression, D-076): a run under way starts at level 1 with no XP, an empty journal and
  // its intro counted as seen, since it began before there was one.
  9: (save) => ({
    ...save, saveVersion: 10,
    gameState: { ...(save.gameState as object), progression: { xp: 0, level: 1, crafted: [] }, journal: { notes: [] }, introSeen: true },
  }),
  // v10 → v11 (M10): no charms worn and no vehicles yet.
  10: (save) => {
    const gs = save.gameState as { inventory: object };
    return { ...save, saveVersion: 11, gameState: { ...gs, inventory: { ...gs.inventory, charms: [] }, vehicles: { list: [], riding: null, seq: 0 } } };
  },
  // v11 → v12: normal XP (the Test panel's multiplier), and the level a run's XP reaches on the
  // lower level table (D-091), so a run under way catches up at once.
  11: (save, content) => {
    const gs = save.gameState as { progression: { xp: number; level: number } };
    const reached = content.progression.levels.filter((l) => gs.progression.xp >= l.xp).reduce((n, l) => Math.max(n, l.level), 1);
    const level = Math.max(gs.progression.level, reached);
    return { ...save, saveVersion: 12, gameState: { ...gs, progression: { ...gs.progression, level, xpMultiplier: 1 } } };
  },
  // v12 → v13 (D-094, open map): no fog, every place known; the places he knew count as visited, so no
  // place he already had pays its first-visit XP again.
  12: (save) => {
    // (A v1 save migrated in the same load already has the new map from initialMap.)
    const gs = save.gameState as { map: { discoveredSiteIds?: string[]; visitedSiteIds?: string[] } };
    const visitedSiteIds = gs.map.visitedSiteIds ?? [...(gs.map.discoveredSiteIds ?? [])];
    return { ...save, saveVersion: 13, gameState: { ...gs, map: { visitedSiteIds } } };
  },
  // v13 → v14 (D-099, towns on the world map): no town screen. A run inside a town is already at its
  // spot's point (or where a walk stopped), so only the town state goes.
  13: (save) => {
    const { town: _town, ...gs } = save.gameState as { town?: unknown };
    void _town;
    return { ...save, saveVersion: 14, gameState: gs };
  },
  // v14 → v15 (M11, the generated map): the three towns' generic buildings are generated now, under new
  // ids; their old stock records are dropped. Landmarks, places and stock squares keep theirs.
  14: (save, content) => {
    const gs = save.gameState as { sites: Record<string, unknown> };
    const buildings = new Set(Object.values(content.towns).flatMap((t) => t.buildings.map((b) => b.id)));
    const sites = Object.fromEntries(Object.entries(gs.sites).filter(([id]) => content.sites[id] || buildings.has(id) || id.startsWith('cell.')));
    return { ...save, saveVersion: 15, gameState: { ...gs, sites } };
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
  if (gameState.map.visitedSiteIds.some((id) => !content.sites[id])) return { ok: false, error: 'Save refers to an unknown place.' };
  const { stacks, weapon } = gameState.inventory;
  const cargo = gameState.vehicles.list.flatMap((v) => v.cargo);
  const items = [...stacks, ...gameState.ground, ...cargo].map((st) => st.itemId).concat(weapon ? [weapon] : [], gameState.inventory.charms);
  if (gameState.vehicles.list.some((v) => !content.vehicles.byId[v.vehicleId])) return { ok: false, error: 'Save refers to an unknown vehicle.' };
  if (items.some((id) => !content.items[id])) return { ok: false, error: 'Save refers to an unknown item.' };
  const buildingIds = new Set(Object.values(content.towns).flatMap((t) => t.buildings.map((b) => b.id)));
  if (Object.keys(gameState.sites).some((id) => !content.sites[id] && !buildingIds.has(id) && !id.startsWith('cell.'))) return { ok: false, error: 'Save refers to an unknown place.' };
  if (gameState.event && !content.events.events.some((e) => e.id === gameState.event!.id)) return { ok: false, error: 'Save refers to an unknown event.' };
  if (gameState.survival.conditions.some((c) => !content.conditions[c.id])) return { ok: false, error: 'Save refers to an unknown condition.' };
  if (gameState.combat?.combatants.some((c) => (c.side === 'enemy' ? !content.enemies[c.defId] : !content.characters[c.defId]))) return { ok: false, error: 'Save refers to an unknown fighter.' };
  return { ok: true, save: parsed.data };
}
