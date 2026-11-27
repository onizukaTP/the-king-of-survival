# Items — approved (D-026, was P-010)

The owner approved this list, with the starting kit, unsafe-water illness and spoilage rules added (D-026 to D-028). The numbers at the end are approved (D-036), with the owner's change to the carry limit.
Effects use the survival meters from D-023 (0–100) and the drain rates proposed in P-011; they are starting values for the balance pass (M9).

**Prototype?** ✓ = in the prototype (32 items: the 28 approved (earlier miscounted as 29), the three starting-kit items from D-026, and lighter fuel from D-037). *Later* = good fit, but not needed yet.

## Food

| ID | Item | Effect | Where it comes from | Prototype? |
|---|---|---|---|---|
| item.raw_meat | Raw meat | Must be cooked first | Hunting in the sanctuary forest | ✓ |
| item.cooked_meat | Cooked meat | Food +30 | Crafted: raw meat + firewood, needs flint | ✓ |
| item.dried_meat | Salted dried meat (uppu kandam) | Food +20; light to carry | Crafted: raw meat + salt | ✓ |
| item.millet | Millet grain (kambu / ragi) | Must be cooked first | Scavenged in town ruins, home stores | ✓ |
| item.millet_porridge | Millet porridge (koozh) | Food +25, Water +10 | Crafted: millet + water, needs pot | ✓ |
| item.tender_coconut | Tender coconut | Food +5, Water +20 | Found near Rajapalayam / the dam | ✓ |
| item.tinned_food | Pre-war tinned food | Food +30 | Scavenged in ruins (27 years old) | ✓ |
| item.salt | Salt | Ingredient | Scavenged | ✓ |
| item.palmyra_fruit | Palmyra fruit (nungu) | Food +10, Water +10 | Palmyra palms in the dry plains | Later |
| item.tamarind | Tamarind | Food +5; ingredient | Tamarind trees along roads | Later |
| item.wild_honey | Wild honey | Food +15, Health +5 | Forest | Later |

## Water

| ID | Item | Effect | Where it comes from | Prototype? |
|---|---|---|---|---|
| item.empty_bottle | Empty bottle | Fill it at a water source | Scavenged anywhere | ✓ |
| item.unsafe_water | Bottle of unsafe water | Water +25; may make him sick (D-027) | Filled at the dam or a tank | ✓ |
| item.boiled_water | Bottle of boiled water | Water +25 | Crafted: unsafe water + firewood, needs pot | ✓ |
| item.clay_pot | Clay water pot (mann paanai) | Holds 4 bottles' worth; heavy, can break | Village ruins | Later |

## Medical

| ID | Item | Effect | Where it comes from | Prototype? |
|---|---|---|---|---|
| item.cloth_bandage | Cloth bandage | Health +10 | Crafted: cloth rags | ✓ |
| item.neem_leaves | Neem leaves | Ingredient | Neem trees, everywhere | ✓ |
| item.neem_paste | Neem–turmeric paste | Health +15 | Crafted: neem leaves (+ turmeric if found) | ✓ |
| item.old_pills | Pre-war painkillers | Health +20 | Rare in town ruins, the station | ✓ |
| item.iodine_tablets | Iodine tablets | Radiation protection (needs the radiation rule) | Rare, Madurai | Later (Q9) |

## Materials (for crafting)

| ID | Item | Used for | Where it comes from | Prototype? |
|---|---|---|---|---|
| item.firewood | Firewood | Cooking, boiling water | Forest, anywhere wooded | ✓ |
| item.bamboo | Bamboo | Spear, bow, cart frame | Forest | ✓ |
| item.scrap_metal | Scrap metal | Blades, arrowheads, repairs | Ruins, highway, station | ✓ |
| item.cloth | Cloth rags | Bandages, bags | Ruins | ✓ |
| item.coir_rope | Coir rope | Bow string, bindings | Ruins, coconut groves | ✓ |
| item.animal_hide | Animal hide | Bags, later armour | Hunting | ✓ |
| item.bone | Bone | Arrowheads, tools | Hunting | Later |
| item.rubber_tube | Rubber inner tube | Slingshot, vehicle repair | Highway wrecks | Later |
| item.plastic_sheet | Plastic sheet | Shelter, water catching | Ruins | Later |

## Tools and weapons

| ID | Item | Use | Where it comes from | Prototype? |
|---|---|---|---|---|
| item.hunting_knife | Hunting knife | Melee; skinning | Starting kit (D-026) | ✓ |
| item.aruval | Aruval (billhook) | Heavy melee; clearing brush | Village ruins | ✓ |
| item.bamboo_spear | Bamboo spear | Melee with reach | Crafted: bamboo + scrap metal | ✓ |
| item.bow | Bamboo bow | Ranged; needs arrows | Crafted: bamboo + coir rope | ✓ |
| item.arrow | Arrows | Ammo for the bow | Crafted: bamboo + scrap metal | ✓ |
| item.flint | Flint and steel | Makes fire; never runs out | Scavenged | ✓ |
| item.lighter | Lighter | Makes fire; uses fuel | Starting kit, half full (D-026) | ✓ |
| item.torch | Torch | Faster searching, day and night (D-037); uses battery | Starting kit, half charged (D-026) | ✓ |
| item.lighter_fuel | Lighter fuel | Refills the lighter | Scavenged, rare (D-037) | ✓ |
| item.crank_charger | Charger / hand-crank charger | Recharges the torch | Scavenged | ✓ |
| item.cooking_pot | Cooking pot | Needed to cook and boil | Home / ruins | ✓ |
| item.slingshot | Slingshot (kavan) | Quiet ranged; small game | Crafted: wood + rubber tube | Later |
| item.lathi | Bamboo staff (silambam) | Melee, defensive | Crafted: bamboo | Later |
| item.country_gun | Country-made gun (naatu thuppakki) + shot | Loud, strong, slow to reload | Rare | Later |
| item.sleeping_mat | Grass sleeping mat (korai paai) | Rest recovers faster | Village ruins | Later |
| item.jute_sack | Jute sack | Raises carry limit | Ruins | Later |

## Vehicle parts and fuel (D-031 to D-034, D-036; built in M10)

**M10 (D-085, D-087):** only the can of biodiesel is built (material, 5 kg, 5 litres). The cycle parts and engine parts are dropped: a cycle is found whole, and repairs use scrap metal. **Charms** (D-088): 13 charm items, 0.05 kg each, in `docs/charms.md`. That makes 51 items.

| ID | Item | Use | Where it comes from |
|---|---|---|---|
| item.biodiesel | Can of biodiesel | Fuel for the auto-rickshaw (and generators, later) | Scavenged in towns and on the highway (D-032) |
| item.cycle_frame | Cycle frame | Part to build a cycle | Ruins (rare) |
| item.cycle_wheel | Cycle wheel | Part to build a cycle (two needed) | Ruins |
| item.cycle_chain | Cycle chain | Part to build a cycle | Ruins |
| item.engine_parts | Engine parts | Repairs the auto-rickshaw | Highway wrecks, the station (rare) |

Later: tyre, spark plug, battery, generator (very rare, D-032).

**Added by D-057** (fire and cooking, `docs/fire.md`): matchbox (tool, 0.02 kg, 10 matches, found with 3–10), can opener (tool, 0.1 kg, rare; needed to eat tinned food, D-056), sterilized bandage (medical, 0.1 kg, treats an injury, Health +20; made by boiling rags). Cooked meat and clean water are now made over a fire (`docs/fire.md`), replacing the "needs flint" and "+ firewood" notes above. **Added by D-058** (crafting, `docs/crafting.md`): turmeric (medical ingredient, 0.1 kg) and neem–turmeric paste (treats an injury, Health +25); the old neem–turmeric paste item is renamed neem paste (Health +15). That makes 37 items.

## Numbers — D-036 (approved P-012)

**Carry limit on foot:** 25 kg without penalty, 50 kg at most; picking up past 50 kg is refused. Above 25 kg, Food, Water and Rest drain faster, gradually: ×1 at 25 kg, ×1.5 at 37.5 kg, ×2 at 50 kg. Carts and vehicles will add cargo space.

**Weights (kg)** *(redone by D-098, 2026-11-27: see below)*: raw meat 1 · cooked meat 0.5 · dried meat 0.2 · millet 1 · porridge 0.5 · tender coconut 1.5 · tinned food 0.4 · salt 0.5 · empty bottle 0.1 · water bottle (either) 1.1 · bandage 0.1 · neem leaves 0.1 · neem paste 0.2 · pills 0.05 · firewood 2 · bamboo 1.5 · scrap metal 1 · cloth 0.2 · coir rope 0.5 · animal hide 2 · hunting knife 0.3 · aruval 0.8 · bamboo spear 1.2 · bow 0.8 · arrow 0.05 · flint 0.1 · cooking pot 1 · lighter 0.05 · torch 0.3 · lighter fuel 0.1 · charger 0.4.

**Spoilage (D-028, merciful):** raw meat 3 days · cooked meat 5 days · millet porridge 2 days · tender coconut 10 days. Everything else keeps. Spoiled food disappears with a message.

**Unsafe water (D-027):** each drink has a 20% chance of a stomach illness that lasts 24 hours. While ill, Water drains twice as fast. Boiled water is always safe.

**Injuries (D-039):** a cloth bandage or neem–turmeric paste cures an injury; painkillers only restore Health.

**Lighter and torch:** the lighter holds 20 lights and starts with 10; each cooking or boiling uses one. The torch battery starts at 50%; cranking the charger for 30 minutes adds 25%. A can of lighter fuel refills the lighter to 20.

**Equip:** one weapon slot; the hunting knife starts equipped.

## Weights and new foods — D-098 (owner, 2026-11-27)

**New weights (kg):** raw meat 0.5 · cooked meat 0.4 · millet 0.5 · tender coconut 1.2 · salt 0.1 · empty bottle 0.05 · water bottle (either) 1.05 · neem leaves 0.05 · turmeric 0.05 · neem paste 0.1 · neem–turmeric paste 0.1 · firewood 1.5 · cloth rags 0.1 · animal hide 1.5 · hunting knife 0.5 · aruval 1 · can opener 0.05 · cooking pot 0.8 · torch 0.25. Every other item keeps its weight. The starting kit weighs 0.8 kg.

| Item | How it's eaten | Gives | Weight | Spoils |
|---|---|---|---|---|
| Rice | Cooked at a fire with the cooking pot and a bottle of water (up to 2, 30 min) | Cooked rice: Food +50 | 0.5 kg (cooked 0.5 kg) | Cooked rice after 1 day |
| Jaggery | As it is | Food +10 | 0.2 kg | Never |
| Pre-war biscuit packet | As it is | Food +20 | 0.1 kg | Never |
| Groundnuts | As they are | Food +15 | 0.2 kg | Never |
| Wild jackfruit | Opened with the hunting knife (in hand or in the pack) | Food +40 | 2 kg | 3 days |
| Wild honey | As it is | Food +20, Health +10 | 0.3 kg | Never |

Where each is found is in the loot tables (`docs/scavenging.md`, `docs/towns.md`). That makes 58 items.

## Fishing and moss — D-100 (owner, 2026-11-27)

| Item | Kind | Weight | Effect | Spoils | How you get it |
|---|---|---|---|---|---|
| Raw fish | Food | 0.3 kg | Cook it first | 1 day | Fishing |
| Cooked fish | Food | 0.25 kg | Food +25 | 2 days | At a fire (up to 3, 30 min) |
| Moss | Medical | 0.05 kg | Treats an injury, Health +5 | 2 days | Gathering moss at water |
| Moss gauze | Medical | 0.1 kg | Treats an injury, Health +30, stops bleeding in a fight | 5 days | Craft: 2 moss + 1 cloth bandage, 10 min |
| Fishing rod | Tool | 0.5 kg | Fishing 50% instead of 20% with a spear | Never | Craft: 1 bamboo + 1 coir rope + 1 scrap metal, 20 min |

That makes 63 items.

