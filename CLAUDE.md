# CLAUDE.md — The King of Survival

This file is the standing brief for any Claude session on this repository. Read it fully before doing any work.

---

## 1. Project in one paragraph

A single-player, browser-based, post-apocalyptic survival RPG set in **Tamil Nadu, India, 27 years after total nuclear annihilation**. The player controls **Prabu**, a 27-year-old hunter from a struggling settlement of ~200 people, Kottai Nagar. Core loop: explore a large real-geography map → travel → discover locations → scavenge → manage survival → craft → fight turn-based tactical encounters → progress. Long term, Prabu can rise from survivor to a regional power (wealth, settlements, trade, military, rebuilding civilisation) while his personal story — the missing sister, the father he doesn't know is dead, and his mother's dying wish — pulls in a different direction. The player decides who Prabu becomes.

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

**Prabu** — 27, hunter, member of a ~200-person settlement, **Kottai Nagar** (D-082). No predetermined moral alignment; personality and morality are shaped by player decisions. The intro's ruthless resolve is his starting frame of mind, and he changes with the player's decisions (D-078). Has suffered major loss. Wants to become better, wealthy, powerful, and able to change the world; does not particularly care if people call him a tyrant.

| When | Prabu's age | Event |
|---|---|---|
| 27 years ago | 0 | The Great Annihilation. Prabu is born the same day. Father (**Vishnu**) survives and stays with the family until the migration (D-079). Mother: **Divya** (D-080). |
| ~22 years ago | 5 | Younger sister (**Nila**) born, 5 years younger than Prabu (D-073, D-079, D-080; she was a brother before). |
| ~10 years ago | ~17 | Drought/famine → mass migration. A chaotic scuffle separates the family: Prabu + mother lose the father and younger sister (sister ~12), who are lost there together (D-079). The father has since died, but Prabu doesn't know it yet (D-073); the sister's whereabouts are unknown. |
| Recent years | — | Prabu becomes the settlement's hunter. Settlement struggles: too many mouths, failing crops, little clean water, declining cattle, almost no medicine. |
| Day 1, 12:00 | 27 | Mother's health fails (radiation + famine). Prabu stays home to care for her instead of hunting. She dies at midday, during a solar eclipse; the run starts then (D-075). |

Prabu and his mother came to the settlement from the north, and her sickness began there (D-040).

**Mother's final revelation:** she believes her daughter is still alive. It came to her **in a dream**, in which she heard Nila's name (D-081); she was a devotee of **Lord Vishnu** (D-074). This is a major story driver.

**Mother's final wish:** that Prabu (1) finds his younger sister, (2) finds love, (3) lives a good and happy life — not merely power or wealth. This contrasts with Prabu's grief-shaped ambition; the player may interpret or fulfil it in different ways.

**The missing sibling is a younger sister** (D-073, 2026-11-25). *(This supersedes the earlier rule "There is no sister"; any reference to a missing younger brother is now wrong.)* Her name is **Nila** (D-080). In her dream the mother heard Nila's name, and Prabu knows it from the start (D-081).

**The intro** (D-076) is the owner's own text, in Prabu's voice: `docs/progression.md`.

### Not yet established — do NOT invent

- How the family was separated; how and when the father died, and how Prabu learns it.
- What the mother's dream showed, beyond her belief that her daughter lives (no letter/photo/witness/location without approval).
- Exact dialogue of the mother's final scene (the intro is Prabu's monologue after it).

### Flagged inconsistencies (awaiting owner ruling)

None open. Answered: ~~T1~~ and ~~T2~~ by D-079 (the sister is 5 years younger; the father stayed until the migration), ~~T3~~ by D-078 (a starting frame of mind, changed by the player's decisions), ~~T4~~ by D-063.

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
│  ├─ scavenging.md        # scavenging (D-047)
│  ├─ towns.md             # town maps (D-052)
│  ├─ night.md             # night and the moon (D-060)
│  ├─ events.md            # events and conditions (D-059, D-061)
│  ├─ fire.md              # fire and cooking (D-056, D-057)
│  ├─ crafting.md          # crafting (D-058)
│  ├─ progression.md       # progression, intro, journal (D-076)
│  ├─ combat.md            # four-rank combat (D-069)
│  ├─ charms.md            # charms (D-086, D-088)
│  ├─ playtest.md          # M9 playtest report and balance proposals (P-023)
│  └─ combat-m7.md         # the first combat, superseded (history)
├─ public/
│  ├─ assets/              # placeholder art
│  └─ geo/                 # processed GeoJSON for Tamil Nadu
├─ scripts/geo/            # Overpass queries + build scripts: roads, rail, state outline, water and wells, town streets
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
   ├─ e2e/                 # Playwright
   └─ playtest/            # M9 playtest bot and fight table (npm run playtest)
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
- D-003 Combat is turn-based and tactical; must NOT reproduce Darkest Dungeon's 4-rank formation. *(Superseded by D-069: four-rank formations.)*
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
- D-020 A new game starts on **Day 1 at 06:00** (dawn). May be revisited when the opening narrative (Q7) is decided. *(Superseded by D-075: Day 1 at 12:00.)*
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
- D-033 (Q10.3) Items and vehicles have **drop chances**; some things are found only where they would likely be, and very rarely, because scavengers got there first. A cycle is found whole or built from parts. *(Cycle parts superseded by D-085: a cycle is only found whole.)*
- D-034 (Q10.4) **Vehicle maintenance:** vehicles wear with use, slowly on roads and faster off-road.
- D-035 (approves P-011; replaces P-009) **Survival numbers:** meters 0–100 starting at 100; Water −3/h, Food −1.5/h, Rest −5/h awake, sleep +12.5/h; Rest at 0 → Food and Water drain ×2; each of Food or Water at 0 → Health −5/h; Health +2/h while sleeping with Food and Water above 25; Rest action (1 h / 4 h / until rested) anywhere; Health 0 → game over; radiation lowers maximum Health. **Legs are at most 30 minutes**, and a trip stops by itself at the end of a leg when a meter falls to 25 or to 0.
- D-036 (approves P-012, with a change) Item numbers in `docs/items.md`. **Carry limit:** 25 kg on foot without penalty, up to **50 kg** at most. Above 25 kg, Food, Water and Rest drain faster, **gradually**: ×1 at 25 kg, ×1.5 at 37.5 kg, ×2 at 50 kg.
- D-037 The **torch makes searching faster**, by day and by night (numbers with M4). **Lighter fuel** is a rare scavenged item.
- D-038 (answers Q8) **Permadeath with autosave:** one run; the game saves itself after every leg and action, and the Save button becomes "Save and quit". When Prabu dies, the run's save is deleted. *(Refined by D-069: in a fight, Prabu first reaches Death's Door; a failed Deathblow check kills him, and permadeath follows as before.)*
- D-039 (answers Q3) **Injuries are part of Health:** an injury lowers Health, and Health cannot recover until the injury is cured. A **cloth bandage or neem–turmeric paste** cures an injury; painkillers only restore Health. Injuries come from combat and events (M6/M7).
- D-040 (resolves T5) **Prabu and his mother came to the settlement from the north, and her sickness began there.**
- D-041 **Inventory and meters layout** approved from the mockup: four meters and a Pack button in the top bar; the Pack in the side panel / bottom sheet. Spec in `docs/ui.md`.
- D-042 **M2 and M3 stay on `dev` until M4 (scavenging) is ready.** A new run has no food or water and no way to find any before scavenging, so releasing them alone would make every run end in thirst.
- D-043 (supersedes the Madurai patches of D-014; refines D-025) **Radiation zone:** every point within **30 km of the line from Trichy to Villupuram**. Madurai and the prototype area have none. Every hour inside has a **1-in-4 chance of +5 radiation**, which lowers maximum Health (D-035).
- D-044 **Water:** bottles can be filled at **any water** on the map (lakes, tanks, ponds, reservoirs, rivers). **Only flowing rivers give clean water**; all other water is unsafe, still drinkable with the illness risk (D-027), until boiled or filtered.
- D-045 **Search finds:** the player chooses what to take; what stays behind remains **at that place for 96 hours**.
- D-046 **Home** gives nothing until trading exists (its stores come with trading). **Hunting** is chance-based until combat (M7).
- D-047 (approves P-013, with changes) **Scavenging:** Search 1 h, or 45 min with the torch for **5%** battery; **Hunt is a 1-hour roll**; loot tables as proposed, with depletion of 10 points a search (floor 10%) and **a full refresh 7 days after a place is first searched**; boiled water renamed **clean water**; **dropped items also stay on the ground 96 h**; the radiation zone is **drawn on the map in yellow with a radiation icon in the middle**. Spec in `docs/scavenging.md`.
- D-048 **Night:** moving in the dark at night without a torch **greatly raises the chance of injury or ambush**, except on **full-moon nights**. Designed now (P-015); the injury chance comes with events (M6) and ambushes with combat (M7).
- D-049 **Town maps:** each town has **its own map** with buildings to scavenge, and **every building type has its own loot table**. Building types are **any that reflect a real town**; temples, garages, supermarkets, medical stores, apartments and independent houses were the owner's examples. Layouts are **hand-made, with real landmarks where they exist** (OpenStreetMap has too few buildings for these towns). Details proposed in P-014.
- D-050 **Water at places:** ponds, lakes and **wells** are placed at places. **Well water is clean** (adds to D-044, where only flowing rivers were clean).
- D-051 **M2–M4 wait for town maps** before release (extends D-042).
- D-052 (approves P-014) **Town maps:** 16 building types; Srivilliputhur 13 buildings, Rajapalayam 16, Madurai 24 (with the airport); enter and leave a town for no time; walk between buildings at road speed; search time, stock loss and a loot table per type; town wells clean, tanks unsafe; the 39 OpenStreetMap wells on the world map; save v5. Spec in `docs/towns.md`.
- D-053 (refines D-052) **Leave town only from the edge of town**, which returns Prabu to the town's point on the world map. Elsewhere in the town he must walk back to the edge first.
- D-054 **Town ends:** besides the edge of town, each town map has a **north, south, east and west end** where a real street leaves the town. Leaving from an end puts Prabu **at that end on the world map**. The town map **can't zoom out past the whole town**; zooming in is free.
- D-055 **Pack:** sort **by kind, by name or by weight** (by price comes with trading); **double-clicking an item uses it**; every item that can be eaten, drunk or used has its **Eat / Drink / Use button on its row**.
- D-056 **Fire:** made with a **matchbox, the lighter, flint and steel, or by rubbing two sticks** (slow). Over a fire Prabu can **cook raw meat, boil water, and boil rags into sterilized bandages**. **Tinned food needs a can opener**, a rare item. Firewood (already in the item list) is the fuel. Numbers in D-057.
- D-057 (approves P-016) **Fire and cooking numbers:** 1 firewood + a way to light it (lighter or matchbox 5 min and one light, flint and steel 15 min, rubbing two sticks 90 min); a fire burns 2 h, +2 h per firewood added, one fire at a time; cook up to 3 raw meat, boil up to 4 bottles (pot), sterilize up to 3 rags with a pot and one bottle of water, 30 min each; new items matchbox (found with 3–10 matches), can opener (rare) and sterilized bandage (treats an injury, Health +20); no separate kindling; save v6. Spec in `docs/fire.md`.
- D-058 (approves P-017, with changes) **Crafting (M5):** a Craft panel, craft anywhere; inputs used, tool kept (in the pack or the weapon slot), time passes. Recipes: cloth bandage (2 rags, 10 min), neem paste (3 neem leaves, 15 min, Health +15), **neem–turmeric paste** (3 neem leaves + 1 turmeric, 15 min, Health +25), salted dried meat (2 raw meat + 1 salt, knife, 1 h, makes 2); millet porridge at a fire (up to 2 millet, pot, 1 bottle of water, 30 min). **Weapon recipes (spear, bow, arrows) wait for M7.** **Turmeric** joins the item list (0.1 kg, about 8% in houses, provision stores, ration shops, supermarkets, hotels and places of worship). **Animal hide** stays for later. Spec in `docs/crafting.md`.
- D-059 (approves P-018) **Events (M6)** as proposed in `docs/events.md`: rolls on travel legs (5% road, 10% cross-country), searches (10%) and outdoor rest at night (5%/h, none by a fire); ×2 in the dark without light; ×1.5 for threats at Rest 0; 2-hour cooldown; the 12 starter events; a dialog that must be answered, with item-tagged choices shown disabled with the reason. **Threats are handled without fighting for now; a Fight choice comes with M7.** A nameless raiders' roadblock is fine in the prototype area.
- D-060 (approves P-015) **Night and the moon** as proposed in `docs/night.md`, built with M6.
- D-061 **Conditions:** events leave lasting modifiers on Prabu. Six approved: **Sprained ankle** (walk speed ×0.7, 12 h), **Restless** (Rest drains ×1.5 until a 4-hour sleep), **Weak** (max Health −10 for 24 h; in M7 also −25% damage), **Shaken** (searches take 25% longer, 8 h; ends after 1 h of rest at home or by a fire), **Infected wound** (Health −1/h and no healing until treated with a sterilized bandage or neem–turmeric paste), **Well rested** (after sleeping to full Rest at home or by a fire: Rest drains ×0.75 for 12 h). The same condition again restarts its timer; no stacking. Spec in `docs/events.md`.
- D-062 **Charms (later):** special items that lower risks or raise yields; Prabu can wear **1 talisman, 2 rings and 2 bangles**. To be drafted and approved later; not built in M6. *(Slots refined by D-086.)*
- D-063 (answers Q4 and T4) **Combat setup:** Prabu **fights alone** in the prototype, but the engine supports any number of fighters on each side so companions can join once team building is approved. **Range bands:** each enemy is Close, Mid or Far; knives and the aruval hit Close, the spear reaches Mid, the bow hits any band and uses arrows; moving a band costs a turn. **Fleeing** is a chance roll that uses his turn: easier from Far, harder when he is hurt or heavily loaded; if it fails, the enemies get a free hit. *(Bands, band movement and reach superseded by D-069: four-rank formations and abilities. Solo Prabu, fleeing and the free hits on failure stay.)*
- D-064 (answers Q5) **Prototype enemies:** **mutated animals** (such as the wild dog pack, D-029) and **nameless human raiders** (such as the roadblock). No other mutated creatures in the prototype.
- D-065 **Combat rules (owner):** every fighter has **ATK, DEF, SPD, crit rate and crit damage**; items and attire will raise or lower them later. **Turn order** is SPD plus a roll, as in Darkest Dungeon. Prototype enemies: **wild dogs, mutated animals and raiders**. **Fights come from random encounters.** **Hunting** stays a success roll driven by a hunting stat, which hunting items will raise later. **Weapons stay primitive** for now; guns, crossbows, compound bows, sniper rifles and so on come later. Numbers proposed in P-019.
- D-066 (approves P-019, with changes) **Combat numbers (M7)** as in `docs/combat.md`, plus **ACC, Dodge, Hunting and Luck** stats. The bow gives Hunting +15%. **Luck** (base 0, raised later by items) is used for everything: each point adds 1% to search find chances, +1 to hunting success, +0.5 to the flee chance and +0.25 to crit rate. The combat screen and the Stats block in the Pack are approved; later the combat screen will look more like Darkest Dungeon's.
- D-067 **Combat screen, side view:** Prabu (and later his team) on the **left**, facing the enemies on the **right**, who stand in Close, Mid and Far columns. D-003 (no 4-rank formation) and the bands (D-063) stay; only the screen changes, with placeholder figures and an original look. More skills for Prabu and his team come later. *(The Close/Mid/Far columns are superseded by D-069: four ranks per side.)*
- D-068 **Testing tools:** a Test button, shown only when the address has `?debug=1` (live and local), that can open any event, start an ambush, start any fight, and jump the clock to night.
- D-069 (owner's combat redesign, 2026-11-24) **Four-rank tactical combat:** two formations of four ranks (rank 1 front, rank 4 back); position-dependent, data-driven **abilities** (usable ranks, target ranks, ally/enemy/self/corpse, single or all, damage, ACC and crit modifiers, status and movement effects); initiative SPD + 1–8 each round; resistances (stun, bleed, blight, debuff, move, deathblow); a status engine (bleed, blight, stun with stun protection, mark, buffs and debuffs, push, pull, shuffle); **Death's Door and Deathblow** for player-side characters; corpses; enemy AI driven by each enemy's data; multi-rank enemies; a party of 1–4 (Prabu alone for now, no placeholder companions). **Supersedes** D-003 (no 4-rank formation), the Close/Mid/Far bands, band movement and targeting of D-063 and D-067, and the immediate combat death of D-038 (permadeath itself stays). Weapons, ammunition, hunting and Luck stay. **Stress and psychological mechanics are deferred.** Spec and numbers in `docs/combat.md`.
- D-070 (answers Q6; approves P-006) **Progression: XP and levels.** Fights, hunts, finds and events give XP; each level gives a small stat gain; perks stay deferred. Numbers to be proposed with M8.
- D-071 (answers Q7) **Opening: a short text intro after his mother's death** (who Prabu is, her death, her clue, her wish); then the run starts at home as now.
- D-072 **Story text:** Claude drafts the mother's final scene and two or three options for the nature of her clue; nothing ships until the owner approves or rewrites it (§4 still applies: no names, clue or dialogue are invented into the game without approval).
- D-073 (owner, 2026-11-25; supersedes "There is no sister" in §4) **The missing sibling is a younger sister**, not a brother; her name is revealed later *(superseded by D-081: Prabu knows it from the start)*. **The father is dead**, but Prabu doesn't know it yet; it is revealed later in the story.
- D-074 **The mother's clue came to her in a dream.** She was a devotee of Lord Vishnu and believed her daughter is still alive. There is no direction or place.
- D-075 (supersedes D-020's 06:00) **A run starts on Day 1 at 12:00**, the moment his mother dies, during a **solar eclipse**. The eclipse sets the scene only; daylight rules apply. (Day 1 is a new moon in the moon cycle, D-060, which fits a solar eclipse.)
- D-076 (approves P-020, with changes) **M8:** the XP table, 10 levels with fixed gains and the Journal as proposed; the journal entry is **"Find my sister"** with the dream as the clue. **The intro is the owner's text** (Prabu's first-person monologue), with "Twenty-seven years have passed" and "my father or my sister may still be alive". Spec in `docs/progression.md`. *(The journal text is superseded by D-083.)*
- D-077 **Intro:** "Svarga Loka" becomes **"Vaikuntha"**, Lord Vishnu's abode, fitting his mother's devotion (D-074).
- D-078 (answers T3) **Prabu's outlook:** the intro's ruthless resolve is his **starting** frame of mind; through the journey he changes with the decisions the player makes. He has no fixed alignment.
- D-079 (answers T1 and T2) **The family:** the father stayed with the family until the migration; the **father and the sister were lost there**. The sister is **5 years younger** than Prabu (born about 22 years ago; about 12 at the migration; 22 now).
- D-080 **Names:** mother **Divya**, father **Vishnu**, sister **Nila**; the settlement is **Kottayam**. *(Superseded in part: Prabu knows Nila's name from the start, D-081; the settlement is Kottai Nagar, D-082.)*
- D-081 (owner, 2026-11-25; supersedes the "revealed later" parts of D-073 and D-080) **In her dream, the mother heard Nila's name.** Prabu knows his sister's name **from the start**, so game text may call her Nila from the intro on.
- D-082 (supersedes "Kottayam" in D-080 and "~20 people" in §1 and §4) **The settlement is Kottai Nagar, home to about 200 people.** The map's home place is named **Kottai Nagar**.
- D-083 (owner, 2026-11-25; settles D-072 for the journal) **The "Find my sister" entry is the owner's text:** "Mother died saying the name Nila. She might be referring to your lost sister. Gather clues to find her." It replaces Claude's draft and the dream as the journal's clue (D-076).
- D-084 **Combat numbers approved for now** (`docs/combat.md`); the owner may change them after testing for balance.
- D-085 (owner's rulings for M10) **Vehicles:** durability on every vehicle **except the bullock cart**; repairs use **scrap metal**, and **oil** joins later as a repair tool; **a cycle is found whole, with no parts**, and a **recipe attaches a cart to the cycle** (supersedes "built from parts" in D-033); the **bull's grain and water are deferred**. Numbers proposed in P-021.
- D-086 (owner, 2026-11-25; refines D-062) **Charms:** Prabu can wear at most **one necklace, two bangles, two rings, one set of earrings and a waist cord** (replaces D-062's 1 talisman, 2 rings and 2 bangles). Charms **never break**; the drafted names stay; **stainless steel bangles** replace glass bangles. **Set bonuses** come later in development.
- D-087 (approves P-021) **Vehicle numbers** as in `docs/vehicles.md`: speeds, cargo, effort, durability and wear, repair with scrap metal, the cycle trailer recipe (cycle + hand cart + 2 coir rope + 1 scrap metal, 1 h), the auto-rickshaw's fuel, and the rarity table.
- D-088 (approves P-022) **Charms** as in `docs/charms.md`: 13 charms across the necklace, earrings, waist cord, rings and bangles, their effects and where they are found.
- D-089 **Vehicle screens:** a Vehicle button and panel; parked vehicles on the map; Get on in the Here panel; Load into cargo for ground finds; the trailer as a Craft recipe. Spec in `docs/ui.md`.

### Proposed — awaiting owner approval
- P-001 Prototype content: 1 home settlement + 6–8 discoverable locations in one region; ~20–25 items; 6–8 recipes (craft anywhere); 3–4 enemy types; 8–10 text events.
- P-003 Action-based time (travel/scavenge/rest/craft advance the clock).
- P-005 Combat (solo, range bands and fleeing are now D-063): 1–3 enemies, speed-based turn order; actions: attack, aim, move band, use item, flee. Numbers to be proposed.
- P-023 (M9 playtest, `docs/playtest.md`) **Balance and fixes:** (1) give the bow raider a weak blow from rank 1 so a lone archer can act; (2) raw meat and millet tooltips say how to cook them, from the fire recipes; (3) how many days to reach level 10 (now about 90); (4) keep fights at about 1 every 4–5 days for now; (5) keep the two-raider ambush (a light avoids it); (6) keep the bow as is. Also flagged: the Wild dogs event says "Five lean dogs" but the fight has 2–4.
- P-007 Screens (the map screen part is approved as D-016): Title → Intro → World Map hub (HUD bar top, location side panel, bottom nav) → Location / Event dialog / Combat → Game Over; panels for Inventory, Crafting, Character, Journal, Menu. Mobile: full-screen map, bottom sheets.

### Open — blocking (do not implement affected areas until answered)

### Open — non-blocking
- Tamil localisation readiness.
- Currency/bartering before the wealth arc (bullock cart buying and biodiesel selling wait on it).

When the owner answers, move the item to **Confirmed** with a new D-number and update `docs/decisions.md`.

---

## 9. Milestones and status

| # | Milestone | Depends on | Status |
|---|---|---|---|
| M0 | Skeleton: Vite/React/TS, engine core, GameState, command dispatcher, seeded RNG, content loader + Zod, asset manifest, IndexedDB save/load, CI + deploy | — | Done — live at https://onizukatp.github.io/the-king-of-survival/ |
| M1 | World map: TN render, pan/zoom, locations, discovery/fog, travel with time cost | M0 | Done — live |
| M2 | Time & survival: clock, decay, thresholds, death | M1, M3 | Done — live (released 2026-11-22) |
| M3 | Items & inventory: definitions, stacking, weight, use, equip | M0 | Done — live (released 2026-11-22) |
| M4 | Locations & scavenging: loot tables, depletion, time cost | M2, M3 | Done — live (released 2026-11-22) |
| M4b | Town maps: buildings, per-type loot, wells (D-049, D-050, D-052) | M4 | Done — live (released 2026-11-22) |
| M5 | Crafting | M3 | Done — live (released 2026-11-22); weapon recipes built with M7 (D-066) |
| M6 | Event system: data-driven events with choices/consequences; night and moon (D-048, P-015) | M2, M3 | Done — live (released 2026-11-23); Fight choices wait for M7 (D-059) |
| M7 | Combat | M3, M6 | Done — live; four-rank redesign (D-069) live (released 2026-11-24) |
| M8 | Progression, opening narrative, journal | M7 | Done — live (released 2026-11-25); journal text is the owner's (D-083) |
| M10 | Vehicles: bullock cart, hand cart, cycle with trailer, auto-rickshaw (D-031) | M3, M4, M5 | Done — live (released 2026-11-26; D-085, D-087 to D-089), with charms (D-086, D-088) |
| M9 | Integration, balance pass, playtest | All | In progress — first pass on `dev` (2026-11-26): playtest bot, fight table, phone playtest, four bugs fixed; balance proposals P-023 await the owner (`docs/playtest.md`) |

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
- **M8** Progression works; the approved opening plays; sister quest appears in journal (D-073).
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
npm run playtest     # M9 playtest bot and fight table (RUNS, DAYS, DETAIL=1, SEED=n)
```

Update this section if scripts change.
