# Crafting (M5) — approved (D-058, was P-017) and built

The owner approved this with three changes, and it is built and live (released 2026-11-22):

- **Weapon recipes** were held for M7 and are now built with it (D-066): the bamboo spear, bow and arrows below.
- **Turmeric** joins the item list (0.1 kg; about 8% in houses, provision stores, ration shops, supermarkets, hotels and places of worship). It is an optional booster: **Neem paste** (3 neem leaves, Health +15) or **Neem–turmeric paste** (3 neem leaves + 1 turmeric, Health +25). The old item `item.neem_paste` keeps its id and is now called "Neem paste".
- **Animal hide** stays for later.

Recipes are data in `src/content/data/recipes.json`; porridge is in `fire.json`.

Fire recipes are approved and built already (D-056, D-057): cooked meat, clean water and sterilized bandages. This proposal adds the rest of the recipes the item list (D-026) marks as crafted, plus a Craft panel.

## Rules

- **Craft anywhere** (P-001), on the world map or inside a town. Recipes that need a fire stay in the Here panel's Fire section, next to the fire.
- **Inputs:** a recipe uses up its inputs. A **tool** (the hunting knife, the cooking pot) is needed in the pack or the weapon slot but is kept.
- **Time:** crafting passes time like searching does, with meters draining and food spoiling.
- **Batch:** one craft makes one batch. To make more, craft again.
- **Carry limit:** a craft is refused if what it makes would take Prabu past 50 kg (D-036). No recipe here makes anything heavier than its inputs, so in practice this never happens.

## Recipes

| Recipe | Inputs | Tool | Time | Makes |
|---|---|---|---|---|
| Cloth bandage | 2 cloth rags | — | 10 min | 1 cloth bandage (treats an injury, Health +10) |
| Neem paste | 3 neem leaves | — | 15 min | 1 neem paste (treats an injury, Health +15) |
| Neem–turmeric paste | 3 neem leaves + 1 turmeric | — | 15 min | 1 neem–turmeric paste (treats an injury, Health +25) |
| Salted dried meat | 2 raw meat + 1 salt | Hunting knife | 1 h | 2 salted dried meat (Food +20, 0.2 kg, never spoils) |
| Bamboo spear | 1 bamboo + 1 scrap metal | Hunting knife | 45 min | 1 bamboo spear |
| Bamboo bow | 1 bamboo + 1 coir rope | Hunting knife | 1 h | 1 bamboo bow |
| Arrows | 1 bamboo + 1 scrap metal | Hunting knife | 30 min | 5 arrows |

**At a fire** (one more recipe, built like the approved fire recipes):

| Recipe | Inputs | Tool | Time | Makes |
|---|---|---|---|---|
| Millet porridge (koozh) | up to 2 millet + 1 bottle of water (unsafe is fine; it boils) | Cooking pot | 30 min | 1 porridge per millet (Food +25, Water +10, keeps 2 days) |

Built: **4 Craft-panel recipes** (cloth bandage, neem paste, neem–turmeric paste, dried meat) and **4 fire recipes** (cooked meat, clean water, sterilized bandage, porridge). The 3 weapon recipes come with M7.

### Notes and choices for the owner

- **Turmeric** isn't in the item list. The paste is made from neem leaves alone until turmeric is added (approved as "neem leaves (+ turmeric if found)").
- **Weapons:** the spear, the bow and the arrows can be made and equipped now, but they only matter once combat exists (M7). Hunting stays chance-based (D-046). Do you want them in M5, or held until M7?
- **Salted dried meat** turns raw meat, which spoils in 3 days, into food that keeps. Real drying takes days; 1 hour keeps it playable.
- **Animal hide** has no recipe yet. Bags and armour are marked "Later" in the item list.

## Where the inputs are found (already in the loot tables)

| Input | Found at |
|---|---|
| Cloth rags | Most buildings, the station, the highway |
| Neem leaves | Sanctuary forest, Pilavakkal dam, places of worship |
| Raw meat | Hunting in the sanctuary forest |
| Salt | Houses, apartments, shops, ration shops, hotels, temples |
| Bamboo | Sanctuary forest |
| Scrap metal | The station, the highway, garages, petrol bunks, hardware stores, mills, bus stands, the airport |
| Coir rope | The station, houses, apartments, shops, garages, hardware stores, mills, police stations |
| Millet | Houses, apartments, shops, ration shops, hotels |

## Screen

- **Top bar:** a **Craft** button next to Pack and Rest.
- **Craft panel**, in the side panel on desktop and the bottom sheet on mobile, laid out like the Pack:
  - One card per recipe, showing its name, what it makes, its inputs as "have / need" (for example "Cloth rags 1/2"), its tool, its time, and a **Craft** button.
  - A recipe he can't make yet stays in the list with its Craft button disabled and the reason ("Needs 1 more cloth rags", "Needs a hunting knife").
  - Recipes he can make now are listed first.
- Messages read like the rest of the game, for example "Made cloth bandage."

```
┌ Craft ───────────────────── × ┐
│ Cloth bandage          10 min │
│ Cloth rags 2/2                │
│ → Cloth bandage     [ Craft ] │
├───────────────────────────────┤
│ Bamboo spear           45 min │
│ Bamboo 1/1 · Scrap metal 0/1  │
│ Tool: hunting knife ✓         │
│ → Bamboo spear [Craft] (grey) │
│ Needs 1 more scrap metal      │
└───────────────────────────────┘
```

## Engine

- Recipes are data in a new `recipes.json`, validated at load.
- A new command `craft { recipeId }`. It is refused with `unknown_recipe`, `missing_item`, `too_heavy` or `travel_in_progress`, and never half-applies.
- Porridge joins `fire.json`.
- **No save change:** crafting adds no new state.
- Tests cover each recipe, every refusal, keeping the tool, time passing, and spoilage during the craft not breaking it.

## Acceptance (M5, CLAUDE.md §9)

Recipes use their inputs and produce their outputs; missing materials are clearly blocked.
