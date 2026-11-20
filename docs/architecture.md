# Architecture (as built)

How the code works today. CLAUDE.md §7 is the plan; this file describes what exists.
Update it whenever a milestone changes the structure.

**Current state:** M1, the world map: Tamil Nadu map, free travel in legs, fog and discovery.

## The big rule: engine ≠ UI

```
UI (React + MapLibre) ──store action──▶ store (Zustand) ──applyCommand(state, cmd, content)──▶ engine (pure TS)
        ▲                                     │                                                     │
        └────────────── renders state ◀───────┴──────────── new state + events ◀────────────────────┘
```

- `src/engine/` is pure TypeScript. ESLint **fails the build** if engine code uses `Math.random`, `Date`, `window`, `document`, `localStorage` or `indexedDB`, or imports React, Zustand, MapLibre, `ui/` or `store/`. See `eslint.config.js`.
- The UI never changes state itself. It may call read-only engine queries (`previewTravel`, `siteAt`) to show what an action *would* do.

## Folder map

| Path | What it does |
|---|---|
| `src/engine/core/state.ts` | `gameStateSchema` (Zod) and `GameState` (derived from it), plus `createNewGame(content, seed)`. |
| `src/engine/core/commands.ts` | `Command`, `GameEvent`, `CommandError` unions; `applyCommand(state, command, content)`. |
| `src/engine/core/rng.ts` | `nextRandom(rngState) → [value, nextState]`, a seeded mulberry32 (not used by gameplay yet). |
| `src/engine/systems/travel/geo.ts` | Haversine distance, interpolation, path sampling, point-in-Tamil-Nadu. |
| `src/engine/systems/travel/route.ts` | `planRoute(from, to, content)`: fastest road and cross-country route, cut into legs. |
| `src/engine/systems/travel/travel.ts` | Travel command handlers, `previewTravel`, fog and discovery, `initialMap`, `siteAt`. |
| `src/engine/save/save.ts` | Save format, version, migrations, `createSave`, `loadSave`. |
| `src/content/schemas/` | Zod schemas for every content file. |
| `src/content/data/` | All game content as JSON. **The only place content may live.** |
| `src/content/loader.ts` | Validates content and cross-references at startup. |
| `src/map/MapView.tsx` | MapLibre map, fog overlay, site and Prabu markers, route line. |
| `src/assets/` | Asset ID → file path; unknown IDs fall back to the placeholder. |
| `src/store/gameStore.ts` | Zustand store: screen, game, selection, the travel loop, save/load. |
| `src/store/saveStorage.ts` | IndexedDB read/write (one manual slot). |
| `src/ui/screens/` | `TitleScreen`, `MapScreen` (top bar, map, panel; D-016). |
| `src/ui/panels/Panel.tsx` | Side panel / bottom sheet: selected place or trip under way. |
| `src/ui/format.ts` | Clock, duration and distance formatting, site-kind labels (UI strings stay out of the engine). |
| `scripts/geo/` | Overpass query and `build-geo.mjs`, which regenerate the map data. |
| `public/geo/rail.json` | Rail lines; display only. |
| `tests/e2e/` | Playwright smoke tests (run against the production build). |

## Game state (save version 2)

```ts
GameState = {
  rngState: number,                       // uint32 seed state for the RNG
  clockMinutes: number,                   // minutes since Day 1 00:00 (new game: 360 = 06:00, D-020)
  player: { characterId, position: {lat, lon} },
  map: {
    discoveredSiteIds: string[],          // known at start (D-017) + discovered (D-018)
    revealed: {lat, lon}[],               // fog-free points, one per ~1 km cell
  },
  travel: null | {                        // a trip under way; never saved mid-leg (D-010)
    destination, siteId | null,
    legs: { minutes, km, path: {lat, lon}[] }[],
    nextLeg: number,
  },
}
```

- The Zod schema is the single source of truth. The TypeScript type is inferred from it.
- Changing the shape means: bump `SAVE_VERSION`, add a migration, and add a test that an old save still loads.

## Commands

```ts
applyCommand(state, command, content) →
  | { ok: true,  state, events }
  | { ok: false, error: { code, message } }
```

| Command | Does | Rejects with |
|---|---|---|
| `travel.start { target: {siteId} \| {point} }` | Plans the route and stores the legs. Nothing moves yet. | `travel_in_progress`, `unknown_site` (missing or undiscovered), `outside_world` (point outside Tamil Nadu), `already_there`, `no_route` |
| `travel.advance` | Resolves the next leg instantly: moves Prabu, adds the leg's minutes, clears fog, discovers sites; clears `travel` on arrival. | `not_travelling` |
| `travel.stop` | Drops the remaining legs; Prabu stays where the last leg ended. | `not_travelling` |

Events: `travel_started`, `leg_completed {leg, of}`, `site_discovered {siteId}`, `arrived {siteId|null}`, `travel_stopped`.

- Handlers get a **copy** of the state (`structuredClone`), so a failure can't leave state half-changed. Exceptions become `internal_error` and never escape.

## Travel (D-009, D-010, D-018, D-019)

- **Routing:** Dijkstra over the road graph plus two virtual nodes, start and destination.
  - The start connects cross-country to its 8 nearest road nodes. The 8 road nodes nearest the destination connect to it the same way.
  - A direct cross-country edge from start to destination means the plan is never slower than walking straight.
  - Edge cost is minutes: road km at 4.5 km/h, cross-country km at 3 km/h (`world.json`).
- **Legs:** the route is cut into legs of at most `legMaxMinutes` (60, in `world.json`).
  - Leg minutes are whole numbers that add up to the rounded total.
  - A sub-minute tail is folded into the leg before it.
- **Fog and discovery:** after each leg, the leg's path is sampled every 1 km.
  - Each sample becomes a revealed point, deduplicated to one per 0.01° (~1.1 km) cell.
  - Any undiscovered site within `sightRadiusKm` (3) of a sample is discovered.
- **The UI loop** (`gameStore.runLegs`): dispatch `travel.advance`, animate the marker along that leg for 600 ms, then repeat. "Stop after this leg" sets a flag that the loop turns into `travel.stop`.
  - Each loop run has an id, so quitting or loading mid-trip can't leave a stale loop advancing the wrong game.
  - Loading a save made between legs resumes the trip.

## Map rendering

- MapLibre GL with no tile server. The style is built in code from content:
  - Tamil Nadu fill and border, from `tamil-nadu.json`.
  - Roads, built from the graph edges.
  - Rail, from `public/geo/rail.json`.
  - The route line.
- Labels are HTML markers (site buttons with `aria-label`), so no glyph server is needed.
- **Fog** is a 2D canvas inside MapLibre's canvas container, between the map and the markers, so known places show through it.
  - It fills everything at 50% darkness, then cuts soft radial holes of the sight radius around each revealed point.
  - It is redrawn on every map move.
- MapLibre v6 needs its worker URL set explicitly under Vite (`?worker&url` import in `MapView.tsx`).
- `preserveDrawingBuffer` is on so the WebGL frame survives the fog canvas being composited on top.
- The attribution "© OpenStreetMap contributors · Natural Earth" is always shown (ODbL).

## Map data pipeline

1. Run `scripts/geo/roads.overpassql` on the Overpass API.
   - It fetches roads from motorway down to secondary, in a box covering the prototype area and the corridor to Madurai, plus tertiary roads near home.
   - It also fetches rail in the same box.
2. Download Natural Earth admin-1.
3. Run `node scripts/geo/build-geo.mjs <osm.json> <ne.geojson>`. It writes three files:
   - `src/content/data/roads.json`: the graph. Junctions and way ends are kept, other vertices thinned to 300 m spacing; about 9k nodes and 10k edges, 345 KB.
   - `public/geo/rail.json`.
   - `src/content/data/tamil-nadu.json`.

Raw downloads are not committed.

## Content

- `src/content/data/*.json` is validated by Zod at startup (`loadContent()`). Bad content throws a readable error.
- Files:
  - `characters.json`: Prabu.
  - `sites.json`: 8 sites, with kind, coordinates and `knownAtStart`.
  - `world.json`: speeds, sight radius, leg length.
  - `new-game.json`: starting character, starting site, start time.
  - `roads.json` and `tamil-nadu.json`: generated.
- Cross-references are checked: the starting character and site must exist, and road edges must point at real nodes.
- IDs are namespaced slugs: `character.prabu`, `loc.home`, …

## Saves

```ts
SaveFile = { saveVersion: 2, createdAt: ISO string, gameState }
```

- `loadSave(unknown, content)`:
  - Runs migrations from the save's version up to the current one (they receive the content).
  - Validates the result.
  - Rejects saves that point at characters or sites this build doesn't have.
  - Never throws.
- Migrations:
  - **1 → 2** (M0 → M1): adds position (start site), map (known places plus the start reveal) and `travel: null`, and moves the clock to count from 00:00.
- Storage: IndexedDB database `king-of-survival`, store `saves`, key `manual`. The game shows "Game saved." only after the transaction commits.

## Testing

| Layer | Tool | Where | Covers now |
|---|---|---|---|
| Engine and content | Vitest | `src/**/*.test.ts` (36 tests) | RNG; content validation and cross-references; new game (start time, position, known places); geo (distance, Tamil Nadu boundary, sampling); routing (legs ≤ 60 min and joined end to end, uses roads, never slower than straight, no-roads fallback, deterministic); travel commands (leg by leg, clock, arrival, discovery, fog dedupe, stop, every rejection leaves state unchanged, unmarked ground); saves (round-trip including mid-trip, v1 → v2 migration, rejection of bad saves). |
| End to end | Playwright | `tests/e2e/` | New game → known places shown, Madurai hidden → travel to town → arrives with clock advanced → save → reload → continue restores identical state. Clicking empty map → unmarked-ground panel → close. |

## Build, CI and deploy

- `vite.config.ts` uses `base: './'`.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, e2e and build on `main`, `dev` and PRs, and deploys `main` to GitHub Pages: https://onizukatp.github.io/the-king-of-survival/
- Bundle: ~525 KB gzipped JS, mostly MapLibre and the road graph.
- Git branching rules are in CLAUDE.md §10 "Git workflow".
