# UI

Screen layouts the owner has approved. Visual styling (the wasteland look) is a separate decision still to come; placeholder art only (D-004).

## Map screen (M1) — D-016, approved

### Desktop
- **Top bar:** game time (`Day 1 · 06:00`), Prabu's status ("At: home settlement" / "On the road"), and a **Menu** button. In M1 the menu holds only Save and Quit to title.
- **Map:** fills the rest of the screen. Unexplored land is covered by fog. Discovered places are markers, and Prabu has his own marker.
- **Side panel (right):**
  - *Place selected:* name, kind, discovered/known, distance, the road and cross-country split, total time, number of legs, and a **Travel** button.
  - *Empty ground selected:* the same panel, titled "Unmarked ground" (D-009: he can travel anywhere).
  - *Shortcut (D-022):* clicking the selected place again, or double-clicking a place or open ground, starts the trip without pressing **Travel**.
  - *Travelling:* destination, current leg ("Leg 2 of 3") with a progress bar, arrival time, and a **Stop after this leg** button (D-010).
- **No bottom navigation in M1.** P-007's Inventory, Crafting, Character and Journal buttons stay hidden until those features exist (no non-functional buttons).

### Mobile
- The map fills the screen, with a slim top bar showing time and a menu icon.
- The place and travel panel is a bottom sheet with the same contents as the desktop side panel.

## Survival meters, Pack and Rest (M2/M3) — D-041, approved from the mockup

- **Top bar** adds four small bars, Health, Food, Water and Rest (amber at 25 or below, red label at 0; the exact value shows on hover), a **Pack** button showing the carried weight, a **Rest** button, and an "Ill" or "Injured" tag when they apply. The Menu now holds **Save and quit** (the game saves itself, D-038).
- **Pack** opens in the side panel / bottom sheet: weight against 25 kg with marks at 25 and 50 kg and "Heavy: drains ×1.1 on the road" above 25 kg; the weapon slot with Unequip; items grouped as Food, Water, Medical, Weapons, Tools, Materials, with count, time left before spoiling, lighter lights or torch charge, and weight. Selecting an item shows a card with its effect and Eat / Drink / Use, Equip, Drop 1 and Drop all, each shown only when it does something.
- **Pack additions (D-055):** a **Sort** menu (by kind, the grouped view; by name; by weight, heaviest first; by price waits for trading). Items that can be eaten, drunk or used carry an **Eat / Drink / Use** button on their row, and **double-clicking a row uses it**.
- **Rest** (not in the mockup; added in the same style): the Rest meter, whether Health will recover, and buttons for 1 hour, 4 hours and "Until rested" with the wake-up time.
- **Game over** (not in the mockup): "Prabu has died", the cause and time, and Back to title.
- **Title:** with a run in progress, New Game first asks "Your current run will be lost." with Start a new run / Keep my run.
- **Phones:** the top bar wraps to three rows: clock and buttons, then status, then the four meters.

## Here panel and map additions (M4) — D-047

- **Here panel** (the side panel when nothing is selected; on a phone, tap Prabu's marker or the place he stands at): place name and kind (or "Open ground" with coordinates), a line when there's water (clean river or unsafe still water), a warning inside the radiation zone, and buttons for Search, Search with torch, Hunt, Fill N bottles and Drink, each shown only where it works, with its time. "Left to find: N%" for searchable places. "On the ground" lists finds and dropped items with a checkbox each, the time before they're gone, Take selected and Take all.
- **Map:** still water in dark blue, flowing rivers in bright blue, and the radiation zone in yellow with a dashed edge and a radiation icon in the middle. Prabu's marker sits above place markers and can be clicked.
- **Top bar:** an "Irradiated" tag, and the Health meter shows the part lost to radiation as a dark end segment.

## Town map (M4b) — D-052

- **Entering:** at a town, the Here panel has **Enter town**. The world map is replaced by the town plan; the top bar is unchanged and the status reads "In <town>: <building>".
- **The plan:** real streets in grey, buildings as tan squares, wells light blue, the tank dark blue, the edge of town as a grey diamond, Prabu as the blue dot. Searched buildings fade. +/− buttons, wheel zoom and drag to pan.
- **Selecting and walking:** click a building to see it in the side panel (type, distance, walk time, search time, left to find, **Walk there**). Click it again to walk. Clicking where Prabu stands opens the Here panel.
- **Here panel in a town:** the building's search buttons, water at a well or tank, floor piles, and **Leave town** at the top when he stands at the edge of town (elsewhere a line says to walk to the edge, D-053).
- **Mobile:** the plan full screen, the panel as a bottom sheet, as on the world map.
- **World map:** mapped wells show as small light-blue dots.

- **Town ends and zoom (D-054):** the north, south, east and west ends are grey diamonds like the edge; Leave town shows at any of them. Zooming out stops once the whole town fits, and panning keeps the view over the town.

## Fire section (D-056, D-057)

- The **Here panel** has a **Fire** section, below the search and water buttons.
  - With no fire here, it shows one button per way he has to light one ("Light with lighter (5 min)", "Light with matchbox (5 min)", "Light with flint and steel (15 min)", "Rub two sticks (1 h 30 min)"), or "Needs firewood to make a fire."
  - With a fire here, it shows "Burns for …", **Add firewood (+2 h)**, and Cook raw meat, Boil water and Sterilize rags with their batch and time. A recipe he can't do now is disabled with the reason ("Needs a cooking pot", "Add firewood first").
- **Pack:** tinned food's Eat button is disabled without a can opener, with "Needs a can opener" on hover and in its card.

## Craft panel (M5) — D-058

- **Top bar:** a **Craft** button between Pack and Rest.
- **Craft panel** (side panel / bottom sheet): one card per recipe with name, time, inputs as have/need ("Cloth rags 1/2"), the tool with ✓ or ✗, the output and a **Craft** button. Recipes he can make now come first; the rest have the button disabled and the reason ("Needs 1 more cloth rags", "Needs a hunting knife"). A line points to the Fire section for cooking.

## Events, conditions and night (M6) — D-059 to D-061

- **Event card:** a card in the middle of the screen over a dimmed map on desktop, a bottom sheet on phones. Title, game time and text, then one button per choice. A choice that needs something shows its tag in brackets (**[Meat] Throw them the meat**); if he lacks it, the button is disabled with the reason under it ("Needs raw meat or cooked meat"). After a choice: the outcome in bold, a list of what changed (Health −15, Injured, Shaken, Found: coir rope, 30 min passed), and **Continue**. It can't be closed without choosing. A trip waits while it is open.
- **Condition tags** in the top bar after Ill / Injured / Irradiated: amber for bad, green for Well rested. Hovering or tapping one shows what it does and the time left.
- **Night tag** next to the status at night: "● Dark night" or "○ Full moon".
- **Dark-trip warning** in the place panel, above Travel, when the trip would run into the dark with too little torch charge.
- Trip and walk times in the panels include a sprained ankle's slower pace.

## Combat screen (D-069) and Stats

The four-rank battlefield replaced the band screen (D-067's columns) on 2026-11-24. The full description is in `docs/combat.md` → "The screen". In short:
- **Battlefield:** Prabu's ranks 4 → 1 on the left, the enemy's ranks 1 → 4 on the right. Fighters show placeholder figures, health, status badges, Death's Door, a turn outline and floating numbers.
- **Turn queue** across the top.
- **Acting character's card** with live stats.
- **Ability buttons:** each shows its hit chance and usable ranks, or the reason it's disabled. Choosing one highlights the valid targets; abilities on himself or on everyone in their ranks go at once.
- **Other actions:** Move forward and back, Pass, Use item, Flee.
- **The log**, and a result card at the end.

- **Stats block** in the Pack under the weapon slot: the damage roll, then ATK, DEF, SPD, Crit, Crit dmg, ACC, Dodge, the six resistances, Hunting and Luck.
- **Later:** more skills for Prabu and his team (D-067).
- **Test button (D-068):** only with `?debug=1` in the address, a **Test** button in the top bar opens a Test panel:
  - **Event:** pick any event and open its card.
  - **Start an ambush.**
  - **Fight:** how many of each enemy (0–4), whether it's an ambush, then Start fight.
  - **Jump to 22:00.**
  - **Items** (owner, 2026-11-26): give any item except charms, 1–100 at a time (past 50 kg the rest goes on the ground).
  - **Charms** (owner, 2026-11-26): give any one charm, or one of every charm.
  - **Vehicles** (owner, 2026-11-26): park any vehicle here in full repair with a full tank; while riding, set its durability and fuel.
  - Every list (events, enemies, items, charms, vehicles) is in **alphabetical order** (owner, 2026-11-26).

## Intro and Journal (M8) — D-076

- **Intro:** after New Game, before the map. The owner's five screens over one muted placeholder image (an eclipse), one at a time, with a page count, **Skip** and **Next** (**Begin** on the last). It shows once per run. The message line then reads "Day 1, midday. The eclipse is passing."
- **Journal button** in the top bar after Rest. The Journal panel (side panel / bottom sheet): Level and XP to the next level, **Find my sister** with its text, **My mother's wish** as three lines, and the notes, newest first, each with its day and time.
- **Player panel** (moved there on 2026-11-26): a "Level 2 · 130 / 250 XP" line under his name.
- **Message line:** XP gained ("+15 XP.") and level-ups ("Level 3: ACC +3, Dodge +2.").

## Item tooltips (owner, 2026-11-25)

- Every item name shows a tooltip on hover: name, effects, weapon damage, bonuses and abilities, charge, what it needs, spoiling time and weight, all from the item data. Inline names have a dotted underline. They are the browser's own tooltips, so touch screens don't show them; the Pack's item card still gives the same facts on a tap.
- **Cooking** (D-090): items a fire recipe uses say how, from the recipe: "At a fire: makes cooked meat", "At a fire with a cooking pot and a bottle of water: makes millet porridge".

## Vehicles (M10) — D-089, approved

- **Vehicle button** in the top bar after Pack, shown once he owns a vehicle: "Vehicle: Cycle 72%" while riding (durability), or just "Vehicle".
- **Vehicle panel:** what he rides with durability (a bar, yellow at 25 or below), fuel, cargo against capacity and speeds; **Get off**, **Repair** ("Repair: 2 scrap metal → 100, 1 h", disabled with the reason) and **Refuel** for the auto; the cargo with Unload (all or 1); the pack with Load (all or 1); vehicles here with Get on; vehicles parked elsewhere with their distance.
- **Here panel:** "Vehicles here" with Get on; on the ground, **Load into cargo** (selected or all) while riding.
- **Trip panel and trip preview:** a "By" row (the vehicle, or On foot) and a warning when it is wearing out.
- **Map:** a small square where each vehicle is parked; clicking it plans a trip there.
- **Craft panel:** the Cycle trailer card at the top, needing a cycle and a hand cart here.

## Charms (D-086, D-088)

- **Player panel:** the seven charm slots (Necklace, Earrings, Waist cord, Ring ×2, Bangle ×2), each with Take off. In the Pack, charms not worn are listed under "Charms to wear", and the item card has **Wear**. The Pack's weight line shows the free limit with the silver waist chain (28 kg).
- **Tooltips** say what each charm does, its slot and rarity.

## Player panel (owner, 2026-11-26)

- A **Player** button in the top bar, before Pack, opens the Player panel: his name, age, level and XP; **Condition** (Health of its maximum, Food, Water, Rest, Radiation, what he carries against the limits, and any injury, illness or condition with its time left); **Equipped** (the weapon with Unequip, and the seven charm slots with Take off); **Stats** (damage and every stat); **To equip** (weapons and charms in the pack or in the cargo of the vehicle he rides, with Equip or Wear).
- What he has equipped or worn is not in the pack or the cargo. The Pack no longer shows the weapon slot, the charms or the stats.
- **Vehicle panel:** the pack list has tick boxes, with **Load all** and **Load selected**. Both load whole stacks in pack order as far as they fit; what doesn't fit stays in the pack and the message says how much.
- The top bar wraps onto a second row when its buttons don't fit.

## Numbers the map screen shows (D-017 to D-020)
- Speeds: road 4.5 km/h, cross-country 3 km/h.
- The game starts on Day 1 at 12:00 (D-075; it was 06:00, D-020).
- Fog clears in a ~3 km sight radius along Prabu's path.
- At the start he already knows home, the sanctuary forest beside it (D-021), Srivilliputhur town ruins, the NH 744 stretch and the railway station.
