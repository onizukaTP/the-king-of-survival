# Progress

## Completed
- **M0 Skeleton** — live at https://onizukatp.github.io/the-king-of-survival/. Contents: Vite + React + TS strict, engine core (`GameState` via Zod schema, `applyCommand` dispatcher with typed rejections, seeded mulberry32 RNG), content loader with Zod + cross-reference checks, asset manifest with placeholder fallback, IndexedDB save/load with versioned saves + migration chain, Title and skeleton Game screens, 13 unit tests, 1 Playwright smoke test, ESLint rules that block `Math.random`, `Date`, DOM and React inside `src/engine/`, GitHub Actions CI + Pages deploy.
  - Acceptance verified on the live site: New Game → Save → reload → Continue restores identical state; CI passes lint, typecheck, unit and e2e tests.
- **M1 World map** — released to `main` and live at the same URL.
  - Tamil Nadu map (MapLibre, Natural Earth outline, OSM roads and rail), the 8 sites, fog with a 3 km sight radius, discovery, free travel by road and cross-country in legs of up to 60 min, clock, stop after this leg, save/load (save v2 with a migration from v1), desktop side panel and mobile bottom sheet.
  - Acceptance verified: travel between locations; time and discovery persist across save/load (e2e test); every visible control checked in the browser.

## In progress
- Nothing. Next work waits on owner decisions (below).

- **Double-click travel (D-022)** — on `dev`: clicking the selected place again or double-clicking a place or open ground starts the trip; e2e test added.

## Pending (unblocked)
- M3 Items & inventory — item list approved (D-026); needs the numbers (P-012) and the inventory screen layout approved.
- M2 Survival — design and numbers approved (D-023, D-035); best built right after M3, since food and water come from items.
- M5 Crafting — needs recipes proposed and approved.

## Blocked
- M10 Vehicles (needs vehicle numbers), M2's save-on-death behaviour (Q8), M4, M6, M7 (Q4, Q5), M8 (Q6, Q7), M9 — see CLAUDE.md §8.

## Technical choices made in M0 (Claude's authority)
- `GameState` type is derived from its Zod schema, so save validation and the type can't drift.
- `applyCommand` hands handlers a `structuredClone` of state and catches throws, so a failed command can never leave state half-changed.
- No command handlers exist yet; the first real commands arrive with the first approved gameplay system.
- Starting character comes from `src/content/data/new-game.json` (only Prabu's canon name and age; no stats invented).
- One manual save slot, placeholder until Q8.
- Vite `base: './'` so GitHub Pages works under any repo name.
- JSON save export/import (§7) not built yet.

## Technical choices made in M1 (Claude's authority)
- Fog is a 2D canvas overlay inside MapLibre's canvas container, under the markers; revealed points are kept one per ~1 km cell.
- Routing: Dijkstra over the OSM road graph with cross-country links to the 8 nearest road nodes at each end, plus a direct cross-country option.
- Road data is thinned to 300 m vertex spacing (junctions kept): about 9k nodes, 345 KB.
- `preserveDrawingBuffer` is on, and MapLibre's worker URL is set explicitly for Vite.
- `applyCommand` now takes `content`, because travel needs the road graph and sites.
- Saves are checked against content on load (unknown character or site → rejected).
