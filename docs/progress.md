# Progress

## Completed
- **M0 Skeleton** — live at https://onizukatp.github.io/the-king-of-survival/. Contents: Vite + React + TS strict, engine core (`GameState` via Zod schema, `applyCommand` dispatcher with typed rejections, seeded mulberry32 RNG), content loader with Zod + cross-reference checks, asset manifest with placeholder fallback, IndexedDB save/load with versioned saves + migration chain, Title and skeleton Game screens, 13 unit tests, 1 Playwright smoke test, ESLint rules that block `Math.random`, `Date`, DOM and React inside `src/engine/`, GitHub Actions CI + Pages deploy.
  - Acceptance verified on the live site: New Game → Save → reload → Continue restores identical state; CI passes lint, typecheck, unit and e2e tests.
- **M1 World map** — released to `main` and live at the same URL.
  - Tamil Nadu map (MapLibre, Natural Earth outline, OSM roads and rail), the 8 sites, fog with a 3 km sight radius, discovery, free travel by road and cross-country in legs of up to 60 min, clock, stop after this leg, save/load (save v2 with a migration from v1), desktop side panel and mobile bottom sheet.
  - Acceptance verified: travel between locations; time and discovery persist across save/load (e2e test); every visible control checked in the browser.

- **Double-click travel (D-022)** — live (released 2026-11-22).
- **M3 Items & inventory + M2 Survival** — built together, live (released 2026-11-22).
  - 32 items as data; starting kit (knife equipped, lighter 10/20, torch 50%); stacking; 25 kg free, 50 kg maximum, drain ×1 → ×2 on the road; eat, drink, apply, crank the charger, refill the lighter; one weapon slot; drop.
  - Health, Food, Water, Rest with the approved rates; exhaustion; empty meters hurt; death; unsafe-water illness; spoilage; injuries block healing until treated; Rest action; 30-minute legs that stop on a low meter.
  - Autosave after every action; permadeath deletes the save; Save and quit; save v3 with a migration from v2.
  - Acceptance: M3 (use, equip, drop work; carry limit enforced in the engine; invalid actions rejected with a message) and M2 (meters change predictably; penalties apply; death → game over) are covered by 69 unit tests and 5 e2e tests, and were checked in the browser on desktop and at phone width.

- **M4 Scavenging** — live (released 2026-11-22).
  - Search (1 h, or 45 min with the torch for 5%), Hunt (1 h) in the forest, per-site loot tables, depletion and 7-day refresh, take-or-leave with 96-hour ground piles (drops too).
  - Water from OpenStreetMap: fill bottles and drink at any lake, tank, pond, reservoir or river; clean only from flowing rivers. "Boiled water" is now "clean water".
  - Radiation zone 30 km around the Trichy–Villupuram line, drawn in yellow with an icon; 1-in-4 per hour inside for +5 radiation, lowering maximum Health.
  - Save v4 with a migration from v3. Acceptance: loot varies by place, places deplete, seeded tests reproducible; 86 unit tests and 7 e2e tests pass; checked in the browser on desktop and phone width.
  - Fixed while building: Prabu's marker was hidden under the marker of the place he stood at, so it couldn't be clicked.

- **M4b Town maps** — live (released 2026-11-22, with M2–M4, D-051).
  - Srivilliputhur (13 buildings), Rajapalayam (16) and Madurai (24, with the airport), 16 building types each with its own search time, stock loss and loot table; real streets from OpenStreetMap; landmarks on their real spots.
  - Enter town, click a building to see it and again to walk there (straight line at road speed, legs of up to 30 min that stop on a low meter), search, floor piles per building, wells (clean) and a tank (unsafe) in each town, Leave town from the edge of town only (D-053).
  - The 39 mapped wells on the world map give clean water (D-050). Towns no longer have a town-wide search.
  - Save v5 with a migration from v4. 98 unit tests and 7 e2e tests pass; checked in the browser on desktop and at phone width.

- **Town ends, zoom lock, Pack sort and quick use (D-054, D-055)** — live (released 2026-11-22).
  - North, south, east and west ends in each town; leaving from one puts Prabu at that end on the world map.
  - The town map can't zoom out past the whole town.
  - Pack: sort by kind, name or weight; Eat / Drink / Use on each usable row; double-click a row to use it.
  - 100 unit tests and 7 e2e tests pass; checked in the browser on desktop and phone width.

- **Fire and cooking (D-056, D-057)** — live (released 2026-11-22).
  - Make a fire with the lighter, a matchbox, flint and steel or by rubbing two sticks; add firewood; cook raw meat, boil water, sterilize rags into sterilized bandages.
  - New items: matchbox, can opener, sterilized bandage. Tinned food needs a can opener.
  - Save v6 with a migration from v5. 112 unit tests and 7 e2e tests pass; checked in the browser on desktop and phone width, including loading a v5 save.

- **M5 Crafting (D-058)** — live (released 2026-11-22).
  - Craft panel (top-bar button): cloth bandage, neem paste, neem–turmeric paste, salted dried meat; millet porridge at a fire. New item: turmeric. Weapon recipes wait for M7.
  - Acceptance: recipes use their inputs and make their outputs; missing materials are blocked with the reason. 119 unit tests and 8 e2e tests pass; checked in the browser on desktop and phone width.

- **M6 Events, conditions and night (D-059 to D-061)** — live (released 2026-11-23).
  - Events roll on travel legs (5% road, 10% cross-country), searches (10%) and outdoor rest at night (5% an hour); ×2 in the dark without light; 2-hour cooldown. 12 events as data, an event card that must be answered, choices that need an item shown disabled with the reason, and the trip paused until Continue.
  - Conditions: sprained ankle, restless, weak, shaken, infected wound, well rested, as top-bar tags.
  - Night 18:30–06:00, full-moon nights, the torch switching on by itself on dark legs (10% an hour), a moon tag, and a warning when a trip runs into the dark without enough charge.
  - Save v7 with a migration from v6. 147 unit tests and 9 e2e tests pass; checked in the browser on desktop and phone width, including a reload with a card open.

- **M7 Combat (D-063 to D-066)** — live (released 2026-11-23).
  - Stats: ATK, DEF, SPD, crit rate, crit damage, ACC, Dodge, Hunting and Luck, from Prabu's base plus the weapon.
  - Fights:
    - The four weapons with damage and reach.
    - Wild dogs, the mutated boar, and raiders with a blade and with a bow.
    - Turn order by SPD plus a roll; Close, Mid and Far bands.
    - Attack, aim, close in, step back, use an item, flee.
  - Where fights come from: Fight choices on Wild dogs and Roadblock, and the new Mutated boar and Ambush in the dark events.
  - Hunting by the Hunting stat.
  - The spear, bow and arrow recipes.
  - The combat screen and the Stats block.
  - Save v8.
  - Checks: 164 unit tests and 10 e2e tests pass; checked in the browser on desktop and phone width, including a reload mid-fight.

- **Combat side view and testing tools (D-067, D-068)** — live (released 2026-11-23). Testing tools: add `?debug=1` to the address.
  - **Side view:** Prabu on the left facing the enemies on the right in Close, Mid and Far columns, with placeholder figures from the asset manifest.
  - **Test button:** shown only with `?debug=1`; it opens any event, starts an ambush or any fight, and jumps to 22:00.
  - **Checks:** 167 unit tests and 11 e2e tests pass; checked in the browser on desktop and phone width.

- **Four-rank tactical combat (D-069)** — live (released 2026-11-24). An old mid-fight save on the live site migrated and played on.
  - Replaces the band combat: formations of four ranks, position-dependent abilities from data (Prabu's own three plus two per weapon), initiative SPD + 1–8, resistances and a status engine (bleed, blight, stun with stun guard, mark, buffs, debuffs, push, pull, shuffle, cleanse).
  - Death's Door and Deathblow; remains; enemy AI from each enemy's data; the boar takes two ranks.
  - The four-rank battlefield screen with target highlighting.
  - Save v9 with a migration from v8 fights.
  - 188 unit tests and 12 e2e tests pass; checked in the browser on desktop and phone width, including Death's Door.
  - Starting values chosen by Claude are listed for review in `docs/combat.md`.

- **M8 Progression, intro and journal (D-070 to D-076, D-081)** — live (released 2026-11-25).
  - XP from fights won, successful hunts, discoveries, searches with finds, first crafts and some event outcomes; 10 levels with fixed stat gains that count in fights, hunts and searches.
  - The owner's intro (five screens, Skip and Next), once per run; a run now starts on Day 1 at 12:00.
  - The Journal: Level and XP, "Find my sister", the mother's wish, and the last 30 notes. Level and XP also show in the Pack.
  - Save v10 with a migration from v9 (level 1, intro marked seen).
  - 200 unit tests and 13 e2e tests pass; checked in the browser on desktop and phone width.
  - The sister entry's text is now the owner's (D-083).
- **Item tooltips** (owner; live, released 2026-11-25): hovering an item anywhere (Pack rows and weapon slot, ground piles, Craft inputs, tool and output, combat items and finds, event finds and losses) shows its name, what it does, weapon damage, bonuses and abilities, charge, what it needs, spoiling time and weight. Built only from the item data. Native browser tooltips, so they don't show on touch screens.
- **M10 Vehicles and charms** (D-085 to D-089) — live (released 2026-11-26):
  - Hand cart, cycle, cycle with trailer, auto-rickshaw and bullock cart with the approved speeds, cargo, effort, wear, repairs with scrap metal, the auto's biodiesel and the rarity table. The trailer is a Craft recipe.
  - The Vehicle button and panel, Get on in the Here panel, Load into cargo, parked vehicles on the map, "By" on trips.
  - 13 charms in seven slots in the Pack, with their effects in stats, drain, carry, events, searching, illness and conditions; found by rarity in houses, apartments, textile shops and places of worship.
  - New item: can of biodiesel (5 kg, 5 litres) in petrol bunks, garages, NH 744 and the station. The cycle and engine parts are dropped (D-085).
  - Save v11 with a migration from v10. 229 unit tests and 14 e2e tests pass; checked in the browser.
  - Testing tools (owner's request): the Test panel can give any item or every charm, park any vehicle, and set the ridden vehicle's durability and fuel.

- **Player panel and cargo loading** (owner, 2026-11-26; on `dev`): a Player tab with everything equipped and worn, his condition and every stat, and equipping from the pack or the vehicle; the weapon, charms and stats left the Pack. Load all and Load selected in the Vehicle panel. The top bar wraps when crowded. 233 unit tests and 14 e2e tests pass.
- **Test panel lists** (owner, 2026-11-26; on `dev`): every list in the Test panel is alphabetical, and charms have their own list (give one charm, or one of every charm).

## In progress
- **M9 (integration, balance, playtest)**, first pass on `dev` (2026-11-26), report in `docs/playtest.md`:
  - A playtest bot plays whole runs through the engine (100 runs × 30 days: 96 survive; deaths come from early fights), and a fight table runs every event fight 200 times per weapon and level.
  - A phone-width playtest of every screen.
  - Fixed: the combat log's "Someone" for cleared remains; repeated finds ("bamboo ×2"); a failed hunt's message; Prabu's dot on the town map now opens the Here panel (phone).
  - P-023 answered (D-090, 2026-11-27): the bow raider's Punch (a fallback in the enemy AI) and the cooking lines in tooltips are built; fights, the ambush and the bow stay.
  - D-091 to D-093 (2026-11-27): the lower level table (level 10 in about 20 days; runs under way catch up when they load, save v12), an XP multiplier in the Test panel, and the Wild dogs text stays.
  - The owner's playtest notes (2026-11-27): the map is open with first-visit XP (D-094, save v13); torch searches take half the time (D-095); filling a bottle takes 1 minute (D-096). Built and on `dev`.
  - D-098 (2026-11-27): the owner's weights, loot tables and six new foods are built. The playtest bot now survives 30 days in 99 of 100 careful runs, eating mostly town food (about 3 hunts a run instead of about 25).
  - D-099 (2026-11-27): towns are on the world map: buildings, wells and tanks shown from street level, reached by ordinary trips along the streets; the town screen is gone (save v14). Trips inside towns keep town-walk events only; the playtest bot survives 30 days in 98 of 100 runs.
  - D-100 (2026-11-27): fishing (spear 20%, rod 50%) and gathering moss at any water but wells, cooked fish, moss gauze and the fishing rod; each ~1 km of water keeps its own stock.
  - D-101 (2026-11-27): actions by terrain: a land-cover grid from OpenStreetMap (forest, scrub, farmland, villages, dry land) drawn on the map; search and hunt anywhere by the ground, roads and railways included; ~1 km stock squares. The playtest bot survives 30 days in 96 of 100 runs.
  - Flagged: only 1% of the area is mapped farmland, so most open ground counts as dry (the approved rule for unmapped land).
  - D-102 (2026-11-27): the map becomes generated detail on a real backbone, Tamil Nadu first. Design P-026 is partly answered (D-103: one fixed world, 90% of generated wells dry, counts, sizes, names, landmarks, land-cover mix; D-104: the owner's 72 backbone places); the tiers and four checks remain. It would replace the OpenStreetMap roads, water, town streets and land-cover grid. Nothing is built until the owner says so.

## Pending (unblocked)
- Nothing.

## Later (owner's notes)
- Oil as a vehicle repair tool (D-085).
- The bull's grain and water (D-085).
- Charm set bonuses (D-086).

## Blocked
- Nothing.

## Technical choices made in M10 (Claude's authority)
- Cargo, repair and refuel act on the vehicle he rides; a parked vehicle keeps its cargo until he gets on it.
- Refuelling takes no time (no number was approved).
- A found vehicle is parked where it was found; a found charm goes on the ground with the other finds.
- The vehicle and charm rolls are scaled by the place's stock and Luck, like item finds (as the approved drafts say), and roll only where something can be found, so other places' luck is unchanged.

## Technical choices made in M0 (Claude's authority)
- `GameState` type is derived from its Zod schema, so save validation and the type can't drift.
- `applyCommand` hands handlers a `structuredClone` of state and catches throws, so a failed command can never leave state half-changed.
- No command handlers exist yet; the first real commands arrive with the first approved gameplay system.
- Starting character comes from `src/content/data/new-game.json` (only Prabu's canon name and age; no stats invented).
- One manual save slot, placeholder until Q8 (now answered by D-038: autosave and permadeath, built with M2).
- Vite `base: './'` so GitHub Pages works under any repo name.
- JSON save export/import (§7) not built yet.

## Technical choices made in M1 (Claude's authority)
- Fog is a 2D canvas overlay inside MapLibre's canvas container, under the markers; revealed points are kept one per ~1 km cell.
- Routing: Dijkstra over the OSM road graph with cross-country links to the 8 nearest road nodes at each end, plus a direct cross-country option.
- Road data is thinned to 300 m vertex spacing (junctions kept): about 9k nodes, 345 KB.
- `preserveDrawingBuffer` is on, and MapLibre's worker URL is set explicitly for Vite.
- `applyCommand` now takes `content`, because travel needs the road graph and sites.
- Saves are checked against content on load (unknown character or site → rejected).
