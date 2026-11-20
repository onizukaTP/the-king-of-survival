# CLAUDE.md — The King of Survival

This file is the standing brief for any Claude session on this repository. Read it fully before doing any work.

---

## 1. Project in one paragraph

A single-player, browser-based, post-apocalyptic survival RPG set in **Tamil Nadu, India, 27 years after total nuclear annihilation**. The player controls **Prabu**, a 27-year-old hunter from a struggling settlement of ~20 people. Core loop: explore a large real-geography map → travel → discover locations → scavenge → manage survival → craft → fight turn-based tactical encounters → progress. Long term, Prabu can rise from survivor to a regional power (wealth, settlements, trade, military, rebuilding civilisation) while his personal story — the missing brother, the unresolved father, and his mother's dying wish — pulls in a different direction. The player decides who Prabu becomes.

Inspirations (atmosphere and broad mechanics only — **never copy content, characters, assets, locations, UI or names**): Day R Survival (map-based survival), Fallout (post-nuclear worldbuilding, factions, moral choice), Darkest Dungeon (tactical turn-based combat).

**North star:** a genuinely playable, expandable survival RPG — not a visually impressive frontend demo.

---

## 2. Roles and how to work

- **The owner makes all game design decisions.** Claude is lead designer/architect/developer: recommends, explains trade-offs, implements approved decisions.
- **Claude may decide routine technical implementation details** that do not change gameplay, narrative, progression or UX.
- When information is missing:
  1. Check this file and `docs/` first — do not re-ask answered questions.
  2. Separate confirmed requirements, proposals, and open questions.
  3. Offer alternatives with pros/cons and a recommendation.
  4. **Ask before implementing anything that affects gameplay, narrative, progression or user experience.**
- Ask focused questions only when a decision is actually needed for the current work.
- If you find a contradiction, **flag it — do not silently fix it.**

### Strict rules (non-negotiable)

1. Do not invent gameplay requirements.
2. Do not invent narrative details.
3. Do not change established character history (§4).
4. Do not introduce characters, factions, locations or plot twists without approval.
5. Do not implement future features (§6) prematurely.
6. Do not make major UI/UX decisions without presenting the design for approval.
7. Do not overengineer the prototype.
8. Do not generate final artwork — placeholders only.
9. Do not produce a static mockup and call it a working game.
10. No important button or interaction may be non-functional. If something isn't built, don't render it (or render it clearly disabled with a reason).
11. Do not silently alter previously approved functionality.
12. Ask focused questions when a decision is necessary.

---

## 3. World canon (confirmed)

- Total nuclear annihilation occurred **27 years ago**. Civilisation collapsed; survivors live in scattered settlements.
- World conditions: famine, drought, water scarcity, radiation zones, abandoned cities/towns, destroyed infrastructure, scarce medicine, declining livestock and agriculture, mass migration, banditry and resource conflict, remnants of military/technological infrastructure.
- Tone: dangerous, unpredictable, alive.
- **Playable world: Tamil Nadu only**, built on real geography, as one large continuous map (not levels, not a simple node map). Design data structures so other regions could be added later; do not add them.
- Approved world-element *categories* (identities/storylines NOT yet designed): independent survivor colonies, bandits/raiders, military remnants, religious/ideological factions, mutated creatures, underground bunkers, technologically advanced communities, trade settlements, hostile and friendly survivor groups.

**Owner-only decisions (never decide these):** starting city/settlement location, other settlement locations, safe zones, hostile territories, contamination zones, route system.

---

## 4. Prabu and the canonical timeline

**Prabu** — 27, hunter, member of a ~20-person settlement. No predetermined moral alignment; personality and morality are shaped by player decisions. Has suffered major loss. Wants to become better, wealthy, powerful, and able to change the world; does not particularly care if people call him a tyrant.

| When | Prabu's age | Event |
|---|---|---|
| 27 years ago | 0 | The Great Annihilation. Prabu is born the same day. Father survives and stays with the family. |
| ~22 years ago | ~5 | Mother becomes pregnant. |
| ~21 years ago | ~6 | Younger brother born. |
| ~10 years ago | ~17 | Drought/famine → mass migration. A chaotic scuffle separates the family: Prabu + mother lose the father and younger brother (brother ~10). Whereabouts unknown. |
| Recent years | — | Prabu becomes the settlement's hunter. Settlement struggles: too many mouths, failing crops, little clean water, declining cattle, almost no medicine. |
| Recent | 27 | Mother's health fails (radiation + famine). Prabu stays home to care for her instead of hunting. She dies. |

**Mother's final revelation:** she has discovered a *trace* of the missing younger brother. This is a major story driver.

**Mother's final wish:** that Prabu (1) finds his younger brother, (2) finds love, (3) lives a good and happy life — not merely power or wealth. This contrasts with Prabu's grief-shaped ambition; the player may interpret or fulfil it in different ways.

**There is no sister.** Any reference to a sister is wrong.

### Not yet established — do NOT invent

- How the family was separated, and what happened to the father and brother afterwards.
- The nature of the mother's clue (no letter/photo/witness/location without approval).
- Whether finding the father is a separate quest or part of the brother's storyline.
- Exact dialogue of the mother's final scene.
- Names of the mother, father, brother, and settlement.

### Flagged inconsistencies (awaiting owner ruling)

- **T1** Brother born when Prabu ~6; migration ~10 years ago (Prabu ~17) → brother would be ~11, not ~10.
- **T2** "Father remains present during his first five years" vs. separation at the migration (~17). Assumed present until the migration — unconfirmed.
- **T3** "Doesn't care if called a tyrant" vs. "no predetermined alignment" — fixed starting disposition, or one possible path?
- **T4** "Don't assume he always fights alone" vs. team building being deferred — who fights in the prototype?

---

## 5. Prototype scope (Milestone target)

The prototype validates the core experience and architecture. Required simplified systems:

1. Browser-based game interface.
2. Geographic map of Tamil Nadu.
3. Basic travel between locations.
4. Location discovery and exploration.
5. Basic scavenging.
6. Working inventory.
7. Basic survival management.
8. Small crafting system.
9. One playable turn-based combat encounter (small but real).
10. Basic player progression/state.

Plus: establish Prabu's identity and the emotional foundation of the story (opening scope is an open decision).

Exact counts of locations, items, recipes, enemies and survival attributes must be **proposed and approved before implementation** (see §8).

---

## 6. Deferred — do NOT implement in the prototype

Team building/recruitment · scavenging expeditions · colony/settlement management · full faction system · karma system · perk selection screen · romance/relationships · empire management / conquest / territory control · trading/currency (not in the approved prototype list; ask first) · other Indian states · native mobile apps / PWA · final artwork.

Architecture may leave room for these (e.g., combat supports N combatants; GameState can hold factions later) but **no code for them**.

---

## 7. Technical architecture (chosen)

Fully client-side. **No backend** — a single-player prototype doesn't need one. Do not add one without a concrete reason approved by the owner.

| Concern | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| Build/dev | Vite |
| UI | React (function components + hooks) |
| UI state bridge | Zustand (thin wrapper over the engine) |
| Map | MapLibre GL JS + curated, preprocessed GeoJSON (coastline, state/district boundaries, major rivers, highways, towns). Custom wasteland styling. No tile server. |
| Combat rendering | React DOM + CSS animation (behind an interface so PixiJS could replace it later if needed) |
| Content validation | Zod schemas, validated at load |
| Persistence | IndexedDB, versioned save schema with migrations; JSON export/import |
| Unit tests | Vitest |
| E2E/smoke tests | Playwright |
| CI/CD | GitHub Actions → static hosting (GitHub Pages or Cloudflare Pages) |

Map data licensing: prefer Natural Earth (public domain) for coarse layers; OpenStreetMap-derived data requires attribution (ODbL). Keep a `CREDITS.md` with all data/asset sources.

### Core architectural principle: engine ≠ UI

- `src/engine/` is **pure TypeScript**: no React, no DOM, no MapLibre, no `Math.random()`, no `Date.now()`.
- All game state lives in one **serialisable `GameState`** object.
- State changes only through **commands**: `applyCommand(state, command) → { state, events }`. UI dispatches commands and renders state; it never mutates state or contains game rules.
- Randomness comes from a **seeded RNG stored in GameState** → deterministic, reproducible tests and saves.
- Game time is an integer (minutes since game start) advanced by actions, not wall-clock time (pending owner approval of the time model, Q2).
- Invalid commands return a typed error/rejection; they never throw unhandled or partially mutate state.

### Planned directory layout

```
/
├─ CLAUDE.md
├─ CREDITS.md
├─ docs/
│  ├─ requirements.md      # Stage 1 consolidated requirements
│  ├─ decisions.md         # decision log (D-xxx), mirrors §8
│  └─ progress.md          # completed / in-progress / pending / blocked
├─ public/
│  ├─ assets/              # placeholder art
│  └─ geo/                 # processed GeoJSON for Tamil Nadu
├─ scripts/                # one-off data preprocessing (e.g., geo simplification)
├─ src/
│  ├─ engine/
│  │  ├─ core/             # GameState, commands, rng, clock, ids
│  │  ├─ systems/          # travel, survival, inventory, scavenging, crafting, events, combat, progression
│  │  └─ save/             # save schema, versioning, migrations
│  ├─ content/
│  │  ├─ schemas/          # Zod schemas
│  │  ├─ data/             # items, locations, recipes, enemies, events, loot tables (JSON)
│  │  └─ loader.ts
│  ├─ assets/              # manifest.json + resolver (asset IDs → files)
│  ├─ map/                 # MapLibre integration, layers, fog of war
│  ├─ store/               # Zustand bridge to engine
│  ├─ ui/
│  │  ├─ screens/          # Title, Intro, WorldMap, Location, Combat, GameOver
│  │  ├─ panels/           # Inventory, Crafting, Character, Journal, Menu
│  │  └─ components/       # shared UI pieces
│  └─ main.tsx
└─ tests/
   └─ e2e/                 # Playwright
```

Engine unit tests live next to the code (`*.test.ts`).

### Content and assets

- All game content (items, locations, recipes, enemies, events, loot tables) is **data**, not code. No hardcoded content in systems or UI.
- IDs are namespaced lowercase slugs: `item.water_bottle`, `character.<slug>`, `loc.<slug>`, `enemy.<slug>`, `recipe.<slug>`, `event.<slug>`.
- Content references assets by ID only (`"icon": "icon.item.water_bottle"`). `src/assets/manifest.json` maps IDs → files. Replacing art = replacing files/manifest entries, never touching gameplay code.
- A missing asset falls back to a generic placeholder, never a crash.
- UI strings: keep them out of game logic so localisation (possibly Tamil) can be added later — pending owner decision, don't build i18n infrastructure until approved.

### Saves

- Save = `{ saveVersion, createdAt, gameState }`.
- Every GameState shape change bumps `saveVersion` and adds a migration. Old saves must keep loading.
- Save model (manual / autosave / permadeath) is an open decision (Q8).

### Code conventions

- TypeScript strict; no `any` without a comment explaining why.
- Small, focused modules; one system per folder.
- Prefer plain functions and data over class hierarchies.
- No new dependency without a one-line justification in the PR/commit message.
- Readable over clever. Comment *why*, not *what*.

---

## 8. Decision log

### Confirmed
- D-001 Browser-first, single-player; desktop primary, responsive mobile browser where practical.
- D-002 Tamil Nadu only, real geography, continuous map.
- D-003 Combat is turn-based and tactical; must NOT reproduce Darkest Dungeon's 4-rank formation.
- D-004 Placeholder art only, centrally managed.
- D-005 Client-side architecture, stack as in §7 (Claude's authority per owner).
- D-006 Prototype systems as listed in §5; deferred list in §6.
- D-007 Game name: **The King of Survival**.

### Proposed — awaiting owner approval
- P-001 Prototype content: 1 home settlement + 6–8 discoverable locations in one region; ~20–25 items; 6–8 recipes (craft anywhere); 3–4 enemy types; 8–10 text events.
- P-002 Survival attributes: Health, Hunger, Thirst, Fatigue, Radiation, with threshold penalties.
- P-003 Action-based time (travel/scavenge/rest/craft advance the clock).
- P-004 Travel: hybrid (roads faster, off-road slower/riskier); M1 implements road/river-network travel first.
- P-005 Combat: Prabu solo vs 1–3 enemies, range bands (close/mid/far), speed-based turn order; actions: attack, aim, move band, use item, flee.
- P-006 Progression: XP → levels with small stat gains; perks deferred.
- P-007 Screens: Title → Intro → World Map hub (HUD bar top, location side panel, bottom nav) → Location / Event dialog / Combat → Game Over; panels for Inventory, Crafting, Character, Journal, Menu. Mobile: full-screen map, bottom sheets.

### Open — blocking (do not implement affected areas until answered)
- Q1 Starting city/region of the settlement and the prototype's playable region. *(blocks M1)*
- Q2 Travel model and whether travel is animated in real time or resolves instantly. *(blocks M1)*
- Q3 Final survival attribute list; are injuries separate from Health? *(blocks M2)*
- Q4 Combat: solo or companion; positioning model; can the player flee? *(blocks M7)*
- Q5 Enemy mix: animals / human bandits / mutants. *(blocks M7)*
- Q6 Progression model. *(blocks M8)*
- Q7 Opening narrative: playable prologue with mother alive, text intro after her death, or death mid-play. *(blocks M8)*
- Q8 Death and save model: permadeath / manual saves / autosave. *(affects M0 save UX, M2)*
- T1–T4 Timeline/character inconsistencies in §4.

### Open — non-blocking
- Tamil localisation readiness.
- Names: settlement, mother, father, brother.
- Currency/bartering before the wealth arc.

When the owner answers, move the item to **Confirmed** with a new D-number and update `docs/decisions.md`.

---

## 9. Milestones and status

| # | Milestone | Depends on | Status |
|---|---|---|---|
| M0 | Skeleton: Vite/React/TS, engine core, GameState, command dispatcher, seeded RNG, content loader + Zod, asset manifest, IndexedDB save/load, CI + deploy | — | In progress — built and tested locally; deploy pending |
| M1 | World map: TN render, pan/zoom, locations, discovery/fog, travel with time cost | M0, Q1, Q2 | Blocked |
| M2 | Time & survival: clock, decay, thresholds, death | M1, Q3 | Blocked |
| M3 | Items & inventory: definitions, stacking, weight, use, equip | M0 | Not started |
| M4 | Locations & scavenging: loot tables, depletion, time cost | M2, M3 | Blocked |
| M5 | Crafting | M3 | Not started |
| M6 | Event system: data-driven events with choices/consequences | M2, M3 | Blocked |
| M7 | Combat | M3, M6, Q4, Q5 | Blocked |
| M8 | Progression, opening narrative, journal | M7, Q6, Q7 | Blocked |
| M9 | Integration, balance pass, playtest | All | Blocked |

Keep this table and `docs/progress.md` current at the end of every work session.

### Acceptance criteria per milestone (summary)
- **M0** App runs at a public URL; New Game → Save → refresh → Load restores identical state; CI runs lint, typecheck, tests.
- **M1** Player travels between locations; time and discovery persist across save/load.
- **M2** Attributes change predictably; penalties apply; death → game over.
- **M3** Use/equip/drop work; carry limit enforced; invalid actions rejected with feedback.
- **M4** Loot varies by location type; locations deplete; seeded tests reproducible.
- **M5** Recipes consume inputs/produce outputs; missing materials clearly blocked.
- **M6** Events fire during travel/exploration; outcomes change state.
- **M7** A full encounter is playable: win, lose and (if approved) flee, with results carried into the world.
- **M8** Progression works; the approved opening plays; brother quest appears in journal.
- **M9** A complete 30–60 minute session works on desktop and a mobile browser.

---

## 10. Workflow for each feature

1. Confirm the feature's design decisions are in **Confirmed** (§8). If not, stop and ask.
2. Implement **one coherent feature at a time**, engine first, then UI.
3. Write engine unit tests (happy path + invalid actions + edge cases) and, per milestone, a Playwright smoke test of the main flow.
4. Run the full test suite — existing features must keep working.
5. Verify in the browser that every visible control actually works.
6. Update §9, `docs/progress.md`, and `docs/decisions.md`.
7. Summarise for the owner: what was built, architectural choices made and why, what's pending/blocked.

### Definition of done
- Typecheck, lint, unit and e2e tests pass.
- No non-functional buttons or fake interactions.
- No hardcoded content outside `src/content/data/`.
- Save/load still works (migration added if GameState changed).
- Docs and status updated.

---

## 11. Commands (available after M0)

```bash
npm install          # install dependencies
npm run dev          # start dev server
npm run build        # production build to dist/
npm run preview      # serve the production build locally
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest (engine unit tests)
npm run test:e2e     # playwright smoke tests
```

Update this section if scripts change.
