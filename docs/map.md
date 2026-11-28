# The generated map — approved (D-102 to D-107), built as M11

The map is a real backbone with generated detail. The real outline, highways, rivers and reservoirs, the
owner's places and the kept destinations stay where they are in the real world; the towns and villages
around them, every building, the small roads, the town streets, the tanks and the land cover are
generated. **Tamil Nadu only** for now; the generator works from data files, so other states are new
backbone and highway data, not new code.

## One fixed world (D-103)

- `generator.json` holds a world seed and a generator version. The world is built when the game loads,
  the same every time (about 0.7 s): every part draws from its own seeded stream, so changing one town
  doesn't move the others.
- Changing the seed or the rules moves generated places; buildings' stock records are kept by id, so a
  change of that kind needs a save migration (as v15 did, below).

## Places

| | Count | Where from |
|---|---|---|
| Cities | 13 | The owner's list (D-104, D-105, D-107), at their real positions |
| Towns | 43 + Srivilliputhur | The owner's list; Srivilliputhur from the prototype |
| Villages | 16 | The owner's list |
| Kept destinations | Home (Kottai Nagar), the sanctuary forest, the Pilavakkal dam, the NH 744 stretch, Srivilliputhur station | `sites.json` |
| Generated towns | ~50 | 3–5 per city, 15–40 km away |
| Generated villages | ~540 | 4–8 per town (the owner's and generated), 3–12 km away |

- A generated place sits on land, at least 5 km from every other settlement (3 km from its parent) and
  2 km from the kept destinations. Names come from Tamil place-name parts (`generator.json`).
- Approximate positions (no exact match in the map data): Valliyur, Keelakarai, Manapad, Aviyur (near
  Kariapatti), Melmaruvattur.

## Buildings, streets and water

| Tier | Buildings | Main street | Side streets | Wells | Tanks |
|---|---|---|---|---|---|
| City | 25–40 | 2.6 km | 5–7 | 2–3 | 1–2 |
| Town | 10–20 | 1.6 km | 3–4 | 1–2 | 1 |
| Village | 3–8 | 0.7 km | 0–1 | 1 | 0–1 (80%) |

- Buildings are the 16 building types (`docs/towns.md`), mixed by tier, at least 100 m apart along the streets.
- **Landmarks:** Srivilliputhur, Rajapalayam and Madurai keep their named buildings at their real spots
  (`landmarks.json`, 12 in all: temples, churches, a mosque, hospitals, the spinning mill, the bus stand
  and the airport); their generic buildings are generated around them.
- **Dry wells (D-103):** 90% of wells in generated towns and villages are dry and give no water; the
  owner's places' wells are never dry. A dry well shows grey on the map, "Dry well" in the panel, and
  filling or drinking there says "The well is dry."
- Tanks sit at the edge of each place (unsafe water, D-044).
- **Water stays outside places (D-109):** a tank, pond or lake under 2 km across that any building, well or
  street touches is left out (about 25 across the state), as is a generated tank that reaches another place.
  Rivers and bigger reservoirs stay: buildings and wells keep 50 m from them, streets end at their shore,
  and generated places sit at least 300 m from them.
- Streets join the highway network when the game loads, so trips use them.

## Roads

- **Real:** the national highways and motorways across the state (OpenStreetMap), thinned to ~2 km.
- **Generated:** an owner's place more than 1 km from a highway gets a road to it; a generated town gets
  a road to the nearest highway within 30 km (or to its city), and half of them a link to their nearest
  town; every generated village gets a road to its parent. Roads bend through two jittered points.

## Loot (D-105 to D-107)

- **Scarce only in generated towns and villages:** a building there gives firewood 30% (1–2), scrap metal
  10% (1), and every other item of its type's table at one tenth of its chance.
- Every owner's place, the landmarks and the kept destinations keep normal loot.
- Open-ground searches keep their own tables everywhere (D-101).
- **First visits give 15 XP only at the owner's places** (D-107).

## Land cover (D-103)

A ~500 m grid over the whole state, aiming at 15% forest, 40% farmland, 25% scrub, 15% dry and 5%
village. Built today: 15.0% forest, 39.9% farmland, 26.1% scrub, 14.9% dry, 4.1% village.

- Forest follows the real protected forests (national parks, sanctuaries, reserve forests), then grows
  where noise allows, away from people.
- Farmland gathers round settlements and flowing rivers.
- The dry south-east (south of 10° N and east of 77.8° E) leans dry.
- Village squares are each settlement's footprint (city 5 km, town 2.6 km, village 1.2 km).

## Water

- The prototype area keeps its detailed water (tanks, ponds, the dam, its rivers and the 39 mapped wells).
- Across the rest of the state: every named flowing river (seasonal rivers left out, D-044) and every
  reservoir at least 250 m across. Smaller water elsewhere comes from the generated tanks.

## Left out for now

- **Radiation** is off (D-105, D-108): the D-043 zone around the Trichy–Villupuram line is not drawn and
  gives no radiation; its rules stay in `scavenging.json` (`off: true`).
- Countryside ponds (the generator has room for them; not built).
- No ideas from Project Zomboid (D-107).

## Map display

- Cities and the owner's places show at every zoom; generated towns from zoom 9; villages from zoom 11;
  buildings, wells and tanks from zoom 14 (street level, D-099).
- Only markers in view exist, so panning stays smooth with ~670 places and ~4,300 buildings.
- The map follows Prabu when a trip takes him out of view.
