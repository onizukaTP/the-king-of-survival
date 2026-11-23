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
- D-062 **Charms (later):** special items that lower risks or raise yields; Prabu can wear **1 talisman, 2 rings and 2 bangles**. To be drafted and approved later; not built in M6.
- D-063 (answers Q4 and T4) **Combat setup:** Prabu **fights alone** in the prototype, but the engine supports any number of fighters on each side so companions can join once team building is approved. **Range bands:** each enemy is Close, Mid or Far; knives and the aruval hit Close, the spear reaches Mid, the bow hits any band and uses arrows; moving a band costs a turn. **Fleeing** is a chance roll that uses his turn: easier from Far, harder when he is hurt or heavily loaded; if it fails, the enemies get a free hit.
- D-064 (answers Q5) **Prototype enemies:** **mutated animals** (such as the wild dog pack, D-029) and **nameless human raiders** (such as the roadblock). No other mutated creatures in the prototype.

### Proposed — awaiting owner approval
- P-001 Prototype content: 1 home settlement + 6–8 discoverable locations in one region; ~20–25 items; 6–8 recipes (craft anywhere); 3–4 enemy types; 8–10 text events.
- P-003 Action-based time (travel/scavenge/rest/craft advance the clock).
- P-005 Combat (solo, range bands and fleeing are now D-063): 1–3 enemies, speed-based turn order; actions: attack, aim, move band, use item, flee. Numbers to be proposed.
- P-006 Progression: XP → levels with small stat gains; perks deferred.
- P-007 Screens (the map screen part is approved as D-016): Title → Intro → World Map hub (HUD bar top, location side panel, bottom nav) → Location / Event dialog / Combat → Game Over; panels for Inventory, Crafting, Character, Journal, Menu. Mobile: full-screen map, bottom sheets.

### Open — blocking (do not implement affected areas until answered)
- Q6 Progression model. *(blocks M8)*
- Q7 Opening narrative: playable prologue with mother alive, text intro after her death, or death mid-play. *(blocks M8)*
- T1–T3 Timeline/character inconsistencies in §4 (T4 is answered by D-063).

### Open — non-blocking
- Tamil localisation readiness.
- Names: settlement, mother, father, brother.
- Currency/bartering before the wealth arc (bullock cart buying and biodiesel selling wait on it).

When the owner answers, move the item to **Confirmed** with a new D-number and update `docs/decisions.md`.
