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

## Game state (save version 5)

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
  survival: {                             // D-023, D-035; meters 0–100, kept unrounded
    health, food, water, rest,
    injured: boolean,                     // blocks Health recovery until cured (D-039)
    illUntil: number | null,              // end of the unsafe-water illness (D-027)
    radiation: number,                    // lowers maximum Health one for one (D-043)
    zoneMinutes: number,                  // time in the zone not yet rolled for
  },
  inventory: {
    stacks: { itemId, count, charge?, spoilsAt? }[],  // charge: lighter/torch; spoilsAt: game minute (D-028)
    weapon: string | null,                // the one weapon slot (D-036)
  },
  sites: { [siteId | buildingId]: { richness, refreshAt } },  // search depletion; missing = untouched (D-047)
  ground: { lat, lon, itemId, count, charge?, spoilsAt?, expiresAt }[],  // finds and drops, 96 h (D-045)
  town: null | { siteId, at: 'edge' | buildingId | waterPointId | null },  // inside a town map (D-049); null at = stopped between spots
  dead: boolean,                          // permadeath: every command is refused (D-038)
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
| `rest { minutes \| 'until_rested' }` | Sleeps; the clock jumps (D-035). | `travel_in_progress`, `bad_duration` (not 1 min–24 h), `already_rested` |
| `item.use { index }` | Eat, drink, apply or crank: meters, cure, illness roll, leftover (empty bottle), recharge. | `bad_item`, `cannot_use` (ingredients, materials), `injured` (painkiller before the injury is treated), `nothing_to_recharge` |
| `item.drop { index, count }` | Puts part or all of a stack on the ground where he stands, for 96 h. | `bad_item` |
| `item.equip { index }` / `item.unequip` | One weapon slot; the old weapon goes back to the pack. | `bad_item`, `not_a_weapon`, `no_weapon` |

| `scavenge.search { torch }` | Searches the site, or in a town the building he stands at (its type's time, stock loss and table); 5% battery with the torch; finds go on the ground. | `travel_in_progress`, `not_at_site`, `nothing_to_search` (home, a town's own point), `no_torch_charge` |
| `scavenge.hunt` | One hour of hunting in the forest; finds go on the ground. | `travel_in_progress`, `cannot_hunt_here` |
| `water.fill` | Fills every empty bottle: clean at a river or well, unsafe elsewhere; 5 min each. In a town only its wells and tank count. | `travel_in_progress`, `no_water`, `no_empty_bottles` |
| `water.drink` | Water to 100 in 10 min; still water may make him ill. | `travel_in_progress`, `no_water` |
| `ground.take { indexes }` | Takes piles from the ground here into the pack, all or nothing. | `bad_item` (not here), `too_heavy` |
| `town.enter` | At a town's point: opens its town map at the edge. No time. | `travel_in_progress`, `in_town`, `no_town_here` |
| `town.walk { spotId }` | Walks straight to a building, water point or the edge at road speed, in legs of up to 30 min; stops part-way after a leg where a meter fell low. | `not_in_town`, `unknown_spot`, `already_there` |
| `town.leave` | Back to the world map at the town's point. No time. | `not_in_town` |

Every command is refused with `dead` once Prabu has died.

Events: `travel_started`, `leg_completed {leg, of}`, `site_discovered {siteId}`, `arrived {siteId|null}`, `travel_stopped {reason: player|meter}`, `rested {minutes}`, `meter_low {meter, empty}`, `fell_ill`, `recovered`, `injury_cured`, `item_used {itemId}`, `item_spoiled {itemId, count}`, `died {cause}`, `searched {finds, torch}`, `hunted {finds}`, `bottles_filled {count, clean}`, `drank {clean}`, `items_taken {count}`, `irradiated {amount}`, `town_entered {siteId}`, `town_left`, `walked {spotId}`. `travel.start` is refused with `in_town` inside a town.

- Handlers get a **copy** of the state (`structuredClone`), so a failure can't leave state half-changed. Exceptions become `internal_error` and never escape.

## Travel (D-009, D-010, D-018, D-019)

- **Routing:** Dijkstra over the road graph plus two virtual nodes, start and destination.
  - The start connects cross-country to its 8 nearest road nodes. The 8 road nodes nearest the destination connect to it the same way.
  - A direct cross-country edge from start to destination means the plan is never slower than walking straight.
  - Edge cost is minutes: road km at 4.5 km/h, cross-country km at 3 km/h (`world.json`).
- **Legs:** the route is cut into legs of at most `legMaxMinutes` (30, in `world.json`; D-035).
  - Leg minutes are whole numbers that add up to the rounded total.
  - A sub-minute tail is folded into the leg before it.
- **Survival:** each leg passes its minutes through `passTime` (see Survival).
- **Fog and discovery:** after each leg, the leg's path is sampled every 1 km.
  - Each sample becomes a revealed point, deduplicated to one per 0.01° (~1.1 km) cell.
  - Any undiscovered site within `sightRadiusKm` (3) of a sample is discovered.
- **The UI loop** (`gameStore.runLegs`): dispatch `travel.advance`, animate the marker along that leg for 600 ms, then repeat. "Stop after this leg" sets a flag that the loop turns into `travel.stop`.
  - Each loop run has an id, so quitting or loading mid-trip can't leave a stale loop advancing the wrong game.
  - Loading a save made between legs resumes the trip.

## Survival (D-023, D-027, D-028, D-035, D-036, D-039)

- `passTime(state, minutes, activity)` in `systems/survival` is the only way game time moves forward. Travel legs, resting and the hand-crank charger all call it.
- It steps one minute at a time, so thresholds are exact: Rest reaching 0 doubles Food and Water drain from that minute; each empty Food or Water meter takes 5 Health an hour; Prabu dies the minute Health reaches 0.
- `activity` is `travel`, `sleep` or `work`. Only `travel` pays the overload cost (×1 at 25 kg rising to ×2 at 50 kg); only `sleep` restores Rest and heals (+2/h, if Food and Water are above 25 and he isn't injured).
- After the time passes it reports meters that fell to 25 or 0 (`meter_low`) and removes spoiled food.
- A travel leg that produces `meter_low` ends the trip (D-035), unless it was the last leg.
- All numbers live in `src/content/data/survival.json`.

## Inventory (D-026, D-036, D-037)

- Items are data (`items.json`): category, weight, effects, `curesInjury`, `illnessChance`, `leaves`, `spoilsAfterMinutes`, `weapon`, `charge`, `recharges`.
- Stacks merge when item, charge and spoil time match, so two raw meats from different days stay apart.
- `addItems` refuses anything that would take the load past 50 kg. Nothing calls it from the UI yet: scavenging (M4) and crafting (M5) will.
- Unsafe water rolls the seeded RNG, so the same save always gets the same outcome.

## Scavenging, water and radiation (D-043 to D-047)

- `systems/scavenging`: search, hunt, fill, drink, take, and `leaveOnGround` (used by search, hunt and drop).
  - A search makes two draws; each walks the site's table and takes the first entry whose chance × richness hits. Richness drops 10 points a search (floor 10%) and resets 7 days after the first search.
  - Finds go on the ground with a 96-hour expiry; `passTime` removes expired or spoiled piles.
  - `waterAt(p)` checks the water data (bounding boxes first, then point-in-polygon or distance to edge or river line within 200 m). Rivers win over still water.
- `systems/survival/radiation`: `inRadiationZone` is distance to the Trichy–Villupuram segment ≤ 30 km. `passTime` adds the minutes spent inside (a travel leg passes the share of its path inside) to `zoneMinutes`; each full hour rolls 1 in 4 for +5 radiation. Health is capped at `100 − radiation`; at 100 radiation he dies.
- `systems/town` (D-049, D-052): `townSpots` (edge, buildings, water points), `spotHere`, `walkMinutes`, and the three town commands. A building's search uses its type from `building-types.json` and keeps its own stock in `state.sites` under the building id. Floor piles use the building's coordinates; spots are at least 100 m apart (checked at load), so piles never mix.
- `waterHere(state)`: in a town, only the water point he stands at (well clean, tank unsafe); elsewhere `waterAt` on the world data, where mapped wells count as clean (D-050).
- Content: `loot.json` (per site: `search` and `hunt` tables; towns have none), `scavenging.json` (times, torch, depletion, refresh, ground hours, water range, bottle and torch item ids, radiation zone), `water.json` (generated, with wells), `building-types.json`, `towns.json` (buildings and water points at real coordinates), `town-streets.json` (generated, drawn only).

## Map rendering

- **Town map** (`src/map/TownMap.tsx`, D-052): an SVG plan in metres around the town's point, not MapLibre. Streets, buildings (fading as their stock runs low), water points, the edge and Prabu. Wheel or +/− to zoom, drag to pan; the first view frames everything within 3 km of the edge. Labels show once zoomed in past 120 px per km, and always for the selected spot and where he stands. Clicking a spot selects it; clicking it again walks there; clicking where he stands opens the Here panel.

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

4. Water and wells: run `scripts/geo/water.overpassql` on the Overpass API, then `node scripts/geo/build-water.mjs <osm-water.json>`. It writes `src/content/data/water.json`: about 640 lakes, tanks, ponds and reservoirs and about 100 flowing river lines (seasonal rivers and swimming pools left out; vertices thinned to 50 m) and the 39 mapped wells as points, 430 KB.
5. Town streets: run `scripts/geo/town-streets.overpassql`, then `node scripts/geo/build-town-streets.mjs <osm-streets.json>`. It writes `src/content/data/town-streets.json`: streets clipped to each town's box (Madurai keeps main roads only, since its map reaches the airport), about 200 KB. Town buildings in `towns.json` are hand-placed; see `docs/towns.md`.

Raw downloads are not committed.

## Content

- `src/content/data/*.json` is validated by Zod at startup (`loadContent()`). Bad content throws a readable error.
- Files:
  - `characters.json`: Prabu.
  - `sites.json`: 8 sites, with kind, coordinates and `knownAtStart`.
  - `world.json`: speeds, sight radius, leg length.
  - `new-game.json`: starting character, site, time, weapon and kit (D-026).
  - `items.json`: the 32 items (D-026, D-037).
  - `survival.json`: every survival and carry number (D-035, D-036, D-027).
  - `roads.json` and `tamil-nadu.json`: generated.
- Cross-references are checked: the starting character and site must exist, road edges must point at real nodes, item `leaves` and `recharges` must point at real items (the recharged one must have a charge), and the starting weapon must be a weapon.
- IDs are namespaced slugs: `character.prabu`, `loc.home`, …

## Saves

```ts
SaveFile = { saveVersion: 5, createdAt: ISO string, gameState }
```

- `loadSave(unknown, content)`:
  - Runs migrations from the save's version up to the current one (they receive the content).
  - Validates the result.
  - Rejects saves that point at characters, sites or items this build doesn't have.
  - Never throws.
- Migrations:
  - **1 → 2** (M0 → M1): adds position (start site), map (known places plus the start reveal) and `travel: null`, and moves the clock to count from 00:00.
  - **2 → 3** (M1 → M2/M3): adds full meters, the starting kit and `dead: false`.
  - **3 → 4** (M4): renames boiled water to clean water; adds radiation 0, `sites: {}` and `ground: []`.
  - **4 → 5** (town maps): adds `town: null` and drops the old town-wide stock of the three towns. Ground piles at a town's point stay at its edge.
  - Validation also rejects stock for unknown buildings and a `town` that points at an unknown town or spot.
- Storage: IndexedDB database `king-of-survival`, store `saves`, key `manual` (the name dates from M0; it now holds the one run).
- **Autosave and permadeath (D-038):** the store writes the save after every accepted command (so after every leg, rest and item action). Writes are queued so they land in order. When a command reports `died`, the save is deleted and the game over screen shows. "Save and quit" writes once more and returns to the title.

## Testing

| Layer | Tool | Where | Covers now |
|---|---|---|---|
| Engine and content | Vitest | `src/**/*.test.ts` (98 tests) | RNG; content validation and cross-references; new game (start time, position, known places); geo (distance, Tamil Nadu boundary, sampling); routing (legs ≤ 60 min and joined end to end, uses roads, never slower than straight, no-roads fallback, deterministic); travel commands (leg by leg, clock, arrival, discovery, fog dedupe, stop, every rejection leaves state unchanged, unmarked ground); saves (round-trip including mid-trip, v1 → v2 → v3 migrations, rejection of bad saves including unknown items and out-of-range meters); survival (drain rates, exhaustion, overload on the road only, empty meters, death, warnings, illness, spoilage, rest and healing, no healing while injured or hungry, rest rejections, 30-minute legs, trips stopping on a low meter, death on the road); inventory (starting kit, stacking, 50 kg limit, load multiplier, eating, drinking and the bottle, unsafe-water illness rate and reproducibility, injury cure, painkillers refused while injured, charger and lighter fuel, bad uses, equip swap, drop); scavenging (search finds from the table onto the ground, reproducible, depletion and 7-day refresh, torch time and battery, refusals; hunting; take and leave, 96-hour expiry, only what's here, all-or-nothing weight; water at the dam, none at home, rivers; filling clean and unsafe; drinking and illness; radiation zone shape, hourly rolls, part-hours, healing capped, death; mapped wells clean); towns (enter, leave, refusals, no world travel inside, walk time and landing, stopping part-way on a low meter, building search uses its type's time, table and own stock, house depletion and torch time, nothing to search at the edge or water, floor piles stay per building, well clean and tank unsafe, data spacing, save round-trip and v4 → v5 migration). |
| End to end | Playwright | `tests/e2e/` | New game → travel to town → meters drained → reload → Continue restores identical state (autosave) → Save and quit → Continue. Unmarked ground panel. Double-click travel. Pack shows the starting kit; unequip and equip; Rest 4 hours moves the clock and drains Water. Resting until death → game over → Continue disabled after reload. Resting after a trip leaves the marker still. Search the town until something turns up → Take all → pack heavier → drop the torch → it's on the ground → take it back. |

## Build, CI and deploy

- `vite.config.ts` uses `base: './'`.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, e2e and build on `main`, `dev` and PRs, and deploys `main` to GitHub Pages: https://onizukatp.github.io/the-king-of-survival/
- Bundle: ~525 KB gzipped JS, mostly MapLibre and the road graph.
- Git branching rules are in CLAUDE.md §10 "Git workflow".
