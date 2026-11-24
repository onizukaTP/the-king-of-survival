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

- **Four-rank tactical combat (D-069)** — on `dev`, not released.
  - Replaces the band combat: formations of four ranks, position-dependent abilities from data (Prabu's own three plus two per weapon), initiative SPD + 1–8, resistances and a status engine (bleed, blight, stun with stun guard, mark, buffs, debuffs, push, pull, shuffle, cleanse).
  - Death's Door and Deathblow; remains; enemy AI from each enemy's data; the boar takes two ranks.
  - The four-rank battlefield screen with target highlighting.
  - Save v9 with a migration from v8 fights.
  - 188 unit tests and 12 e2e tests pass; checked in the browser on desktop and phone width, including Death's Door.
  - Starting values chosen by Claude are listed for review in `docs/combat.md`.

## In progress
- Nothing.

## Pending (unblocked)
- Charms (D-062): 1 talisman, 2 rings and 2 bangles that lower risks or raise yields. To be drafted for approval.

## Later (owner's notes)
- **Item tooltips** (owner, 2026-11-23): every item gets a tooltip saying what it does, for example how much Food, Water or Health it restores. Today that text shows only in the Pack's item card.

## Blocked
- M10 Vehicles (needs vehicle numbers), M8 (Q6, Q7), M9 — see CLAUDE.md §8.

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
