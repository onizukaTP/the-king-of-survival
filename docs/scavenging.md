# Scavenging (M4) — approved (D-043 to D-047), built

Confirmed by the owner: D-043 (radiation zone), D-044 (water), D-045 (take or leave finds), D-046 (home stores later; chance-based hunting) and D-047 (the rest of P-013, with changes). All numbers are starting values for the balance pass (M9) and live in `src/content/data/scavenging.json` and `loot.json`.

## Actions

| Action | Where | Time | What happens |
|---|---|---|---|
| **Search** | Every site except home | 1 h | Two draws from the site's loot table. |
| **Search with torch** | Same, if the torch has 5% charge | 30 min (half, D-095) | Same draws, twice as fast; uses 5% of the torch battery (D-037, D-047). |
| **Hunt** | Sanctuary forest | 1 h | One success roll per hour on Prabu's Hunting chance (40% base, +15% with the bow, +10% with the spear, plus Luck; D-065, D-066). On success: raw meat ×2–3, and animal hide 75% of the time. A mutated boar turns up on about 1 hunt in 10. |
| **Fill bottles** | At any water (D-044) | 1 min per bottle (D-096) | Each empty bottle is filled: **clean water** at a river, **unsafe water** anywhere else. |
| **Drink** | At any water | 10 min | Water to 100. From a river it's safe; anywhere else it carries the 1-in-5 illness chance (D-027). |
| **Fish** (D-100) | At any water but a well, with a spear or a fishing rod (in the pack or in hand) | 1 h | 20% with a spear, 50% with a rod (+1% per Luck), scaled by the water's stock: raw fish ×1–3 on the ground here. A catch gives 10 XP. |
| **Gather moss** (D-100) | At any water but a well | 30 min | 60%, scaled by the stock: moss ×1–3 on the ground here. |

Each ~1 km square of water keeps its own stock: every fishing or moss try takes 10 points off, and it is full again 7 days after the first try there (D-100).

Time passes through the same survival clock as travel and rest.

## Water (D-044)

- **Where there's water:** any lake, tank, pond, reservoir or river in the map data. Dry ground has none.
- **Clean water** comes only from flowing rivers. All other water is unsafe: drinkable, with the illness risk (D-027), until it is **boiled or filtered** (both are crafting, M5).
- **Data:** water bodies and rivers come from OpenStreetMap (ODbL, credited), for the same area as the road data (the prototype box around home and Madurai). Elsewhere in Tamil Nadu there is no water data yet, so nothing to fill there; it can be extended later.
- Prabu counts as "at water" within 200 m of a water body or river.
- "Bottle of boiled water" is now **"Bottle of clean water"** (D-047), since river, boiled and filtered water are the same thing. Old saves are migrated.

## How a search works

- Each **draw** goes down the site's table: every entry has a chance and a quantity range, and the first that hits is found.
- **Depletion (D-033, D-047):** each site has a richness from 100% down to 10%. Every search lowers it by 10 points and every chance is multiplied by it. **Seven days after a place is first searched, its loot refreshes to 100%**, and the next search starts a new 7-day count. The panel shows "Left to find: 80%".
- **Take or leave (D-045):** finds land on the ground where Prabu stands and are listed under "On the ground" with a checkbox each and Take selected / Take all. Whatever stays behind remains there **for 96 hours**, then it's gone.
- Taking is refused past 50 kg (D-036), with a message.
- Items **dropped** from the pack go on the ground the same way, for 96 hours (D-047).
- Draws use the seeded RNG, so a save always replays the same way.

## Loot tables (chance per draw, quantity)

Chance per draw and how many, in draw order (a search makes 2 draws; each takes the first entry that hits). The owner's values from the weights and loot redo (D-098, 2026-11-27); the data is `src/content/data/loot.json`.

**Sanctuary forest** (search): firewood 50% (1–2) · neem leaves 30% (1–3) · bamboo 25% (1) · wild jackfruit 15% (1) · wild honey 4% (1–3).

**Sanctuary forest** (hunt, when it succeeds): raw meat 100% (2–3) · animal hide 75% (1).

**Srivilliputhur railway station** (search): scrap metal 40% (1–3) · cloth rags 15% (1) · empty bottle 15% (1) · pre-war biscuit packet 8% (1–2) · coir rope 10% (1) · pre-war tinned food 6% (1) · pre-war painkillers 3% (1) · lighter fuel 3% (1) · hand-crank charger 3% (1) · can of biodiesel 2% (1).

**NH 744 highway** (search): scrap metal 40% (1–2) · empty bottle 20% (1) · cloth rags 12% (1) · pre-war biscuit packet 8% (1–2) · pre-war tinned food 6% (1) · can of biodiesel 4% (1) · lighter fuel 4% (1).

**Pilavakkal dam** (search): tender coconut 25% (1–2) · firewood 25% (1) · neem leaves 15% (1–2) · empty bottle 10% (1).

**Towns** (Srivilliputhur, Rajapalayam, Madurai): searched building by building; see `docs/towns.md`.

**Home:** nothing to search; the settlement's stores come with trading (D-046).

## Radiation (D-043)

- **The zone:** every point within **30 km of the straight line from Trichy to Villupuram** (a band with rounded ends). Madurai and the prototype area have none.
- **Exposure:** every hour Prabu spends inside (travelling, resting or searching) has a **1-in-4 chance of +5 radiation**. For a travel leg, the hours inside are the share of the leg's path that lies in the zone.
- Radiation lowers **maximum** Health one for one (D-035); Health can't heal past it. The Health meter shows the lost part as a dark end segment, and an "Irradiated" tag appears in the top bar. Nothing removes radiation yet (iodine tablets are a "later" item).
- The zone is **drawn on the map from the start in yellow, with a radiation icon in the middle** (D-047).

## Actions by terrain — D-101 (owner, 2026-11-27)

Away from named places and town buildings, **the ground Prabu stands on decides what he can do**. Named places keep their own tables (home and a town's marker have nothing to search; town wells and tanks are for water only), and on open water he fishes and gathers moss instead (D-100).

- **Ground:** within 100 m of a road, town street or railway it is road; otherwise the land-cover square (~500 m; since M11 generated for the whole state, `docs/map.md`).
- **Generated towns and villages (D-105 to D-107):** their buildings give firewood 30% (1–2), scrap metal 10% (1) and every other item at one tenth of its type's chance; 90% of their wells are dry. The owner's places keep normal loot.
- **Stock:** each ~1 km square keeps its own: −10 points a search, full again 7 days after the first search there.
- **Hunting:** the place's share of his Hunting chance (40% at the start, +Luck), so the bow and level gains still count.
- **Events** roll as on any search or hunt.
- **The numbers** below are Claude's, built from the approved item lists (the forest uses the Sanctuary forest's table, the road the NH 744's); the owner may tune them.

| Ground | Search (1 h, 30 min with the torch) | Hunt (1 h) |
|---|---|---|
| Forest and woods | firewood 50% (1–2) · neem leaves 30% (1–3) · bamboo 25% (1) · wild jackfruit 15% (1) · wild honey 4% (1–3) | 100% of his Hunting chance: raw meat 100% (2–3) · animal hide 75% (1) |
| Scrub and grassland | firewood 30% (1) · neem leaves 20% (1–2) | 62.5% of his Hunting chance: raw meat 100% (1) |
| Farmland and orchards | groundnuts 15% (1–2) · tender coconut 10% (1) · millet grain 10% (1) · rice 8% (1) | 37.5% of his Hunting chance: raw meat 100% (1) |
| Road and railway | scrap metal 40% (1–2) · empty bottle 20% (1) · cloth rags 12% (1) · pre-war biscuit packet 8% (1–2) · pre-war tinned food 6% (1) · can of biodiesel 4% (1) · lighter fuel 4% (1) | — |
| Village | cloth rags 20% (1–2) · firewood 15% (1) · empty bottle 15% (1) · rice 8% (1–2) · salt 6% (1) | — |
| Dry, open land | firewood 10% (1) | 25% of his Hunting chance: raw meat 100% (1) |
