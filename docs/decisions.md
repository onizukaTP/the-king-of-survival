# Decision log

Mirrors CLAUDE.md §8. Update both when the owner rules on something.

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
- D-014 Madurai was **not struck directly** in the Annihilation: standing, decayed ruins with **scattered low-level fallout patches**. Radiation is a background risk, not a single big zone. Where the patches lie is still open (Q9).
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

### Proposed — awaiting owner approval
- P-001 Prototype content: 1 home settlement + 6–8 discoverable locations in one region; ~20–25 items; 6–8 recipes (craft anywhere); 3–4 enemy types; 8–10 text events.
- P-003 Action-based time (travel/scavenge/rest/craft advance the clock).
- P-005 Combat: Prabu solo vs 1–3 enemies, range bands (close/mid/far), speed-based turn order; actions: attack, aim, move band, use item, flee.
- P-006 Progression: XP → levels with small stat gains; perks deferred.
- P-009 Leg length: a trip is cut into legs of at most **60 game minutes** (`world.json`). It sets how often travel can be interrupted once events exist (M6). Used in M1 as a working value. The owner expects it to change with survival (D-023); a new value is proposed in P-011.
- P-010 Item list: 29 prototype items plus later ones, in `docs/items.md` (replaces the item count in P-001).
- P-011 Survival numbers (meters 0–100, start at 100): Water −3/h (empty in ~33 h), Food −1.5/h (~67 h), Rest −5/h awake (~20 h); sleeping restores Rest +12.5/h (8 h to full). Rest at 0 → Food and Water drain ×2. Food at 0 → Health −5/h; Water at 0 → Health −5/h (both at 0: −10/h). Health recovers +2/h while sleeping if Food and Water are above 25. A **Rest** action (1 h / 4 h / until rested) works anywhere. Health 0 → game over. Legs shortened to **30 min**, and a trip stops by itself at the end of a leg when a meter falls to 25 or to 0. Radiation lowers *maximum* Health (Fallout-style) once Q9 places patches.
- P-007 Screens (the map screen part is approved as D-016): Title → Intro → World Map hub (HUD bar top, location side panel, bottom nav) → Location / Event dialog / Combat → Game Over; panels for Inventory, Crafting, Character, Journal, Menu. Mobile: full-screen map, bottom sheets.

### Open — blocking (do not implement affected areas until answered)
- Q9 Where the fallout patches (D-014) lie in the prototype area. *(blocks radiation content in M2/M4; not M1)*
- Q3 (rest answered by D-023) How Health recovers; whether injuries are separate from Health; how radiation lowers Health. *(blocks M2; recommendations in P-011)*
- Q10 Vehicles (D-024): prototype or later, fuel model, how they are obtained, road/off-road and cargo rules. *(blocks vehicle work only)*
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
