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
- **Rest** (not in the mockup; added in the same style): the Rest meter, whether Health will recover, and buttons for 1 hour, 4 hours and "Until rested" with the wake-up time.
- **Game over** (not in the mockup): "Prabu has died", the cause and time, and Back to title.
- **Title:** with a run in progress, New Game first asks "Your current run will be lost." with Start a new run / Keep my run.
- **Phones:** the top bar wraps to three rows: clock and buttons, then status, then the four meters.

## Numbers the map screen shows (D-017 to D-020)
- Speeds: road 4.5 km/h, cross-country 3 km/h.
- The game starts on Day 1 at 06:00.
- Fog clears in a ~3 km sight radius along Prabu's path.
- At the start he already knows home, the sanctuary forest beside it (D-021), Srivilliputhur town ruins, the NH 744 stretch and the railway station.
