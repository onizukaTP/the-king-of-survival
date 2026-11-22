# Scavenging (M4) — proposal P-013, updated with the owner's answers

Confirmed by the owner: D-043 (radiation zone), D-044 (water), D-045 (take or leave finds), D-046 (home stores later; chance-based hunting). The remaining numbers below are still P-013, awaiting approval. All numbers are starting values for the balance pass (M9) and live in data.

## Actions

| Action | Where | Time | What happens |
|---|---|---|---|
| **Search** | Every site except home | 1 h | Two draws from the site's loot table. |
| **Search with torch** | Same, if the torch has charge | 45 min | Same draws, 25% faster; uses 10% of the torch battery (D-037). |
| **Hunt** | Sanctuary forest | 2 h | 40% chance of raw meat ×2–3; 30% chance of animal hide. Chance-based until combat (M7) (D-046). |
| **Fill bottles** | At any water (D-044) | 5 min per bottle | Each empty bottle is filled: **clean water** at a river, **unsafe water** anywhere else. |
| **Drink** | At any water | 10 min | Water to 100. From a river it's safe; anywhere else it carries the 1-in-5 illness chance (D-027). |

Time passes through the same survival clock as travel and rest.

## Water (D-044)

- **Where there's water:** any lake, tank, pond, reservoir or river in the map data. Dry ground has none.
- **Clean water** comes only from flowing rivers. All other water is unsafe: drinkable, with the illness risk (D-027), until it is **boiled or filtered** (both are crafting, M5).
- **Data:** water bodies and rivers come from OpenStreetMap (ODbL, credited), for the same area as the road data (the prototype box around home and Madurai). Elsewhere in Tamil Nadu there is no water data yet, so nothing to fill there; it can be extended later.
- Prabu counts as "at water" within 200 m of a water body or river.
- **Proposed item change:** rename "Bottle of boiled water" to **"Bottle of clean water"**, since river water, boiled water and filtered water would all be the same thing. Old saves are migrated.

## How a search works

- Each **draw** goes down the site's table: every entry has a chance and a quantity range, and the first that hits is found.
- **Depletion (D-033):** each site has a richness from 100% down to 10%. Every search lowers it by 10 points and every chance is multiplied by it. It recovers each day by the site's regrowth rate.
- **Take or leave (D-045):** finds are shown in the panel with a checkbox each and Take selected / Take all. Whatever stays behind remains **at that place for 96 hours**, listed under "Left here", and can be picked up later. After 96 hours it's gone.
- Taking is refused past 50 kg (D-036), with a message.
- Assumed, please confirm: items **dropped** from the pack also stay where he dropped them for 96 hours, the same way.
- Draws use the seeded RNG, so a save always replays the same way.

## Loot tables (chance per draw, quantity)

**Sanctuary forest** (regrows 20%/day): firewood 55% (1–2) · bamboo 35% (1) · neem leaves 30% (1–3).

**Srivilliputhur town ruins** (regrows 2%/day): cloth rags 25% (1–2) · scrap metal 25% (1–2) · empty bottle 20% (1) · coir rope 10% (1) · tinned food 8% (1) · millet 6% (1) · salt 6% (1) · flint and steel 4% · cooking pot 4% · aruval 3% · pre-war painkillers 3% · lighter fuel 2% · hand-crank charger 2%.

**Srivilliputhur railway station** (regrows 2%/day): scrap metal 40% (1–3) · cloth rags 15% (1) · empty bottle 15% (1) · coir rope 10% (1) · tinned food 5% (1) · pre-war painkillers 3% · lighter fuel 3% · hand-crank charger 3%.

**NH 744 highway** (regrows 2%/day; wrecks): scrap metal 40% (1–2) · empty bottle 20% (1) · cloth rags 12% (1) · tinned food 6% (1) · lighter fuel 4%.

**Pilavakkal dam** (regrows 20%/day): tender coconut 25% (1–2) · firewood 25% (1) · neem leaves 15% (1–2). It is also water (unsafe: a reservoir, not a flowing river).

**Rajapalayam town ruins** (regrows 2%/day; a bigger town, a little richer): cloth rags 30% (1–3) · scrap metal 25% (1–2) · empty bottle 20% (1–2) · tinned food 10% (1) · millet 8% (1) · salt 6% · coir rope 8% · cooking pot 5% · aruval 4% · pre-war painkillers 4% · lighter fuel 3% · hand-crank charger 2% · tender coconut 6%.

**Madurai city ruins** (regrows 1%/day; richest, **no radiation**, D-043): tinned food 15% (1–2) · scrap metal 35% (1–3) · empty bottle 25% (1–2) · cloth rags 25% (1–2) · pre-war painkillers 8% · cooking pot 6% · aruval 5% · hand-crank charger 5% · lighter fuel 5% · flint and steel 4%.

**Home:** nothing to search; the settlement's stores come with trading (D-046).

## Radiation (D-043)

- **The zone:** every point within **30 km of the straight line from Trichy to Villupuram** (a band with rounded ends). Madurai and the prototype area have none.
- **Exposure:** every hour Prabu spends inside (travelling, resting or searching) has a **1-in-4 chance of +5 radiation**. For a travel leg, the hours inside are the share of the leg's path that lies in the zone.
- Radiation lowers **maximum** Health one for one (D-035); Health can't heal past it. The Health meter shows the lost part as a dark end segment, and an "Irradiated" tag appears in the top bar. Nothing removes radiation yet (iodine tablets are a "later" item).
- Open: is the zone **drawn on the map** from the start (survivors would know the dead lands), or only felt? Proposed: drawn faintly from the start.

## Still to approve (P-013)

Search and hunt times, the torch bonus, the loot tables, depletion and regrowth, 200 m "at water", the clean-water rename, dropped items staying 96 h, and showing the radiation zone on the map.
