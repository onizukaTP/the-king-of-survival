# Fire, cooking and the can opener — approved (D-057, was P-016), built and live

The owner's rules (D-056) and the numbers and screen below (D-057) are approved, built and live. Methods and recipes are data in `src/content/data/fire.json`.

## The owner's rules (D-056)

- Fire is made with a **matchbox, the lighter, flint and steel, or by rubbing two sticks** (which takes a long time).
- Over a fire Prabu can **cook raw meat, boil water, and boil cloth rags into sterilized bandages**.
- **Tinned food can't be opened without a can opener**, and can openers are rare.
- **Firewood** is the fuel. It is already in the approved item list (`item.firewood`, 2 kg) and is found in the forest (55%, 1–2), on the highway (25%) and in some buildings (15%). The owner asked for "firewood or kindling", so I propose **no separate kindling item**: firewood covers both.

## Making a fire

A fire needs **1 firewood** and one way to light it. The panel shows a button for each way he has:

| Way | Time | Uses |
|---|---|---|
| Lighter | 5 min | 1 of its 20 lights (it starts with 10) |
| Matchbox | 5 min | 1 match |
| Flint and steel | 15 min | nothing; it never runs out |
| Rubbing two sticks | 90 min | nothing, but it's hard work: Rest drains as when working |

- A fire **burns for 2 hours** where it was lit. **Add firewood** gives it 2 more hours.
- Only **one fire at a time**. Walking or travelling away leaves it to burn out.
- Fires can be lit anywhere: on the world map, and at any spot inside a town.

## At a burning fire

| Action | Needs | Time | Gives |
|---|---|---|---|
| Cook raw meat | Raw meat (up to 3 at once) | 30 min | Cooked meat (Food +30, keeps 5 days) |
| Boil water | Cooking pot; bottles of unsafe water (up to 4 at once) | 30 min | Bottles of clean water |
| Sterilize rags | Cooking pot; cloth rags (up to 3 at once); 1 bottle of water (used up) | 30 min | Sterilized bandages |
| Cook fish (D-100) | Raw fish (up to 3 at once) | 30 min | Cooked fish (Food +25, keeps 2 days) |
| Cook rice (D-098) | Cooking pot; rice (up to 2 at once); 1 bottle of water (used up) | 30 min | Cooked rice (Food +50, keeps 1 day) |

- If the fire would burn out before the action ends, he can't start it ("Add firewood first").
- This replaces the old item-list notes "cooked meat: raw meat + firewood, needs flint" and "boiled water: unsafe water + firewood, needs pot".

## New items

| ID | Item | Weight | Effect | Where it's found |
|---|---|---|---|---|
| item.matchbox | Matchbox | 0.02 kg | 10 matches when full; found with 3–10 | Houses 10%, provision stores 12%, ration shops 8%, hotels 8%, supermarkets 10% |
| item.can_opener | Can opener | 0.1 kg | Needed to eat tinned food; never wears out | Rare: houses 3%, apartment blocks 3%, hotels 4%, provision stores 3%, supermarkets 5% |
| item.sterile_bandage | Sterilized bandage | 0.1 kg | Treats an injury; Health +20 | Made by boiling rags |

- The plain **cloth bandage** stays as approved (treats an injury, Health +10) and is still made from rags without fire in M5 crafting.
- The owner also mentioned **sterilized rags**. I propose a single item, the sterilized bandage. A separate "sterilized rags" material is only worth adding if some later recipe needs it.

## Tinned food

- Without a can opener in the pack, **Eat** on tinned food is greyed out and reads "Needs a can opener".
- The can opener is kept, not used up.
- The hunting knife does **not** work as an opener (the owner's rule).

## Screen

**Here panel:** a **Fire** section under the search buttons.

- With no fire burning, it shows "Make fire", with one button per way he has (for example "Lighter (5 min)" or "Rub two sticks (90 min)"). Without firewood it says "Needs firewood".
- With a fire burning here, it shows "Fire: burns for 1 h 40 min", an **Add firewood** button, and the cooking buttons above, each with its time. Missing items show as disabled buttons with the reason.

**Pack:** tinned food shows its disabled Eat button with the reason.

## Saves and engine

- Saves go to **v6**, which adds `fire: { lat, lon, outAt } | null`. A v5 save loads with no fire.
- Commands: `fire.make { method }`, `fire.feed`, `fire.cook`, `fire.boil`, `fire.sterilize`.

## Left for later

- The fire as **light at night**, and keeping animals away, goes with P-015/M6.
- Millet porridge (pot + water + millet) and the recipes that need no fire (bandage, neem paste, spear, bow, arrows, dried meat) come with the M5 crafting proposal.
