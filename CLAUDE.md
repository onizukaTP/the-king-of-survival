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

Prabu and his mother came to the settlement from the north, and her sickness began there (D-040).

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
- Game time is an integer (minutes since game start) advanced by actions, not wall-clock time (confirmed for travel by D-010 and for resting by D-035; other actions pending P-003).
- Invalid commands return a typed error/rejection; they never throw unhandled or partially mutate state.

### Planned directory layout

```
/
├─ CLAUDE.md
├─ CREDITS.md
├─ docs/
│  ├─ requirements.md      # Stage 1 consolidated requirements, each traced to a decision
│  ├─ decisions.md         # decision log (D-xxx), mirrors §8
│  ├─ progress.md          # completed / in-progress / pending / blocked
│  ├─ architecture.md      # how the built code works (engine, saves, content, CI)
│  ├─ world.md             # confirmed geography, setting decisions and prototype sites
│  ├─ ui.md                # approved screen layouts
│  ├─ items.md             # item list (D-026) and numbers (D-036)
│  ├─ vehicles.md          # vehicles (D-024, D-030 to D-034)
│  └─ scavenging.md        # scavenging proposal (P-013)
├─ public/
│  ├─ assets/              # placeholder art
│  └─ geo/                 # processed GeoJSON for Tamil Nadu
├─ scripts/geo/            # Overpass query + build-geo.mjs: regenerates roads, rail, state outline
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
- Save model: permadeath with autosave, one run; the save is deleted when Prabu dies (D-038).

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
- D-008 (Q1, part) Prabu's settlement and the prototype's playable locations are in **Madurai and the dry south**. The whole state is still rendered. The exact settlement spot is still open (Q1b).
- D-009 (Q2, replaces P-004) Free movement: the player can travel to any point. Routes use roads where faster and go cross-country (slower, riskier) elsewhere. M1 treats cross-country as uniform ground (no terrain cost yet); the "riskier" part arrives with events (M6).
- D-010 (Q2) Travel resolves in **legs**: each leg resolves instantly with a short cosmetic marker animation, the clock advances by the leg's time, and travel can be interrupted between legs. No real-time movement; state is never saved mid-leg.
- D-011 (Q1b) Prabu's settlement is in the **Western Ghats foothills west of Srivilliputhur** (Virudhunagar district), beside the Grizzled Squirrel Wildlife Sanctuary. The exact map coordinate is picked from the map data in M1 and shown to the owner for confirmation.
- D-012 (Q1b) Prototype area: **compact, ~25 km radius** around the settlement, plus **Madurai city ruins (~75–80 km)** as the single distant destination, a long, costly expedition.
- D-013 (Q1b) The prototype's discoverable places include all four kinds: **Madurai city ruins, water sources, hunting grounds, roads/rail/airport**.
- D-014 Madurai was **not struck directly** in the Annihilation: standing, decayed ruins with **scattered low-level fallout patches**. Radiation is a background risk, not a single big zone. Where the patches lie is still open (Q9). *(The Madurai patches are superseded by D-043: Madurai has no radiation.)*
- D-015 (approves P-008) Prototype sites (real places; details and sources in `docs/world.md`): home settlement on the forest edge near Shenbagathoppu; Shenbagathoppu forest (hunting); Srivilliputhur town ruins; Srivilliputhur railway station; NH 744 highway stretch; Watrap Periyakulam tank / Pilavakkal dam (water); Rajapalayam town ruins; Madurai city ruins with the airport (far trip). That is 7 discoverable places + home. This settles the locations part of P-001; its item, recipe, enemy and event counts are still proposed.
- D-016 (part of P-007) **Map screen layout** for M1: top bar (time, status, Menu), full-screen map with fog, right side panel for the selected place / unmarked ground / travel progress; bottom sheet on mobile; no bottom navigation until those features exist. Spec in `docs/ui.md`.
- D-017 At the start Prabu **already knows** home, Shenbagathoppu forest, Srivilliputhur town ruins, the NH 744 stretch and Srivilliputhur railway station. Watrap/Pilavakkal, Rajapalayam and Madurai must be discovered.
- D-018 **Discovery:** fog clears in a ~3 km sight radius along Prabu's path; any site inside that radius is discovered.
- D-019 **Walking speeds:** road 4.5 km/h, cross-country 3 km/h.
- D-020 A new game starts on **Day 1 at 06:00** (dawn). May be revisited when the opening narrative (Q7) is decided.
- D-021 (owner chose option C when the OSM data showed the clash) The settlement sits at the sanctuary's **north-east forest edge, ~6 km north-west of Srivilliputhur town** (9.5599, 77.6251), not at Shenbagathoppu. Shenbagathoppu turned out nearer Rajapalayam (~9 km) than the town (~14 km), which clashed with D-017. The hunting ground is the sanctuary forest beside home; the water site is the Pilavakkal (Periyar) dam. Real coordinates and distances are in `docs/world.md`.
- D-022 **Click again to travel:** clicking the place that is already selected (so also double-clicking it) starts the trip; double-clicking open ground travels there. Double-click no longer zooms (wheel, pinch and +/− still do).
- D-023 (answers most of Q3; replaces P-002) **Survival meters: Health, Food, Water, Rest.** Health starts at 100. When Food or Water is at 0, Health drops. When Rest is at 0, Food and Water drain faster and the chance of meeting enemies rises (encounters arrive with M6/M7). Radiation can lower Health, in the spirit of Fallout (how is open; where is Q9). Rates are proposed in P-011.
- D-024 **Vehicles** are planned, travelled with and built through crafting: cycle (cart upgrade), scooter (cart upgrade), bike (faster, low storage), moped (slow, more storage), sedan, XUV, tempo, mini van, big van, lorry, military vehicle; more later. When and how is Q10. List and suggestions in `docs/vehicles.md`.
- D-025 (answers Q9) Heavy fallout lies in **northern Tamil Nadu**, outside the prototype area. In the prototype, radiation exists only as Madurai's scattered low-level patches (D-014); where they sit inside the ruins is proposed with M4. *(Refined by D-043.)*
- D-026 (approves P-010) **Item list** in `docs/items.md`. **Starting kit:** hunting knife, lighter (half full), torch (half charged; recharged with a charger / hand-crank charger). Flint and steel becomes a scavenged item.
- D-027 **Unsafe water** can cause diarrhoea, parasites or dysentery, which dehydrate him. Numbers in D-036.
- D-028 **Food spoils**, mercifully at first ("we can crank it up later"). Numbers in D-036.
- D-029 **Most animals are affected by radiation and many are mutated**, in the spirit of Fallout. Animals can be caught with traps; taming comes later.
- D-030 Vehicles added from Claude's suggestions: **bullock cart** (costly to buy, a living animal), **hand cart, auto-rickshaw, tractor with trailer, small boat, e-rickshaw**. Details in `docs/vehicles.md`.
- D-031 (Q10.1) **Prototype vehicles: bullock cart, hand cart, cycle with trailer, auto-rickshaw.** In the prototype the bullock cart is a very rare find (an abandoned cart with a bull).
- D-032 (Q10.2) **Biodiesel** is made by survivors and sold everywhere; it runs vehicles and generators (generators are very rare). In the prototype it is scavenged, since there is no trading.
- D-033 (Q10.3) Items and vehicles have **drop chances**; some things are found only where they would likely be, and very rarely, because scavengers got there first. A cycle is found whole or built from parts.
- D-034 (Q10.4) **Vehicle maintenance:** vehicles wear with use, slowly on roads and faster off-road.
- D-035 (approves P-011; replaces P-009) **Survival numbers:** meters 0–100 starting at 100; Water −3/h, Food −1.5/h, Rest −5/h awake, sleep +12.5/h; Rest at 0 → Food and Water drain ×2; each of Food or Water at 0 → Health −5/h; Health +2/h while sleeping with Food and Water above 25; Rest action (1 h / 4 h / until rested) anywhere; Health 0 → game over; radiation lowers maximum Health. **Legs are at most 30 minutes**, and a trip stops by itself at the end of a leg when a meter falls to 25 or to 0.
- D-036 (approves P-012, with a change) Item numbers in `docs/items.md`. **Carry limit:** 25 kg on foot without penalty, up to **50 kg** at most. Above 25 kg, Food, Water and Rest drain faster, **gradually**: ×1 at 25 kg, ×1.5 at 37.5 kg, ×2 at 50 kg.
- D-037 The **torch makes searching faster**, by day and by night (numbers with M4). **Lighter fuel** is a rare scavenged item.
- D-038 (answers Q8) **Permadeath with autosave:** one run; the game saves itself after every leg and action, and the Save button becomes "Save and quit". When Prabu dies, the run's save is deleted.
- D-039 (answers Q3) **Injuries are part of Health:** an injury lowers Health, and Health cannot recover until the injury is cured. A **cloth bandage or neem–turmeric paste** cures an injury; painkillers only restore Health. Injuries come from combat and events (M6/M7).
- D-040 (resolves T5) **Prabu and his mother came to the settlement from the north, and her sickness began there.**
- D-041 **Inventory and meters layout** approved from the mockup: four meters and a Pack button in the top bar; the Pack in the side panel / bottom sheet. Spec in `docs/ui.md`.
- D-042 **M2 and M3 stay on `dev` until M4 (scavenging) is ready.** A new run has no food or water and no way to find any before scavenging, so releasing them alone would make every run end in thirst.
- D-043 (supersedes the Madurai patches of D-014; refines D-025) **Radiation zone:** every point within **30 km of the line from Trichy to Villupuram**. Madurai and the prototype area have none. Every hour inside has a **1-in-4 chance of +5 radiation**, which lowers maximum Health (D-035).
- D-044 **Water:** bottles can be filled at **any water** on the map (lakes, tanks, ponds, reservoirs, rivers). **Only flowing rivers give clean water**; all other water is unsafe, still drinkable with the illness risk (D-027), until boiled or filtered.
- D-045 **Search finds:** the player chooses what to take; what stays behind remains **at that place for 96 hours**.
- D-046 **Home** gives nothing until trading exists (its stores come with trading). **Hunting** is chance-based until combat (M7).

### Proposed — awaiting owner approval
- P-001 Prototype content: 1 home settlement + 6–8 discoverable locations in one region; ~20–25 items; 6–8 recipes (craft anywhere); 3–4 enemy types; 8–10 text events.
- P-003 Action-based time (travel/scavenge/rest/craft advance the clock).
- P-005 Combat: Prabu solo vs 1–3 enemies, range bands (close/mid/far), speed-based turn order; actions: attack, aim, move band, use item, flee.
- P-006 Progression: XP → levels with small stat gains; perks deferred.
- P-007 Screens (the map screen part is approved as D-016): Title → Intro → World Map hub (HUD bar top, location side panel, bottom nav) → Location / Event dialog / Combat → Game Over; panels for Inventory, Crafting, Character, Journal, Menu. Mobile: full-screen map, bottom sheets.
- P-013 Scavenging (M4), updated with D-043 to D-046: Search (1 h, or 45 min with the torch for 10% battery), Hunt, Fill bottles and Drink at any water, per-site loot tables with depletion and regrowth, take-or-leave finds, the radiation zone. Remaining numbers in `docs/scavenging.md`.

### Open — blocking (do not implement affected areas until answered)
- Q4 Combat: solo or companion; positioning model; can the player flee? *(blocks M7)*
- Q5 Enemy mix: animals / human bandits / mutants. Animals are largely mutated (D-029). *(blocks M7)*
- Q6 Progression model. *(blocks M8)*
- Q7 Opening narrative: playable prologue with mother alive, text intro after her death, or death mid-play. *(blocks M8)*
- T1–T4 Timeline/character inconsistencies in §4.

### Open — non-blocking
- Tamil localisation readiness.
- Names: settlement, mother, father, brother.
- Currency/bartering before the wealth arc (bullock cart buying and biodiesel selling wait on it).

When the owner answers, move the item to **Confirmed** with a new D-number and update `docs/decisions.md`.

---

## 9. Milestones and status

| # | Milestone | Depends on | Status |
|---|---|---|---|
| M0 | Skeleton: Vite/React/TS, engine core, GameState, command dispatcher, seeded RNG, content loader + Zod, asset manifest, IndexedDB save/load, CI + deploy | — | Done — live at https://onizukatp.github.io/the-king-of-survival/ |
| M1 | World map: TN render, pan/zoom, locations, discovery/fog, travel with time cost | M0 | Done — live |
| M2 | Time & survival: clock, decay, thresholds, death | M1, M3 | Done on `dev` (not yet released) |
| M3 | Items & inventory: definitions, stacking, weight, use, equip | M0 | Done on `dev` (not yet released) |
| M4 | Locations & scavenging: loot tables, depletion, time cost | M2, M3 | Not started (proposal P-013 awaiting approval) |
| M5 | Crafting | M3 | Not started |
| M6 | Event system: data-driven events with choices/consequences | M2, M3 | Blocked |
| M7 | Combat | M3, M6, Q4, Q5 | Blocked |
| M8 | Progression, opening narrative, journal | M7, Q6, Q7 | Blocked |
| M10 | Vehicles: bullock cart, hand cart, cycle with trailer, auto-rickshaw (D-031) | M3, M4, M5 | Blocked (needs vehicle numbers proposed and approved) |
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

### Git workflow (owner's rule)

- Remote: `git@github-personal:onizukaTP/the-king-of-survival.git`. Always use the `github-personal` SSH host (account onizukaTP), never the work profiles.
- Every piece of work goes on its own branch cut from `dev`: `feature/<name>`, `chore/<name>`, `docs/<name>`, `ci/<name>`.
- Merge finished branches into `dev` with `git merge --no-ff`. Keep the feature branches (don't delete them).
- `main` is the release branch: every push to `main` deploys to GitHub Pages. Merge `dev` into `main` only to publish.
- CI runs on pushes to `main` and `dev` and on PRs.

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
