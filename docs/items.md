# Items — proposal P-010 (awaiting owner approval)

Proposed in answer to the owner's request for an item list. Nothing here is built until approved.
Effects use the survival meters from D-023 (0–100) and the drain rates proposed in P-011; they are starting values for the balance pass (M9).

**Prototype?** ✓ = proposed for the prototype (29 items, a little over P-001's ~20–25; see "If you want 25" below). *Later* = good fit, but not needed yet.

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
| item.unsafe_water | Bottle of unsafe water | Water +25 (risk: open question) | Filled at the dam or a tank | ✓ |
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
| item.hunting_knife | Hunting knife | Melee; skinning | Starting kit? (narrative: owner decides) | ✓ |
| item.aruval | Aruval (billhook) | Heavy melee; clearing brush | Village ruins | ✓ |
| item.bamboo_spear | Bamboo spear | Melee with reach | Crafted: bamboo + scrap metal | ✓ |
| item.bow | Bamboo bow | Ranged; needs arrows | Crafted: bamboo + coir rope | ✓ |
| item.arrow | Arrows | Ammo for the bow | Crafted: bamboo + scrap metal | ✓ |
| item.flint | Flint and steel | Needed to make fire | Starting kit / scavenged | ✓ |
| item.cooking_pot | Cooking pot | Needed to cook and boil | Home / ruins | ✓ |
| item.slingshot | Slingshot (kavan) | Quiet ranged; small game | Crafted: wood + rubber tube | Later |
| item.lathi | Bamboo staff (silambam) | Melee, defensive | Crafted: bamboo | Later |
| item.country_gun | Country-made gun (naatu thuppakki) + shot | Loud, strong, slow to reload | Rare | Later |
| item.sleeping_mat | Grass sleeping mat (korai paai) | Rest recovers faster | Village ruins | Later |
| item.jute_sack | Jute sack | Raises carry limit | Ruins | Later |

## Vehicle parts and fuel (only if vehicles come in; see `docs/vehicles.md`)

Tyre, inner tube, chain, spark plug, battery, engine parts, and fuel (see the fuel question).

## If you want 25

Move these four to *Later*: aruval, salt + salted dried meat (they go together), neem leaves (make neem paste a found item).
