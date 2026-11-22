# World and geography

What is confirmed about where the prototype takes place, and the approved prototype sites.
The canon (timeline, Prabu, the family) lives in CLAUDE.md §3–§4 and is not repeated here.

## Confirmed

| ID | Decision |
|---|---|
| D-002 | Tamil Nadu only, real geography, one continuous map. |
| D-008 | The prototype is set in **Madurai and the dry south**. The whole state is still rendered. |
| D-009 | Prabu can travel to any point. Roads are faster; cross-country is slower and (from M6) riskier. M1 treats cross-country as uniform ground. |
| D-010 | Travel resolves in legs: each leg is instant with a short marker animation, the clock jumps by the leg's time, and travel can be interrupted between legs. |
| D-011 | The settlement is in the **Western Ghats foothills west of Srivilliputhur** (Virudhunagar district), beside the Grizzled Squirrel Wildlife Sanctuary. |
| D-012 | Prototype area: **~25 km radius** around the settlement, plus **Madurai city ruins (~75–80 km)** as the single distant destination. |
| D-013 | Discoverable places cover **Madurai city ruins, water sources, hunting grounds, and roads/rail/airport**. |
| D-014 | Madurai was **not struck directly**: standing, decayed ruins, with **scattered low-level fallout patches** across the region. |
| D-015 | The prototype sites below are approved (was P-008). |
| D-017 | At the start Prabu already knows sites 0–4 below; sites 5–7 must be discovered. |
| D-018 | Fog clears in a ~3 km sight radius along his path; sites inside it are discovered. |
| D-019 | Walking speeds: road 4.5 km/h, cross-country 3 km/h. |
| D-025 | (answers Q9) Heavy fallout lies in **northern Tamil Nadu**, outside the prototype area. *(Refined by D-043.)* |
| D-043 | Radiation zone: every point within **30 km of the line from Trichy to Villupuram**. **Madurai has no radiation** (this replaces D-014's patches), and neither does the prototype area. |
| D-044 | Water can be collected at any lake, tank, pond, reservoir or river; only flowing rivers give clean water. |
| D-029 | Most animals are affected by radiation and many are mutated, in the spirit of Fallout. |
| D-021 | The settlement sits at the sanctuary's **north-east forest edge, ~6 km north-west of Srivilliputhur town** (9.5599, 77.6251), not at Shenbagathoppu. The OSM data showed Shenbagathoppu was nearer Rajapalayam than the town, which clashed with D-017. The hunting ground is the sanctuary forest next to it, and the water site is the Pilavakkal (Periyar) dam. |

### Why these fit together
- Prabu is the settlement's hunter, and the sanctuary forest is on his doorstep.
- The drought/famine canon shows in the dry tanks and the failing Pilavakkal reservoir.
- Madurai is the big, dangerous, rewarding trip that pulls the player outward.

## Prototype sites — D-015 (approved), placed per D-021

Coordinates come from OpenStreetMap and live in `src/content/data/sites.json`. Distance is straight-line from home. Walking time is the game's own route: the fastest mix of road and cross-country at D-019 speeds.

| # | Site (game name) | Kind | Lat, lon | Distance | Walk | Known at start |
|---|---|---|---|---|---|---|
| 0 | Home | Home | 9.5599, 77.6251 | — | — | yes |
| 1 | Sanctuary forest (Grizzled Squirrel Wildlife Sanctuary) | Hunting ground | 9.5793, 77.6137 | 2.5 km | 50 min | yes |
| 2 | Srivilliputhur town ruins | Ruins | 9.5081, 77.6336 | 5.8 km | 1 h 42 min | yes |
| 3 | Srivilliputhur railway station | Rail | 9.4978, 77.6451 | 7.2 km | 2 h 12 min | yes |
| 4 | NH 744 highway (Srivilliputhur–Rajapalayam stretch) | Road | 9.4820, 77.5897 | 9.5 km | 2 h 56 min | yes |
| 5 | Pilavakkal dam (Periyar dam, Watrap) | Water | 9.6412, 77.5262 | 14.1 km | 4 h 42 min | no |
| 6 | Rajapalayam town ruins | Ruins | 9.4456, 77.5543 | 14.9 km | 4 h 19 min | no |
| 7 | Madurai city ruins (the airport is on the city's south side) | City ruins | 9.9261, 78.1141 | 67 km | 17 h 33 min | no |

That makes 7 discoverable places plus home, settling the locations part of P-001. Everything except Madurai is within the 25 km radius (D-012).

### Not decided (owner only)
- Safe zones, hostile territories and any other settlements in the area: none are proposed here.
- Names of the settlement and of Prabu's family.

## Sources
- Site coordinates, roads and rail: © OpenStreetMap contributors (ODbL), queried in Nov 2026; see `scripts/geo/`.
- State outline: Natural Earth 1:10m admin-1 (public domain).
- Srivilliputtur / Grizzled Squirrel Wildlife Sanctuary: https://en.wikipedia.org/wiki/Grizzled_Squirrel_Wildlife_Sanctuary
- Shenbagathoppu trail distances: https://trektamilnadu.com/trail/shenbagathoppu-wpudhupatti-1
- NH 744 route (Rajapalayam – Srivilliputtur – T. Kallupatti – Tirumangalam): https://en.wikipedia.org/wiki/National_Highway_744_(India)
- Srivilliputtur railway station: https://en.wikipedia.org/wiki/Srivilliputtur_railway_station
- Pilavakkal dam, Watrap: https://www.nativeplanet.com/srivilliputhur/attractions/pilavakkal
- Watrap Periakulam (BirdLife IBA): https://datazone.birdlife.org/site/factsheet/watrap-periakulam-and-virakasamuthrakulam-iba-india
