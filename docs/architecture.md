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
| `src/engine/systems/night/night.ts` | Night, the moon and dark minutes; `lightTheWay` switches the torch on for dark movement (D-060). |
| `src/engine/systems/conditions/conditions.ts` | Conditions (D-061): add, end, expire, and their combined effects (speed, Rest drain, max Health, Health per hour, search time, healing). |
| `src/engine/systems/events/events.ts` | Events (D-059): `maybeEvent` rolls after a leg, a town walk, a search or an hour of outdoor rest at night; `chooseEvent`, `closeEvent`, `choiceMissing`. |
| `src/engine/systems/combat/` | Four-rank combat (D-069): `combat.ts` (start, initiative, turn loop, actions, flee, end), `formation.ts`, `abilities.ts`, `resolve.ts` (damage, Death's Door, Deathblow, death, remains), `statuses.ts`, `ai.ts`, `fighters.ts`, `stats.ts` (`playerStats`, `weaponProfile`). See `docs/combat.md`. |
| `src/engine/systems/debug/debug.ts` | Testing tools (D-068): `debug.event`, `debug.fight`, `debug.night`. |
| `src/engine/systems/progression/progression.ts` | XP, levels and journal notes (D-076): `progress` reads each accepted command's events; `levelGains`, `nextLevel`, `finishIntro`. |
| `src/engine/save/save.ts` | Save format, version, migrations, `createSave`, `loadSave`. |
| `src/content/schemas/` | Zod schemas for every content file. |
| `src/content/data/` | All game content as JSON. **The only place content may live.** |
| `src/content/loader.ts` | Validates content and cross-references at startup. |
| `src/map/MapView.tsx` | MapLibre map, fog overlay, site and Prabu markers, route line. |
| `src/assets/` | Asset ID → file path; unknown IDs fall back to the placeholder. |
| `src/store/gameStore.ts` | Zustand store: screen, game, selection, the travel loop, save/load. |
| `src/store/saveStorage.ts` | IndexedDB read/write (one manual slot). |
| `src/ui/screens/` | `TitleScreen`, `MapScreen` (top bar, map, panel; D-016). |
| `src/ui/panels/Panel.tsx` | Side panel / bottom sheet: selected place or trip under way (with the dark-trip warning). |
| `src/ui/screens/CombatScreen.tsx` | The four-rank battlefield: both formations, turn queue, acting character, abilities with target highlighting, other actions, log, result. Replaces the map. |
| `src/ui/components/StatsBlock.tsx` | Stats with resistances and the damage roll, in the Pack and on the combat screen. |
| `src/ui/components/EventCard.tsx` | The event dialog: choices (disabled with the reason), then the outcome and Continue. |
| `src/ui/format.ts` | Clock, duration and distance formatting, site-kind labels (UI strings stay out of the engine). |
| `scripts/geo/` | Overpass query and `build-geo.mjs`, which regenerate the map data. |
| `public/geo/rail.json` | Rail lines; display only. |
| `tests/e2e/` | Playwright smoke tests (run against the production build). |

## Game state (save version 13)

```ts
GameState = {
  rngState: number,                       // uint32 seed state for the RNG
  clockMinutes: number,                   // minutes since Day 1 00:00 (new game: 720 = 12:00, D-075)
  player: { characterId, position: {lat, lon} },
  map: {
    visitedSiteIds: string[],             // places he has been to (D-094: every place is known; a first visit gives XP)
  },
  travel: null | {                        // a trip under way; never saved mid-leg (D-010)
    destination, siteId | null,
    legs: { minutes, km, path: {lat, lon}[] }[],
    nextLeg: number,
    speeds?: { road, cross },             // km/h the legs were planned at: walking or the vehicle (P-021)
  },
  survival: {                             // D-023, D-035; meters 0–100, kept unrounded
    health, food, water, rest,
    injured: boolean,                     // blocks Health recovery until cured (D-039)
    illUntil: number | null,              // end of the unsafe-water illness (D-027)
    radiation: number,                    // lowers maximum Health one for one (D-043)
    zoneMinutes: number,                  // time in the zone not yet rolled for
    conditions: { id, until: number | null }[],  // D-061; null = until treated or slept off
  },
  inventory: {
    stacks: { itemId, count, charge?, spoilsAt? }[],  // charge: lighter/torch; spoilsAt: game minute (D-028)
    weapon: string | null,                // the one weapon slot (D-036)
    charms: string[],                     // worn charms, weightless (D-086); slots in charms.json
  },
  sites: { [siteId | buildingId]: { richness, refreshAt } },  // search depletion; missing = untouched (D-047)
  ground: { lat, lon, itemId, count, charge?, spoilsAt?, expiresAt }[],  // finds and drops, 96 h (D-045)
  town: null | { siteId, at: 'edge' | buildingId | waterPointId | endId | null },  // inside a town map (D-049); null at = stopped between spots
  fire: null | { lat, lon, outAt },  // the one fire burning, until game minute outAt (D-056)
  event: null | {                         // the event card on screen (D-059)
    id,
    result: null | { choiceId, outcome, found, left, lost, conditions, siteId },  // kept until closed, so a reload can't re-roll
  },
  lastEventAt: number | null,             // for the 2-hour cooldown
  combat: null | {                        // a fight under way (D-069); saved between turns
    combatants: { uid, side: 'player' | 'enemy', defId, protagonist, hp, rank: 1–4, size: 1–2,
                  statuses: { kind, amount?, stat?, rounds }[], deathsDoor, corpse }[],
    round, queue: string[], turnStarted,  // turns left this round; the first is acting
    defeated: string[], arrowsShot, log: { kind, actor?, target?, abilityId?, amount?, crit?, status?, survived?, itemId?, defId? }[],
    result: null | { outcome: 'won' | 'fled', found, left },
  },
  progression: { xp, level, crafted: string[], xpMultiplier },  // D-076; crafted = recipes made once (first-craft XP); xpMultiplier from the Test panel (D-092), 1 normally
  journal: { notes: { at, kind: 'discovered' | 'won' | 'level', siteId?, enemies?, level? }[] },  // last 30, worded by the UI
  vehicles: {                            // M10 (P-021)
    list: { uid, vehicleId, lat, lon, durability: number | null, fuel: number | null, cargo: Stack[] }[],  // parked at lat/lon unless ridden
    riding: string | null, seq: number,  // the uid in use; seq numbers new ones
  },
  introSeen: boolean,                     // the intro shows once per run (D-076)
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
| `town.leave` | Back to the world map, from the edge of town (to the town's point, D-053) or a north/south/east/west end (to that end, D-054). No time. | `not_in_town`, `not_at_edge` |
| `fire.make { method }` | Lights a fire where he stands with 1 firewood and a way from `fire.json` (lighter or matchbox: a charge; flint; rubbing sticks). Takes the method's time; the fire burns 2 h. An empty matchbox is thrown away. | `travel_in_progress`, `unknown_recipe`, `fire_burning`, `no_firewood`, `missing_item` |
| `fire.feed` | 1 firewood: the fire here burns 2 h longer. No time. | `no_fire`, `no_firewood` |
| `craft { recipeId }` | Makes one batch of a `recipes.json` recipe anywhere: inputs used, tool kept, the recipe's time passes. | `travel_in_progress`, `unknown_recipe`, `missing_item`, `too_heavy` |
| `event.choose { choiceId }` | Rolls the outcome of a choice on the open card and applies it (meters, injury, illness, conditions, items in or out, time, stopping the trip, revealing a place). | `no_event`, `bad_choice` (unknown or already decided), `missing_item` (the choice's need isn't met) |
| `combat.act { action, abilityId?, target?, index?, steps? }` | A player-side turn: `ability` (with a target uid for single-target ones), `move` (±1), `pass`, `use_item`, `flee`; then enemies act until the next player-side turn or the end. | `not_in_combat`, `bad_choice` (not his turn, fight over, unknown ability), `wrong_rank`, `out_of_reach` (no target in its ranks), `no_arrows`, `bad_target`, `cannot_use` |
| `debug.event { eventId }` / `debug.fight { enemies, ambush }` / `debug.night` | Testing tools (D-068), offered by the UI only with `?debug=1`: open any event, start any fight, jump to the next 22:00 without passing time. | `bad_choice` (unknown event), `bad_target` (no or unknown enemies) |
| `combat.close` | Closes a finished fight; a paused trip can go on. | `not_in_combat`, `bad_choice` |
| `intro.done` | The intro was read or skipped; it won't show again this run (D-076). | — |
| `event.close` | Closes the card after its outcome; a paused trip can go on. | `no_event`, `bad_choice` (nothing chosen yet) |
| `fire.cook { recipeId }` | Turns up to the recipe's batch of its input into its output over the fire here (cook meat, boil water, sterilize rags; a pot and a water bottle where needed). 30 min. | `unknown_recipe`, `no_fire`, `fire_too_low`, `missing_item` |

Every command is refused with `dead` once Prabu has died, every command except `event.choose` and `event.close` with `event_open` while an event card is open, and every command except `combat.act` and `combat.close` with `in_combat` during a fight. An event outcome with `fight` closes the card and starts the fight. `scavenge.hunt` rolls on the Hunting stat and can meet the boar; Luck scales search finds.

**Events during other commands (D-059):** `travel.advance` rolls after the leg (the trip stays under way; the store's travel loop stops until the card is closed); `town.walk` rolls once per walk and stops part-way only if the outcome stops him; `scavenge.search` rolls after the search; `rest` rolls each full hour at night outdoors (not at home, in a town or beside a fire) and stops there. An event with one unlabelled choice (bad footing) resolves at once. Event finds go into the pack, or onto the ground if too heavy. `travel.advance` and `town.walk` also use torch charge for dark minutes and are slowed by a sprained ankle; `scavenge.search` is slowed by Shaken.

Events: `travel_started`, `leg_completed {leg, of}`, `site_discovered {siteId}`, `arrived {siteId|null}`, `travel_stopped {reason: player|meter}`, `rested {minutes}`, `meter_low {meter, empty}`, `fell_ill`, `recovered`, `injury_cured`, `item_used {itemId}`, `item_spoiled {itemId, count}`, `died {cause}`, `searched {finds, torch}`, `hunted {finds}`, `bottles_filled {count, clean}`, `drank {clean}`, `items_taken {count}`, `irradiated {amount}`, `town_entered {siteId}`, `town_left`, `walked {spotId}`, `torch_flat`, `condition_added {conditionId}`, `condition_ended {conditionId}`, `condition_cured {conditionId}`, `event_started {eventId}`, `event_resolved {eventId, choiceId, outcome}`, `event_closed`. `travel_stopped` can also have reason `event`; `died` can have cause `injury`. `travel.start` is refused with `in_town` inside a town.

- Handlers get a **copy** of the state (`structuredClone`), so a failure can't leave state half-changed. Exceptions become `internal_error` and never escape.

## Travel (D-009, D-010, D-019, D-094)

- **Routing:** Dijkstra over the road graph plus two virtual nodes, start and destination.
  - The start connects cross-country to its 8 nearest road nodes. The 8 road nodes nearest the destination connect to it the same way.
  - A direct cross-country edge from start to destination means the plan is never slower than walking straight.
  - Edge cost is minutes: road km at 4.5 km/h, cross-country km at 3 km/h (`world.json`).
- **Legs:** the route is cut into legs of at most `legMaxMinutes` (30, in `world.json`; D-035).
  - Leg minutes are whole numbers that add up to the rounded total.
  - A sub-minute tail is folded into the leg before it.
- **Survival:** each leg passes its minutes through `passTime` (see Survival).
- **First visits (D-094):** the map is open, with no fog. After each leg, if Prabu stands at a place he hasn't been to, it joins `map.visitedSiteIds` and a `site_visited` event gives 15 XP and a journal note.
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
- `systems/crafting` (M5, D-058): `recipeStatus` (what's short, for the Craft panel) and the `craft` command. Recipes are data in `recipes.json`; the tool counts in the pack or the weapon slot. Inputs leave before the time passes and the output arrives after.
- `systems/fire` (D-056, P-016 approved as D-057): `fireMinutesLeft` (the fire within 50 m), `fireOptions` (what the Fire section shows, with the reason a recipe can't be done), and the three fire commands. Methods and recipes are data in `fire.json`. Inputs leave the pack before the time passes and outputs arrive after, so spoilage can't shift them. `item.use` refuses an item whose `needsItem` (the can opener for tinned food) isn't in the pack, with `needs_item`. Loot entries can carry a `charge` range (a matchbox is found with 3–10 matches).
- `systems/town` (D-049, D-052): `townSpots` (edge, buildings, water points), `spotHere`, `walkMinutes`, and the three town commands. A building's search uses its type from `building-types.json` and keeps its own stock in `state.sites` under the building id. Floor piles use the building's coordinates; spots are at least 100 m apart (checked at load), so piles never mix.
- `waterHere(state)`: in a town, only the water point he stands at (well clean, tank unsafe); elsewhere `waterAt` on the world data, where mapped wells count as clean (D-050).
- Content: `loot.json` (per site: `search` and `hunt` tables; towns have none), `scavenging.json` (times, torch, depletion, refresh, ground hours, water range, bottle and torch item ids, radiation zone), `water.json` (generated, with wells), `building-types.json`, `towns.json` (buildings, water points and the four ends at real coordinates), `town-streets.json` (generated, drawn only).

## Map rendering

- **Town map** (`src/map/TownMap.tsx`, D-052): an SVG plan in metres around the town's point, not MapLibre. Streets, buildings (fading as their stock runs low), water points, the edge and Prabu. Wheel or +/− to zoom, drag to pan; zooming out stops at the whole town and panning keeps the view over it (D-054); the first view frames everything within 3 km of the edge. Labels show once zoomed in past 120 px per km, and always for the selected spot and where he stands. Clicking a spot selects it; clicking it again walks there; clicking where he stands opens the Here panel.

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
SaveFile = { saveVersion: 10, createdAt: ISO string, gameState }
```

- `loadSave(unknown, content)`:
  - Runs migrations from the save's version up to the current one (they receive the content).
  - Validates the result.
  - Rejects saves that point at characters, sites or items this build doesn't have.
  - Never throws.
- Migrations:
  - **1 → 2** (M0 → M1): adds position (start site), map (known places plus the start reveal) and `travel: null`, and moves the clock to count from 00:00 by adding 360, the 06:00 start of that time (fixed, so it doesn't follow `new-game.json`).
  - **2 → 3** (M1 → M2/M3): adds full meters, the starting kit and `dead: false`.
  - **3 → 4** (M4): renames boiled water to clean water; adds radiation 0, `sites: {}` and `ground: []`.
  - **4 → 5** (town maps): adds `town: null` and drops the old town-wide stock of the three towns. Ground piles at a town's point stay at its edge.
  - **5 → 6** (fire): adds `fire: null`.
  - **8 → 9** (four-rank combat, D-069): an old band fight becomes a formation (Prabu rank 1, enemies nearest first, the dead counted as defeated, Prabu to act). Validation rejects unknown fighters.
  - **7 → 8** (combat): adds `combat: null`. Validation rejects unknown enemies.
  - **6 → 7** (events and conditions): adds `survival.conditions: []`, `event: null` and `lastEventAt: null`. Validation rejects unknown events and conditions.
  - **9 → 10** (progression, D-076): adds level 1, 0 XP, an empty journal and `introSeen: true` (the run began before the intro existed).
  - **10 → 11** (M10): no charms worn, no vehicles.
  - **11 → 12** (D-091, D-092): `xpMultiplier: 1`, and the level the run's XP reaches on the lower level table.
  - **12 → 13** (D-094): the fog points go; the places the run knew count as visited.
  - Validation also rejects stock for unknown buildings and a `town` that points at an unknown town or spot.
- Storage: IndexedDB database `king-of-survival`, store `saves`, key `manual` (the name dates from M0; it now holds the one run).
- **Autosave and permadeath (D-038):** the store writes the save after every accepted command (so after every leg, rest and item action). Writes are queued so they land in order. When a command reports `died`, the save is deleted and the game over screen shows. "Save and quit" writes once more and returns to the title.

## Testing

| Layer | Tool | Where | Covers now |
|---|---|---|---|
| Engine and content | Vitest | `src/**/*.test.ts` (235 tests) | RNG; content validation and cross-references; new game (start time, position, known places); geo (distance, Tamil Nadu boundary, sampling); routing (legs ≤ 60 min and joined end to end, uses roads, never slower than straight, no-roads fallback, deterministic); travel commands (leg by leg, clock, arrival, discovery, fog dedupe, stop, every rejection leaves state unchanged, unmarked ground); saves (round-trip including mid-trip, v1 → v2 → v3 migrations, rejection of bad saves including unknown items and out-of-range meters); survival (drain rates, exhaustion, overload on the road only, empty meters, death, warnings, illness, spoilage, rest and healing, no healing while injured or hungry, rest rejections, 30-minute legs, trips stopping on a low meter, death on the road); inventory (starting kit, stacking, 50 kg limit, load multiplier, eating, drinking and the bottle, unsafe-water illness rate and reproducibility, injury cure, painkillers refused while injured, charger and lighter fuel, bad uses, equip swap, drop); scavenging (search finds from the table onto the ground, reproducible, depletion and 7-day refresh, torch time and battery, refusals; hunting; take and leave, 96-hour expiry, only what's here, all-or-nothing weight; water at the dam, none at home, rivers; filling clean and unsafe; drinking and illness; radiation zone shape, hourly rolls, part-hours, healing capped, death; mapped wells clean); towns (enter, leave, refusals, no world travel inside, walk time and landing, stopping part-way on a low meter, building search uses its type's time, table and own stock, house depletion and torch time, nothing to search at the edge or water, floor piles stay per building, well clean and tank unsafe, data spacing, save round-trip and v4 → v5 migration, town ends); fire (each way's time and cost, the last match, refusals, feeding, the fire stays put, cooking batches, boiling needs a pot, sterilizing uses one bottle unsafe first, fire too low, the options list, save round-trip and v5 → v6); the can opener; crafting (each recipe, plain and turmeric paste, the knife equipped or missing, what's short, refusals, spoilage during a craft, porridge at a fire); night (night hours, full-moon nights, dark minutes, the torch on dark legs, by day and at full moon, running flat); events (rates per leg on road and cross-country and in the dark, cooldown, which events fit, a trip paused and resumed, refusals while a card is open, choice needs, bites, infection and Shaken at night, finds into the pack or onto the ground, revealing a place, bad footing resolving itself and stopping the trip, death by an outcome, the search event only in houses, rest events outdoors at night but not at home or by a fire, save round-trip with a card open, no re-roll after reload, v6 → v7); conditions (sprained ankle speed and expiry, timer restart, Weak max Health, infected wound drain, no healing, the right dressing cures it, death from a wound, Restless drain and the 4-hour sleep, Shaken search time and rest at home, Well rested at home only); four-rank combat (formation: four ranks, empty ranks, moving, push, pull, shuffle, a two-rank enemy hit once, remains holding ranks and being cleared, newcomers; abilities: usable ranks, target ranks, ally and enemy targets, multi-target, self-move, invalid use; turns: SPD + 1–8, ties, one action a turn, stun and stun guard, two turns a round, extra turns, new rounds; damage: hit odds, dodge, crits, DEF, Weak; statuses: resistance rolls, bleed and blight stacking and expiring, buffs and debuffs, a status defined only in data; Death's Door: reaching it, penalties, Deathblow checks on blows and bleeds, death, healing out of it, 1 Health after a win; AI: valid choices, stepping towards its ranks, targeting rules, fights always ending; flee odds, loot and arrows, crit injuries; saves mid-fight and v8 → v9; a full fight with mixed enemies); hunting and luck (40% and 55% success, hide on 75% of successes, Luck on hunting, fleeing and crits, the boar on about 1 hunt in 10); testing tools (any event, the ambush straight into a fight, any fight, ambush first round, empty fight refused, night jump without drain, refused while a card is open); progression (XP from discovery, searches with finds, successful hunts, first crafts, event outcomes and won fights, none for fleeing or the dead; level thresholds, several at once, the level 10 cap; gains in his stats; the last 30 notes; the intro once; v9 → v10); charms (wear, slots, no doubles, take off, stats, carry, Rest drain, Shaken time, every multiplier, faster searches); vehicles (speeds, wear and fuel by the km, breaking and running dry stop a trip, effort drain, the bullock cart never wears, getting on and off, cargo load/unload and capacity, ground into the cargo, cargo spoilage, repairs from pack and cargo with refusals, refuelling, the cycle trailer, finds once per kind, v10 → v11); the bow raider's fallback punch; the XP multiplier and v11 → v12 with the level catch-up. |
| Playtest (M9) | Vitest, own config | `tests/playtest/` (`npm run playtest`, not part of `npm test`) | A scripted careful player (`bot.ts`) plays whole runs through `applyCommand` and reports survival, causes of death, levels, fights and hunts; `fights.sim.ts` plays every event fight 200 times per weapon and level; `trace.sim.ts` prints one run command by command (`SEED=n`). Results in `docs/playtest.md`. |
| End to end | Playwright | `tests/e2e/` | New game → travel to town → meters drained → reload → Continue restores identical state (autosave) → Save and quit → Continue. Unmarked ground panel. Double-click travel. Pack shows the starting kit; unequip and equip; Rest 4 hours moves the clock and drains Water. Resting until death → game over → Continue disabled after reload. Resting after a trip leaves the marker still. Search the town until something turns up → Take all → pack heavier → drop the torch → it's on the ground → take it back. The Craft panel lists the recipes and blocks what is missing. An event card (wild dogs at night, written into the save) must be answered: the meat choice is disabled with its reason, backing away shows the outcome and Shaken, Continue closes it and the Shaken tag shows. A fight from the Wild dogs card: Stab a highlighted target (or pass) until they are dead, take the meat, back to the map. A fight against a dog and two raiders from the Test panel: Stab highlights only ranks 1–2, the bow raider in rank 3 can't be picked, and the fight plays to its end. The Test button is hidden without `?debug=1`; with it, it opens the Snake card and starts an ambush shown on the four-rank battlefield. New games use `?seed=2`, which meets no random event on these trips. |

## Progression, intro and journal (D-070, D-076)

- **XP:** after every accepted command, `applyCommand` hands its events to `progress`, which adds XP: `site_discovered` 15, `searched` with finds 2, `hunted` with `success` 10, a recipe's first `crafted` 5, `event_resolved` the outcome's `xp`, and `combat_ended` won the `xp` of every enemy in `combat.defeated`. Every gain is multiplied by `progression.xpMultiplier` (D-092; 1 in a normal run) and rounded. It returns `xp_gained` and `level_up` events. Amounts live in `progression.json`, enemies and events.
- **Levels:** the table in `progression.json`; `levelGains(level)` sums the fixed gains, and `playerStats` adds them before the weapon's bonus, so they count in fights, hunts and searches. Level 10 is the top; XP still counts.
- **Journal:** notes for places found, fights won and levels gained, the last 30. The sister entry and the mother's wish are fixed texts in `story.json`.
- **Intro:** `story.json` holds the five screens and the first message. The UI shows the intro while `introSeen` is false; `intro.done` sets it.

## Vehicles and charms (M10: D-085, D-086, P-021, P-022)

- **Content:** `vehicles.json` holds each vehicle's speeds, cargo, effort, durability (wear a km, found-at range, repair per scrap metal), fuel (the auto) and where it is found; the cycle trailer is a `build` (two vehicles + items + tool + time). `charms.json` holds the slots and the find chances by rarity; each charm is an item with a `charm` profile (slot, rarity, stats, multipliers).
- **Riding:** `systems/vehicles/ridden.ts` gives the ridden vehicle, its speeds and whether it can move; it imports nothing heavy, so travel and survival can use it. Trips are planned at the vehicle's speeds (`planRoute(..., speeds)`) and remember them in `travel.speeds`, so `crossShare` stays right. Each leg wears the vehicle and burns fuel by its road and cross-country kilometres; at 0 durability or fuel the trip stops at the end of the leg (`travel_stopped` reason `vehicle`). Town walks use the vehicle's road speed and wear it as road.
- **Effort:** while moving, drain is multiplied by the vehicle's `effort` as well as the pack's load. A sprained ankle slows him on foot and on vehicles with effort above 1 (hand cart, cycle), not in the auto or the bullock cart.
- **Commands:** `vehicle.board`, `vehicle.leave` (parks it where he stands), `vehicle.repair` (scrap metal from the pack, then the cargo; the knife kept), `vehicle.refuel` (one can, no time), `vehicle.build`, `cargo.load`, `cargo.unload`, and `ground.take` with `toCargo`. Cargo actions are on the ridden vehicle; its food spoils as in the pack.
- **Finds:** each search makes one roll for a vehicle (kinds he doesn't own, found at that building type or site) and one for a charm (by rarity; the very rare tier only in Madurai), both scaled by the place's richness and Luck like the item draws. A vehicle is parked where it was found; a charm goes on the ground with the other finds.
- **Charms:** `charmEffects(inventory)` sums them. Stats join `playerStats`; the multipliers apply in `passTime` (Rest drain, free carry via `carryLimits`), `maybeEvent` (threat events, more so in the dark), searching (time), unsafe water (illness) and `addCondition` / rest (Restless and Shaken).

## Build, CI and deploy

- `vite.config.ts` uses `base: './'`.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, e2e and build on `main`, `dev` and PRs, and deploys `main` to GitHub Pages: https://onizukatp.github.io/the-king-of-survival/
- Bundle: ~525 KB gzipped JS, mostly MapLibre and the road graph.
- Git branching rules are in CLAUDE.md §10 "Git workflow".
