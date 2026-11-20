# Progress

## Completed
- **M0 Skeleton** — live at https://onizukatp.github.io/the-king-of-survival/. Contents: Vite + React + TS strict, engine core (`GameState` via Zod schema, `applyCommand` dispatcher with typed rejections, seeded mulberry32 RNG), content loader with Zod + cross-reference checks, asset manifest with placeholder fallback, IndexedDB save/load with versioned saves + migration chain, Title and skeleton Game screens, 13 unit tests, 1 Playwright smoke test, ESLint rules that block `Math.random`, `Date`, DOM and React inside `src/engine/`, GitHub Actions CI + Pages deploy.
  - Acceptance verified on the live site: New Game → Save → reload → Continue restores identical state; CI passes lint, typecheck, unit and e2e tests.

## In progress
- (none)

## Pending (unblocked)
- M1 World map — ready to build. All decisions are in place: D-008–D-020, sites in docs/world.md, layout in docs/ui.md.
- M3 Items & inventory — needs P-001 item list approved first.
- M5 Crafting — needs P-001 recipes approved first.

## Blocked
- Radiation content (Q9), M2 (Q3), M4, M6, M7 (Q4, Q5), M8 (Q6, Q7), M9 — see CLAUDE.md §8.

## Technical choices made in M0 (Claude's authority)
- `GameState` type is derived from its Zod schema, so save validation and the type can't drift.
- `applyCommand` hands handlers a `structuredClone` of state and catches throws, so a failed command can never leave state half-changed.
- No command handlers exist yet; the first real commands arrive with the first approved gameplay system.
- Starting character comes from `src/content/data/new-game.json` (only Prabu's canon name and age; no stats invented).
- One manual save slot, placeholder until Q8.
- Vite `base: './'` so GitHub Pages works under any repo name.
- JSON save export/import (§7) not built yet.
