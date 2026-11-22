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
- D-025 (answers Q9) Heavy fallout lies in **northern Tamil Nadu**, outside the prototype area. In the prototype, radiation exists only as Madurai's scattered low-level patches (D-014); where they sit inside the ruins is proposed with M4.
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

### Proposed — awaiting owner approval
- P-001 Prototype content: 1 home settlement + 6–8 discoverable locations in one region; ~20–25 items; 6–8 recipes (craft anywhere); 3–4 enemy types; 8–10 text events.
- P-003 Action-based time (travel/scavenge/rest/craft advance the clock).
- P-005 Combat: Prabu solo vs 1–3 enemies, range bands (close/mid/far), speed-based turn order; actions: attack, aim, move band, use item, flee.
- P-006 Progression: XP → levels with small stat gains; perks deferred.
- P-007 Screens (the map screen part is approved as D-016): Title → Intro → World Map hub (HUD bar top, location side panel, bottom nav) → Location / Event dialog / Combat → Game Over; panels for Inventory, Crafting, Character, Journal, Menu. Mobile: full-screen map, bottom sheets.

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
