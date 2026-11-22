# Progress

## Completed
- **M0 Skeleton** — live at https://onizukatp.github.io/the-king-of-survival/. Contents: Vite + React + TS strict, engine core (`GameState` via Zod schema, `applyCommand` dispatcher with typed rejections, seeded mulberry32 RNG), content loader with Zod + cross-reference checks, asset manifest with placeholder fallback, IndexedDB save/load with versioned saves + migration chain, Title and skeleton Game screens, 13 unit tests, 1 Playwright smoke test, ESLint rules that block `Math.random`, `Date`, DOM and React inside `src/engine/`, GitHub Actions CI + Pages deploy.
  - Acceptance verified on the live site: New Game → Save → reload → Continue restores identical state; CI passes lint, typecheck, unit and e2e tests.
- **M1 World map** — released to `main` and live at the same URL.
  - Tamil Nadu map (MapLibre, Natural Earth outline, OSM roads and rail), the 8 sites, fog with a 3 km sight radius, discovery, free travel by road and cross-country in legs of up to 60 min, clock, stop after this leg, save/load (save v2 with a migration from v1), desktop side panel and mobile bottom sheet.
  - Acceptance verified: travel between locations; time and discovery persist across save/load (e2e test); every visible control checked in the browser.

- **Double-click travel (D-022)** — on `dev`, not released.
- **M3 Items & inventory + M2 Survival** — built together on `dev`, not released.
  - 32 items as data; starting kit (knife equipped, lighter 10/20, torch 50%); stacking; 25 kg free, 50 kg maximum, drain ×1 → ×2 on the road; eat, drink, apply, crank the charger, refill the lighter; one weapon slot; drop.
  - Health, Food, Water, Rest with the approved rates; exhaustion; empty meters hurt; death; unsafe-water illness; spoilage; injuries block healing until treated; Rest action; 30-minute legs that stop on a low meter.
  - Autosave after every action; permadeath deletes the save; Save and quit; save v3 with a migration from v2.
  - Acceptance: M3 (use, equip, drop work; carry limit enforced in the engine; invalid actions rejected with a message) and M2 (meters change predictably; penalties apply; death → game over) are covered by 69 unit tests and 5 e2e tests, and were checked in the browser on desktop and at phone width.

- **M4 Scavenging** — built on `dev`, not released.
  - Search (1 h, or 45 min with the torch for 5%), Hunt (1 h) in the forest, per-site loot tables, depletion and 7-day refresh, take-or-leave with 96-hour ground piles (drops too).
  - Water from OpenStreetMap: fill bottles and drink at any lake, tank, pond, reservoir or river; clean only from flowing rivers. "Boiled water" is now "clean water".
  - Radiation zone 30 km around the Trichy–Villupuram line, drawn in yellow with an icon; 1-in-4 per hour inside for +5 radiation, lowering maximum Health.
  - Save v4 with a migration from v3. Acceptance: loot varies by place, places deplete, seeded tests reproducible; 86 unit tests and 7 e2e tests pass; checked in the browser on desktop and phone width.
  - Fixed while building: Prabu's marker was hidden under the marker of the place he stood at, so it couldn't be clicked.

- **M4b Town maps** — built on `dev`, not released (D-051: M2–M4b go out together).
  - Srivilliputhur (13 buildings), Rajapalayam (16) and Madurai (24, with the airport), 16 building types each with its own search time, stock loss and loot table; real streets from OpenStreetMap; landmarks on their real spots.
  - Enter town, click a building to see it and again to walk there (straight line at road speed, legs of up to 30 min that stop on a low meter), search, floor piles per building, wells (clean) and a tank (unsafe) in each town, Leave town.
  - The 39 mapped wells on the world map give clean water (D-050). Towns no longer have a town-wide search.
  - Save v5 with a migration from v4. 98 unit tests and 7 e2e tests pass; checked in the browser on desktop and at phone width.

## In progress
- Nothing.

## Pending (unblocked)
- Release M2–M4b together (D-051), on the owner's go-ahead.
- Night and moonlight — proposed in `docs/night.md` (P-015); built with M6.
- M5 Crafting — needs recipes proposed and approved.

## Blocked
- M10 Vehicles (needs vehicle numbers), M6, M7 (Q4, Q5), M8 (Q6, Q7), M9 — see CLAUDE.md §8.

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
