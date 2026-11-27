# Towns and water at places — approved (D-052), built; on the world map since D-099

Confirmed by the owner:
- **D-049:** every town has its own map of buildings to scavenge. Layouts are hand-made, with real landmarks where they exist. Building types can be any that reflect a real Tamil Nadu town; the owner's list was examples.
- **D-050:** ponds, lakes and wells sit at places, and **well water is clean**.
- **D-051:** M2–M4 wait for town maps before release.

Everything below was approved as P-014 (D-052) and is built (M4b), except where a note says otherwise.

**Where the buildings are:** landmarks and most buildings sit on real OpenStreetMap points of interest of their kind (for example a real petrol bunk or hospital). Kinds with nothing mapped, such as houses, ration shops and wells, are placed on a real street near the town centre. The tank is the real still-water body nearest each town's point. Every place is at least 100 m from every other, so floor piles never mix. The data is in `src/content/data/towns.json`; streets come from `scripts/geo/build-town-streets.mjs`.

## Which places get a town map

| Place | Town map? | Why |
|---|---|---|
| Srivilliputhur town ruins | Yes, 13 buildings | Small town |
| Rajapalayam town ruins | Yes, 16 buildings | Mill town |
| Madurai city ruins | Yes, 24 buildings, including the airport (D-015) | City |
| Home, sanctuary forest, railway station, NH 744, Pilavakkal dam | No | Single spots; they keep Search and Hunt as built in M4 |

## How it plays

**D-099 (2026-11-27): towns are on the world map.** The separate town screen, Enter town, Leave town, the edge and the four ends (D-053, D-054) are gone.

1. **Seeing a town:** zoomed out, a town is one marker. From street level (zoom 14) its buildings (small squares), wells and tanks (blue dots) and its streets show on the world map.
2. **Moving:** click a building to see it (type, search time, how much is left), click it again to go there. The trip is an ordinary trip with legs (D-010): the town's streets are part of the road graph, so it follows them at road speed (4.5 km/h, D-019). A leg that ends inside a town rolls only town-walk events, as before (D-059).
3. **At a building:** the Here panel shows **Search** and how much is left. Finds and drops work as in M4: you tick what to take, and the rest stays on that building's floor for 96 hours (D-045).
4. **At a well or a tank:** **Fill bottles** and **Drink**. A well gives clean water; a tank gives unsafe water (D-044, D-050).
5. **Resting** at a building counts as indoors (no night disturbances outdoors).
6. **Saves (v14):** a run that was inside a town stays where it stood.

## Building types

These are types of building you find in a real Tamil Nadu town.

- **Real places:** the landmarks named below. Each sits where it really is.
- **Everything else:** typical buildings placed on real streets, at real scale, so walking distances are true.

| Building type | Srivilliputhur | Rajapalayam | Madurai |
|---|---|---|---|
| Independent house | 3 | 3 | 3 |
| Apartment block | 1 | 1 | 3 |
| Place of worship (temple, mosque, church) | 2: Andal temple (real) and one more | 2 | 2: Meenakshi Amman temple (real) and one more |
| Provision store | 1 | 1 | 1 |
| Supermarket | — | 1 | 2 |
| Ration shop | 1 | 1 | 1 |
| Medical store | 1 | 1 | 2 |
| Hospital | 1: Government hospital | 1: Government hospital | 1: Government Rajaji Hospital (real) |
| Garage | 1 | 1 | 2 |
| Petrol bunk | 1 | 1 | 1 |
| Hardware store | — | 1 | 1 |
| Textile shop / mill | — | 1: spinning mill (Rajapalayam's mills are real) | 1: textile shop |
| Hotel / mess | 1 | 1 | 1 |
| Police station | — | — | 1 |
| Bus stand | — | — | 1: Mattuthavani bus stand (real) |
| Airport | — | — | 1: Madurai airport (real, on the south side; D-015) |
| **Buildings** | **13** | **16** | **24** |
| Wells (clean) | 1 | 2 | 2 |
| Tanks / ponds (unsafe) | 1 | 1 | 1 |

A small town like Srivilliputhur has no supermarket, which matches the map data: OpenStreetMap shows none there.

## Search time and stock by size

| Size | Types | Search | With torch (5%) | Stock lost per search |
|---|---|---|---|---|
| Small | Independent house, provision store, ration shop, medical store, petrol bunk | 30 min | 15 min | 25 points |
| Medium | Place of worship, garage, hardware store, hotel / mess, police station, bus stand | 45 min | 23 min | 20 points |
| Large | Apartment block, supermarket, hospital, textile shop / mill, airport | 1 h | 30 min | 15 points |

Torch times are half the search time since D-095 (they were about three quarters).

Each building has its own stock. The other rules are the same as in M4:
- Stock never falls below 10%.
- A building refills completely 7 days after it is first searched (D-047).
- Each search makes 2 draws.

## Loot tables by building type

Chance per draw and how many, in draw order. The owner's values from the weights and loot redo (D-098, 2026-11-27); the data is `src/content/data/building-types.json`. Low chances reflect that scavengers got there first (D-033).

**Independent house** (30 min): firewood 20% (1–2) · cloth rags 25% (1–2) · empty bottle 20% (1) · rice 10% (1–2) · matchbox 10% (1) · coir rope 8% (1) · jaggery 8% (1) · groundnuts 8% (1) · millet grain 8% (1) · salt 8% (1) · turmeric 8% (1) · pre-war tinned food 6% (1) · cooking pot 6% (1) · pre-war painkillers 4% (1) · can opener 4% (1) · aruval 3% (1) · flint and steel 2% (1) · lighter fuel 2% (1).

**Apartment block** (60 min): cloth rags 25% (1–3) · empty bottle 25% (1–2) · firewood 10% (1) · rice 10% (1–2) · pre-war tinned food 8% (1) · pre-war biscuit packet 8% (1) · millet grain 6% (1) · salt 6% (1) · cooking pot 5% (1) · pre-war painkillers 5% (1) · coir rope 5% (1) · can opener 4% (1) · hand-crank charger 3% (1) · lighter fuel 3% (1).

**Place of worship** (45 min): cloth rags 20% (1–2) · firewood 15% (1) · neem leaves 15% (1–2) · empty bottle 15% (1) · tender coconut 12% (1) · jaggery 10% (1) · turmeric 8% (1) · cooking pot 6% (1) · salt 5% (1) · flint and steel 3% (1).

**Provision store** (30 min): rice 20% (1–2) · jaggery 15% (1–2) · groundnuts 15% (1–2) · millet grain 15% (1–2) · salt 15% (1) · empty bottle 15% (1–2) · pre-war biscuit packet 12% (1–2) · matchbox 12% (1) · pre-war tinned food 10% (1) · turmeric 8% (1) · coir rope 5% (1) · can opener 4% (1) · lighter fuel 3% (1).

**Supermarket** (60 min): empty bottle 25% (1–3) · pre-war tinned food 20% (1–2) · pre-war biscuit packet 15% (1–2) · rice 12% (1–2) · salt 10% (1) · groundnuts 10% (1) · jaggery 10% (1) · matchbox 10% (1) · millet grain 8% (1) · cloth rags 8% (1) · can opener 6% (1) · turmeric 6% (1) · coir rope 5% (1) · lighter fuel 4% (1) · hand-crank charger 3% (1) · cooking pot 3% (1).

**Ration shop** (30 min): rice 30% (1–3) · millet grain 25% (1–3) · salt 20% (1–2) · jaggery 12% (1–2) · empty bottle 10% (1) · matchbox 8% (1) · turmeric 8% (1) · cloth rags 5% (1).

**Medical store** (30 min): pre-war painkillers 25% (1–2) · cloth rags 15% (1–2) · empty bottle 15% (1) · pre-war biscuit packet 5% (1) · turmeric 5% (1) · salt 3% (1).

**Hospital** (60 min): pre-war painkillers 25% (1–2) · cloth rags 25% (1–3) · empty bottle 20% (1–2) · pre-war biscuit packet 5% (1) · cooking pot 3% (1) · hand-crank charger 2% (1).

**Garage** (45 min): scrap metal 50% (1–3) · coir rope 15% (1) · cloth rags 10% (1) · empty bottle 10% (1) · can of biodiesel 8% (1) · lighter fuel 6% (1) · hand-crank charger 5% (1) · aruval 3% (1).

**Petrol bunk** (30 min): scrap metal 30% (1–2) · empty bottle 25% (1–2) · can of biodiesel 12% (1) · lighter fuel 12% (1) · pre-war biscuit packet 10% (1–2) · coir rope 8% (1) · cloth rags 8% (1) · pre-war tinned food 4% (1).

**Hardware store** (45 min): scrap metal 35% (1–3) · coir rope 25% (1–2) · aruval 8% (1) · cooking pot 8% (1) · flint and steel 6% (1) · hand-crank charger 4% (1) · lighter fuel 3% (1).

**Textile shop / mill** (60 min): cloth rags 50% (1–4) · scrap metal 10% (1) · coir rope 10% (1) · empty bottle 8% (1).

**Hotel / mess** (45 min): firewood 20% (1–2) · salt 20% (1) · empty bottle 20% (1–2) · rice 15% (1–2) · cooking pot 12% (1) · millet grain 12% (1) · jaggery 8% (1) · matchbox 8% (1) · turmeric 8% (1) · pre-war tinned food 5% (1) · can opener 4% (1) · flint and steel 2% (1).

**Police station** (45 min): coir rope 15% (1) · cloth rags 15% (1) · empty bottle 15% (1) · aruval 10% (1) · pre-war tinned food 6% (1) · pre-war biscuit packet 5% (1) · hand-crank charger 5% (1) · lighter fuel 4% (1) · pre-war painkillers 4% (1).

**Bus stand** (45 min): empty bottle 30% (1–2) · scrap metal 30% (1–2) · cloth rags 15% (1) · pre-war biscuit packet 10% (1–2) · groundnuts 5% (1) · pre-war tinned food 4% (1) · lighter fuel 3% (1).

**Airport** (60 min): scrap metal 40% (1–3) · empty bottle 25% (1–2) · cloth rags 15% (1) · pre-war biscuit packet 10% (1–2) · pre-war tinned food 8% (1–2) · hand-crank charger 6% (1) · lighter fuel 5% (1) · pre-war painkillers 4% (1).

## Water outside towns

- **Wells:** the 39 wells mapped in OpenStreetMap inside the prototype area are added to the world map as **clean** water points (D-050).
- **Ponds, tanks and lakes:** those already on the world map stay as they are, with unsafe water (D-044).
- **Home:** no well is added there. Canon says the settlement has little clean water (§4), and home gives nothing until trading exists (D-046).

## Saves

Town maps add Prabu's position inside a town, plus stock and floor piles for each building. That needs save v5 with a migration:
- Old stock for the three towns is dropped.
- Their ground piles move to the town's entrance.

## Town map screen

Removed by D-099: the town's buildings are on the world map (`docs/ui.md`, Map screen).
