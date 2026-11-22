# Scavenging (M4) — proposal P-013, awaiting owner approval

Builds on D-013 (place kinds), D-014/D-025 (fallout only in Madurai), D-026 (items), D-033 (drop chances, place-specific finds, scavengers got there first), D-035 (survival) and D-037 (torch makes searching faster). Nothing here is built until approved. All numbers are starting values for the balance pass (M9) and live in data.

## Actions at a place

Shown in the place panel when Prabu is at a site (not on unmarked ground).

| Action | Where | Time | What happens |
|---|---|---|---|
| **Search** | Every site except home | 1 h | Two draws from the site's loot table (below). |
| **Search with torch** | Same, if the torch has charge | 45 min | Same draws, 25% faster; uses 10% of the torch battery (D-037). |
| **Hunt** | Sanctuary forest | 2 h | 40% chance of raw meat ×2–3; 30% chance of animal hide. No fight yet: dangerous encounters arrive with events and combat (M6/M7). |
| **Fill bottles** | Pilavakkal dam | 5 min per bottle | Every empty bottle becomes a bottle of unsafe water. |
| **Drink from the source** | Pilavakkal dam | 10 min | Water to 100, with the same 1-in-5 illness chance as unsafe water (D-027). |

Time passes through the same survival clock as travel and rest.

## How a search works

- Each **draw** picks from the site's table: every entry has a chance and a quantity range; the first entry that hits is found.
- **Depletion (D-033, "scavengers got there first"):** each site has a richness from 100% down to 10%. Every search lowers it by 10 points, and every chance is multiplied by it. It recovers each day by the site's regrowth rate (forests and the dam quickly, ruins barely).
- Found items go straight into the pack. Anything that would take the load past 50 kg is left behind, with a message.
- The result shows in the panel: "Found: scrap metal ×2, empty bottle" or "Found nothing."
- Draws use the seeded RNG, so a save always replays the same way.

## Loot tables (chance per draw, quantity)

**Sanctuary forest** (regrows 20%/day): firewood 55% (1–2) · bamboo 35% (1) · neem leaves 30% (1–3).

**Srivilliputhur town ruins** (regrows 2%/day): cloth rags 25% (1–2) · scrap metal 25% (1–2) · empty bottle 20% (1) · coir rope 10% (1) · tinned food 8% (1) · millet 6% (1) · salt 6% (1) · flint and steel 4% · cooking pot 4% · aruval 3% · pre-war painkillers 3% · lighter fuel 2% · hand-crank charger 2%.

**Srivilliputhur railway station** (regrows 2%/day): scrap metal 40% (1–3) · cloth rags 15% (1) · empty bottle 15% (1) · coir rope 10% (1) · tinned food 5% (1) · pre-war painkillers 3% · lighter fuel 3% · hand-crank charger 3%.

**NH 744 highway** (regrows 2%/day; wrecks): scrap metal 40% (1–2) · empty bottle 20% (1) · cloth rags 12% (1) · tinned food 6% (1) · lighter fuel 4%.

**Pilavakkal dam** (regrows 20%/day): tender coconut 25% (1–2) · firewood 25% (1) · neem leaves 15% (1–2). Plus Fill bottles and Drink.

**Rajapalayam town ruins** (regrows 2%/day; a bigger town, a little richer): cloth rags 30% (1–3) · scrap metal 25% (1–2) · empty bottle 20% (1–2) · tinned food 10% (1) · millet 8% (1) · salt 6% · coir rope 8% · cooking pot 5% · aruval 4% · pre-war painkillers 4% · lighter fuel 3% · hand-crank charger 2% · tender coconut 6%.

**Madurai city ruins** (regrows 1%/day; richest, with fallout): tinned food 15% (1–2) · scrap metal 35% (1–3) · empty bottle 25% (1–2) · cloth rags 25% (1–2) · pre-war painkillers 8% · cooking pot 6% · aruval 5% · hand-crank charger 5% · lighter fuel 5% · flint and steel 4%.

**Home:** nothing to search (see question 1).

## Radiation in Madurai (D-014, D-025, D-035)

- Each search in Madurai has a 25% chance of crossing a fallout patch: +5 radiation.
- Radiation lowers **maximum** Health one for one (D-035). It shows on the Health meter as a dark end segment, and Health can't heal past the new maximum.
- Nothing removes radiation yet (iodine tablets are a "later" item).
- Patches are not placed on the map: they're spread through the ruins, so every search there carries the risk.

## Questions for the owner

1. **Home:** nothing to search at home, or can Prabu draw on the settlement's stores (food, water)? The settlement's shortages are canon, but what it gives him isn't decided.
2. **Hunting before combat:** is a chance-based Hunt acceptable until combat (M7) makes it a fight?
3. **Radiation:** +5 maximum-Health loss per bad search, 1 in 4 searches; acceptable?
4. **Leftovers past 50 kg:** left behind automatically (proposed), or a choice of what to take?
