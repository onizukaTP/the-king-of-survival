# Architecture (as built)

How the code works today. CLAUDE.md §7 is the plan; this file describes what exists.
Update it whenever a milestone changes the structure.

**Current state:** M0 skeleton. No gameplay systems yet.

## The big rule: engine ≠ UI

```
UI (React)  ──dispatch(command)──▶  store (Zustand)  ──applyCommand──▶  engine (pure TS)
    ▲                                    │                                 │
    └───────────── renders state ◀───────┴──────── new state + events ◀────┘
```

- `src/engine/` is pure TypeScript. ESLint **fails the build** if engine code uses `Math.random`, `Date`, `window`, `document`, `localStorage` or `indexedDB`, or imports React, Zustand, MapLibre, `ui/` or `store/`. See `eslint.config.js`.
- The UI never changes state itself and holds no game rules. It calls store actions, and the store calls the engine.

## Folder map

| Path | What it does |
|---|---|
| `src/engine/core/state.ts` | `gameStateSchema` (Zod) and `GameState` (derived from it), plus `createNewGame(content, seed)`. |
| `src/engine/core/commands.ts` | `applyCommand(state, command)`, the only way state changes. |
| `src/engine/core/rng.ts` | `nextRandom(rngState) → [value, nextState]`, a seeded mulberry32. |
| `src/engine/save/save.ts` | Save format, version, migrations, `createSave`, `loadSave`. |
| `src/content/schemas/` | Zod schemas for content files. |
| `src/content/data/` | All game content as JSON. **The only place content may live.** |
| `src/content/loader.ts` | Validates content and cross-references at startup. |
| `src/assets/manifest.json` + `resolve.ts` | Asset ID → file path; unknown IDs fall back to the placeholder. |
| `public/assets/` | Placeholder art files. |
| `src/store/gameStore.ts` | Zustand store: current screen, current game, save/load actions. |
| `src/store/saveStorage.ts` | IndexedDB read/write (one manual slot). |
| `src/ui/` | `App.tsx` picks the screen; `screens/` holds Title and Game. |
| `tests/e2e/` | Playwright smoke tests (run against the production build). |

## Game state

```ts
GameState = {
  rngState: number,        // uint32 seed state for the RNG
  clockMinutes: number,    // game time, minutes since game start
  player: { characterId }, // points at content (character.prabu)
}
```

- The Zod schema is the single source of truth. The TypeScript type is inferred from it, so save validation and the type can't drift apart.
- Changing the shape means: bump `SAVE_VERSION`, add a migration, and add a test that an old save still loads.

## Commands

```ts
applyCommand(state, command) →
  | { ok: true,  state, events }
  | { ok: false, error: { code: 'unknown_command' | 'internal_error', message } }
```

- Handlers get a **copy** of the state (`structuredClone`), so one that fails halfway can't leave the caller's state half-changed.
- Exceptions are caught and returned as `internal_error`; they never escape.
- **No gameplay handlers exist yet.** `Command` is `{ type: string }` until the first real commands land, then it becomes a discriminated union.

To add a command: write the handler in its system folder (`src/engine/systems/<system>/`), register it in `handlers`, and test it. Tests cover the happy path, invalid input (state unchanged), and edge cases.

## Randomness

- All randomness goes through `nextRandom(state.rngState)`, and the new `rngState` is written back into the returned state.
- The same seed and the same commands give the same game, which is what makes seeded tests and saves reproducible.
- New-game seeds come from `crypto.getRandomValues` in the store (UI side), never in the engine.

## Content

- `src/content/data/*.json` is validated by Zod at startup (`loadContent()`). Bad content throws with a readable message, since that's a build bug, not a player error.
- IDs are namespaced slugs: `character.prabu`, `item.<slug>`, `loc.<slug>`, …
- Cross-references are checked, e.g. `new-game.json` must name an existing character.
- Current content: `characters.json` holds Prabu (name and age only), and `new-game.json` holds the starting character.

To add a content type: add a schema in `schemas/`, the JSON file in `data/`, parse it and check its cross-references in `parseContent`, and add a loader test.

## Assets

- Content refers to art by ID (`"portrait": "portrait.character.prabu"`).
- `resolveAsset(id)` looks the ID up in `manifest.json` and falls back to `placeholder` when it's missing.
- Replacing art means editing the manifest and files only, never code.

## Saves

```ts
SaveFile = { saveVersion: 1, createdAt: ISO string, gameState }
```

- `createSave(state, createdAt)`: the timestamp is passed in, because the engine doesn't read the clock.
- `loadSave(unknown)` takes anything (IndexedDB now, imported JSON later). It runs migrations from the save's version up to the current one, then validates the result. It returns `{ ok, save }` or `{ ok: false, error }` and never throws.
- `migrations[n]` upgrades version n → n+1. Never edit an existing migration.
- Storage: IndexedDB database `king-of-survival`, store `saves`, key `manual`. The game shows "Game saved." only after the transaction commits.
- One manual slot is a placeholder until Q8 (save model). JSON export/import isn't built yet.

## Testing

| Layer | Tool | Where | Covers now |
|---|---|---|---|
| Engine and content | Vitest | `src/**/*.test.ts` | RNG determinism and range; unknown-command rejection leaves state untouched; new-game state; save round-trip; save rejection (garbage, no version, future version, missing migration, corrupted state); content validation (bad IDs, duplicates, dangling references). |
| End to end | Playwright | `tests/e2e/` | New Game → Save → reload → Continue restores identical state. |

## Build, CI and deploy

- `vite.config.ts` uses `base: './'`, so the build works on GitHub Pages under any repo path.
- `.github/workflows/ci.yml` runs on pushes to `main` and `dev` and on PRs. It does `npm ci`, lint, typecheck, unit tests, Playwright e2e and build.
- On `main` only, it also uploads `dist/` and deploys to GitHub Pages: https://onizukatp.github.io/the-king-of-survival/
- Git branching rules are in CLAUDE.md §10 "Git workflow".
