# Town maps and water at places (P-014) — proposed, awaiting approval

Confirmed by the owner: every town has its own map with buildings to scavenge (D-049), a hand-made layout with real landmarks where they exist; ponds, lakes and wells sit at places, and **well water is clean** (D-050). M2–M4 wait for town maps before release (D-051).

Everything below is a proposal.

## Which places get a town map

| Place | Town map? | Why |
|---|---|---|
| Srivilliputhur town ruins | Yes, 10 buildings | Town |
| Rajapalayam town ruins | Yes, 12 buildings | Bigger town |
| Madurai city ruins | Yes, 18 buildings | City |
| Home, sanctuary forest, railway station, NH 744, Pilavakkal dam | No | Single spots; they keep Search / Hunt as built in M4 |

**Open question:** Madurai's airport (D-015) is not one of the six building types. Options: leave it out until it has its own type and loot (recommended), or add "airport" as a seventh type now.

## How it plays

1. At a town, the Here panel gets **Enter town**. It costs no time.
2. The world map is replaced by the **town map**. The top bar stays the same: clock, meters, Pack, Rest and Menu.
3. **Moving** inside the town works like the world map: click a building to select it, then click it again to walk there. Walking takes the straight-line distance at road speed (4.5 km/h, D-019), so about 5 minutes for 400 m. Survival drains as on any trip.
4. At a building, the panel shows **Search** (time by type, below) and the "Left to find" stock. Finds and drops work as in M4: tick what to take, and the rest stays on the floor of that building for 96 hours (D-045).
5. At a well or a tank: **Fill bottles** and **Drink**, as in M4. A well gives clean water; a tank or pond gives unsafe water (D-044, D-050).
6. **Leave town** puts Prabu back on the world map at the town's point.

All buildings in a town are visible as soon as Prabu enters; there is no fog inside towns.

## Buildings in each town

Layouts are drawn at real scale on the real town's footprint. Positions are real coordinates (lat/lon) so walking distances are true. Named landmarks are real places; the other buildings are typical ones, placed on real streets.

| Building type | Srivilliputhur | Rajapalayam | Madurai |
|---|---|---|---|
| Temple | 2 (one is the Andal temple, real) | 2 | 2 (one is the Meenakshi Amman temple, real) |
| Garage | 1 | 2 | 3 |
| Supermarket | 1 | 1 | 3 |
| Medical store | 1 | 2 | 2 |
| Apartment block | 1 | 1 | 4 |
| Independent house | 4 | 4 | 4 |
| **Total** | **10** | **12** | **18** |
| Wells (clean) | 1 | 2 | 2 |
| Tanks / ponds (unsafe) | 1 | 1 | 1 |

## Search time and stock by building type

| Type | Search | With torch (5%) | Stock lost per search |
|---|---|---|---|
| Independent house | 30 min | 25 min | 25 points |
| Medical store | 30 min | 25 min | 25 points |
| Temple | 45 min | 35 min | 20 points |
| Garage | 45 min | 35 min | 20 points |
| Supermarket | 1 h | 45 min | 15 points |
| Apartment block | 1 h | 45 min | 15 points |

Each building has its own stock. The other rules are the same as M4: stock never falls below 10%, and it refills completely 7 days after the building is first searched (D-047). Each search makes 2 draws.

## Loot tables by building type

Chance per draw and the quantity found. Uses only the approved items (`docs/items.md`). Items marked rare are rare because scavengers got there first (D-033).

**Independent house**
| Item | Chance | Qty |
|---|---|---|
| Cloth | 30% | 1–2 |
| Empty bottle | 20% | 1 |
| Coir rope | 10% | 1 |
| Millet | 8% | 1 |
| Salt | 8% | 1 |
| Cooking pot | 6% | 1 |
| Tinned food | 6% | 1 |
| Pre-war painkillers | 4% | 1 |
| Aruval | 3% | 1 |
| Flint and steel | 2% | 1 |
| Lighter fuel | 2% | 1 |

**Apartment block**
| Item | Chance | Qty |
|---|---|---|
| Cloth | 30% | 1–3 |
| Empty bottle | 25% | 1–2 |
| Tinned food | 8% | 1 |
| Millet | 6% | 1 |
| Salt | 6% | 1 |
| Cooking pot | 5% | 1 |
| Pre-war painkillers | 5% | 1 |
| Coir rope | 5% | 1 |
| Charger / hand-crank charger | 3% | 1 |
| Lighter fuel | 3% | 1 |

**Supermarket** (picked over long ago)
| Item | Chance | Qty |
|---|---|---|
| Empty bottle | 30% | 1–3 |
| Tinned food | 15% | 1–2 |
| Millet | 10% | 1 |
| Salt | 10% | 1 |
| Cloth | 10% | 1 |
| Coir rope | 8% | 1 |
| Lighter fuel | 4% | 1 |
| Charger / hand-crank charger | 3% | 1 |
| Cooking pot | 3% | 1 |

**Medical store**
| Item | Chance | Qty |
|---|---|---|
| Pre-war painkillers | 20% | 1–2 |
| Cloth | 15% | 1 |
| Empty bottle | 15% | 1 |
| Salt | 3% | 1 |

The cloth bandage is crafted (items.md), so it is not found here.

**Garage**
| Item | Chance | Qty |
|---|---|---|
| Scrap metal | 50% | 1–3 |
| Coir rope | 15% | 1 |
| Cloth | 10% | 1 |
| Empty bottle | 10% | 1 |
| Lighter fuel | 6% | 1 |
| Charger / hand-crank charger | 5% | 1 |
| Aruval | 3% | 1 |

Vehicle parts and biodiesel join the garage table with vehicles (M10).

**Temple**
| Item | Chance | Qty |
|---|---|---|
| Cloth | 20% | 1–2 |
| Firewood | 15% | 1 |
| Neem leaves | 15% | 1–2 |
| Empty bottle | 15% | 1 |
| Tender coconut | 10% | 1 |
| Cooking pot | 6% | 1 |
| Salt | 5% | 1 |
| Flint and steel | 3% | 1 |

The town-wide Search tables that Srivilliputhur, Rajapalayam and Madurai have today are removed. Their finds move into the buildings.

## Water outside towns

- The 39 wells mapped in OpenStreetMap inside the prototype area are added to the world map as **clean** water points (D-050).
- Ponds, tanks and lakes already on the world map stay as they are (unsafe, D-044).
- No well is added at home: canon says the settlement has little clean water (§4), and home gives nothing until trading (D-046).

## Saves

Town maps add Prabu's position inside a town, plus stock and floor piles for each building. That needs save v5 with a migration. Old stock for the three towns is dropped, and their ground piles move to the town's entrance.

## Town map screen (needs layout approval, rule 6)

- **Map area:** a flat top-down plan drawn in SVG, not MapLibre. Streets are grey lines and buildings are blocks with a type icon and a short label. Wells and tanks are blue. Prabu is a marker. Searched buildings look dimmer, according to their remaining stock.
- **Side panel / bottom sheet:** the same place as on the world map. It shows the selected building (type, walking time, Left to find, Search) or the Here panel. **Leave town** sits at the top of the panel.
- **On phones:** the same layout as the world map, with the plan full screen and the panel as a bottom sheet.
