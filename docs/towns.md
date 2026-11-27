# Town maps and water at places — approved (D-052), built

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

1. **Entering:** at a town, the Here panel gets **Enter town**. Entering costs no time.
2. **The town map:** it replaces the world map. The top bar stays the same: clock, meters, Pack, Rest and Menu.
3. **Moving:** it works like the world map. Click a building to select it, then click it again to walk there. Walking uses the straight-line distance at road speed (4.5 km/h, D-019), so 400 m takes about 5 minutes. Survival drains as on any trip.
4. **At a building:** the panel shows **Search** (times below) and how much is left to find. Finds and drops work as in M4: you tick what to take, and the rest stays on that building's floor for 96 hours (D-045).
5. **At a well or a tank:** **Fill bottles** and **Drink**, as in M4. A well gives clean water; a tank or pond gives unsafe water (D-044, D-050).
6. **Leaving:** **Leave town** puts Prabu back on the world map at the town's point. He can leave **only from the edge of town** (D-053) **or from its north, south, east or west end** (D-054); elsewhere the panel says to walk to one. Leaving from an end puts him at that end on the world map. Each end is the real street point nearest to 300 m beyond the town's outermost building or water in that direction (Madurai's south end lies past the airport, about 10 km out).

All buildings in a town are visible as soon as Prabu enters. There is no fog inside towns.

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

Each entry gives the chance per draw and the quantity found. The tables use only the approved items (`docs/items.md`).
- Low chances reflect that scavengers got there first (D-033).
- The cloth bandage is crafted, so no building has it.
- Vehicle parts and biodiesel join the garage, petrol bunk and airport tables with vehicles (M10).

**Independent house:** cloth 30% (1–2) · empty bottle 20% · coir rope 10% · millet 8% · salt 8% · cooking pot 6% · tinned food 6% · painkillers 4% · aruval 3% · flint and steel 2% · lighter fuel 2%

**Apartment block:** cloth 30% (1–3) · empty bottle 25% (1–2) · tinned food 8% · millet 6% · salt 6% · cooking pot 5% · painkillers 5% · coir rope 5% · charger 3% · lighter fuel 3%

**Place of worship:** cloth 20% (1–2) · firewood 15% · neem leaves 15% (1–2) · empty bottle 15% · tender coconut 10% · cooking pot 6% · salt 5% · flint and steel 3%

**Provision store:** empty bottle 20% (1–2) · millet 20% (1–2) · salt 20% (1–2) · tinned food 10% · coir rope 8% · lighter fuel 3%

**Supermarket** (picked over long ago): empty bottle 30% (1–3) · tinned food 15% (1–2) · millet 10% · salt 10% · cloth 10% · coir rope 8% · lighter fuel 4% · charger 3% · cooking pot 3%

**Ration shop:** millet 30% (1–3) · salt 25% (1–2) · empty bottle 10% · cloth 8%

**Medical store:** painkillers 20% (1–2) · cloth 15% · empty bottle 15% · salt 3%

**Hospital:** painkillers 25% (1–2) · cloth 25% (1–3) · empty bottle 20% (1–2) · cooking pot 3% · charger 2%

**Garage:** scrap metal 50% (1–3) · coir rope 15% · cloth 10% · empty bottle 10% · lighter fuel 6% · charger 5% · aruval 3%

**Petrol bunk:** scrap metal 30% (1–2) · empty bottle 25% (1–2) · lighter fuel 12% · coir rope 8% · cloth 8% · tinned food 4%

**Hardware store:** scrap metal 35% (1–3) · coir rope 25% (1–2) · aruval 8% · cooking pot 8% · flint and steel 6% · charger 4% · lighter fuel 3%

**Textile shop / mill:** cloth 50% (1–4) · scrap metal 10% · coir rope 10% · empty bottle 8%

**Hotel / mess:** empty bottle 20% (1–2) · salt 20% · cooking pot 15% · firewood 15% · millet 12% · tinned food 5% · flint and steel 2%

**Police station:** coir rope 15% · cloth 15% · empty bottle 15% · aruval 10% · tinned food 6% · charger 5% · lighter fuel 4% · painkillers 4%

**Bus stand:** empty bottle 30% (1–2) · scrap metal 30% (1–2) · cloth 15% · tinned food 4% · lighter fuel 3%

**Airport:** scrap metal 40% (1–3) · empty bottle 25% (1–2) · cloth 15% · tinned food 8% (1–2) · charger 6% · lighter fuel 5% · painkillers 4%

The town-wide Search tables that Srivilliputhur, Rajapalayam and Madurai have today are removed, and their finds move into the buildings.

## Water outside towns

- **Wells:** the 39 wells mapped in OpenStreetMap inside the prototype area are added to the world map as **clean** water points (D-050).
- **Ponds, tanks and lakes:** those already on the world map stay as they are, with unsafe water (D-044).
- **Home:** no well is added there. Canon says the settlement has little clean water (§4), and home gives nothing until trading exists (D-046).

## Saves

Town maps add Prabu's position inside a town, plus stock and floor piles for each building. That needs save v5 with a migration:
- Old stock for the three towns is dropped.
- Their ground piles move to the town's entrance.

## Town map screen

- **Map area:** a flat top-down plan drawn in SVG, not MapLibre.
  - Streets are grey lines. Buildings are blocks with a type icon and a short label.
  - Wells and tanks are blue, and Prabu is a marker.
  - Searched buildings fade as their stock runs low.
- **Side panel / bottom sheet:** sits where it does on the world map. It shows the selected building (type, walking time, how much is left, Search) or the Here panel. **Leave town** sits at the top of the panel at the edge of town (D-053).
- **On phones:** the same layout as the world map, with the plan full screen and the panel as a bottom sheet.
