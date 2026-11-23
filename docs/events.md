# Events and conditions (M6) — approved (D-059, D-061, was P-018) and built

The owner approved this on 2026-11-23: threats are handled without fighting for now (a Fight choice comes with M7), the nameless roadblock is fine, the numbers and the 12 events stay, and night (P-015) is approved with it (D-060). The owner added **conditions** (D-061, below): events leave lasting modifiers on Prabu. Built and live (released 2026-11-23). Events are data in `src/content/data/events.json`, conditions in `conditions.json`.

**Later (D-062):** charms, special items that lower risks or raise yields, worn as 1 talisman, 2 rings and 2 bangles. To be drafted and approved; not built.

M6 adds **events**: short text scenes that interrupt travel, searching or resting, give the player a choice, and change the state of the game. It also builds **night and the moon** (P-015, `docs/night.md`), because the night risk (D-048) is delivered through events.

What the confirmed decisions already ask of M6:

- Cross-country travel is "slower, riskier"; the risk arrives with events (D-009).
- When Rest is at 0, the chance of meeting enemies rises (D-023).
- Moving in the dark without a torch greatly raises the chance of injury or ambush, except on full-moon nights (D-048). The injury part is M6; ambushes need combat (M7).
- Injuries come from combat and events (D-039).
- M6 acceptance: events fire during travel and exploration, and their outcomes change the game state (CLAUDE.md §9).

## Inspiration (mechanics only, no content copied)

| Game | What we take | How it shows up here |
|---|---|---|
| Day R Survival | Random encounters on the map that stop you mid-trip; risk grows with the kind of ground | Events roll on each travel leg; cross-country rolls more often than roads |
| Fallout | Text scenes with choices; some choices need an item or a weapon and show it as a tag | Choices like **[Raw meat] Throw them the meat**; missing ones stay visible but disabled, with the reason |
| Darkest Dungeon | Curios (objects you can poke at, where the right item turns a gamble into a sure thing); light level drives danger | Search events with a safe choice when you have the right tool; darkness without a torch raises risk |

## How events fire

| Trigger | When it rolls | Chance (proposed) |
|---|---|---|
| **Travel** | At the end of each leg (legs are at most 30 min, D-035) | **5% per leg on roads, 10% per leg cross-country** (about 10% and 20% an hour) |
| **Search** | After a search of a site or a town building | **10% per search** |
| **Rest outdoors at night** | Each hour of resting at night, away from home and outside towns | **5% per hour**; none if a fire is burning where he rests |

Modifiers (multiply the chance):

- **Dark without light** (night, not a full-moon night, no charged torch): **×2** for travel, and it adds the night-only *Bad footing* event (below).
- **Rest at 0:** **×1.5** for threat events (D-023).
- **Cooldown:** no new event for **2 hours of game time** after one, so a long trip has a few events, not a string of them. An 80 km walk to Madurai (about 18 hours) would bring roughly 3–4.

Each event has a **weight**, conditions (road or cross-country, day or night, which site or building types), and can be marked **once per run**. One roll picks whether an event happens, a second picks which one from those that fit.

## The event dialog

```
┌──────────────────────────────────────┐
│ Wild dogs                     21:40  │
│                                      │
│ Five lean dogs step out of the scrub │
│ ahead. Patchy fur, too many teeth.   │
│ They have not decided about you yet. │
│                                      │
│ [ Back away slowly            ]      │
│ [ [Raw meat] Throw them the meat ]   │
│ [ [Lighter] Wave a flame at them ]   │
│ [ Run                         ]      │
└──────────────────────────────────────┘
```

- A **card in the middle of the screen** on desktop, a **bottom sheet** on mobile. The map is dimmed behind it.
- It **can't be closed without choosing**: events are the point where the run turns.
- A choice that needs something he lacks stays in the list, **disabled, with the reason** ("Needs raw meat"), so the player learns what to carry.
- After a choice, the card shows **what happened** ("One of them catches your leg. Injured, Health −15.") and a **Continue** button.
- **Travel:** the trip **pauses** while the card is open and **carries on** after Continue, unless the outcome stops it (for example an injury, or a meter at 25, which already stops trips by D-035).
- **Saves:** the open event is saved; reloading the page brings the same card back with the same result. Closing the tab can't be used to re-roll.
- **Messages:** the outcome also goes into the message line, like other actions.

No **Fight** choice appears until combat exists (M7). Threats are handled by backing off, bribing, scaring or running.

## Outcomes

Each choice leads to one outcome, or several with chances. An outcome can:

- change Health, Food, Water or Rest;
- **injure** (Health −10 to −20 and the injured state, D-039) or make him **ill** (like unsafe water, D-027);
- give items, or take items from the pack (by item, or "one food item");
- pass time (searching a wreck, waiting out a storm);
- stop the trip;
- reveal a place on the map (discovery, D-018).

No outcome changes the story, characters or factions.

## Proposed starter events (12)

P-001 proposed 8–10 text events. This proposes 12, because night and searching need their own. All text is placeholder for the owner to edit; none introduces a named character, faction or place.

| # | Event | Fires on | Choices → outcomes |
|---|---|---|---|
| 1 | **Bad footing** | Travel in the dark without light only | No choice: 50% a twisted ankle (injured, Health −10, trip stops); 50% a scrape (Health −3). This is D-048's injury risk. |
| 2 | **Wild dogs** (mutated, D-029) | Cross-country; more at night | Back away slowly: 60% fine, 40% bitten (injured, −15) · **[Raw meat or cooked meat]** throw it: lose 1, safe · **[Lighter or matchbox, or a charged torch at night]** scare them: 85% safe · Run: 50% safe, 50% bitten, Rest −10 either way |
| 3 | **Snake in the path** | Cross-country, by day | Step around: +10 min · **[Weapon equipped]** pin it: 70% raw meat ×1, 30% bitten (injured, −10, ill) · Turn back: trip stops |
| 4 | **Abandoned vehicle** | Road | Search it (30 min): one roll from a small table (scrap metal, cloth rags, coir rope, unsafe water) · Leave it |
| 5 | **Dead traveller's bundle** | Road or cross-country | Search (10 min): 1–2 of cloth rags, unsafe water, old pills, matchbox · Leave it |
| 6 | **Dust storm** | Travel by day | Shelter and wait (1 h; Water −5) · Push on (Water −10, Rest −10, +30 min to the leg) |
| 7 | **Midday heat** | Travel 11:00–15:00 with Water below 50 | Rest in the shade (1 h, Rest +5) · Push on (Water −10, Rest −10) |
| 8 | **Distant smoke** | Travel | Go and look (+30 min): 50% a dead campfire with 2 firewood, 30% nothing, 20% tracks that lead to the nearest place he hasn't found yet (revealed on the map) · Avoid it |
| 9 | **Stray goat** | Cross-country near towns | Try to catch it (30 min): 40% raw meat ×3, 60% it escapes (Rest −5) · Leave it |
| 10 | **Roadblock** (raiders, an approved category; no identity) | Road, rare | Go round cross-country (+45 min) · Hand over one food or water item: let through · **[Dark or full moon]** slip past: 60% safe, 40% caught (injured, −15, lose one food item) |
| 11 | **Unsteady floor** (curio) | Search in an independent house or apartment block | Leave it · **[Charged torch]** reach in carefully: one extra find from the building's table · Reach in blind: 50% extra find, 50% injured (−10) |
| 12 | **Something moving in the dark** | Rest outdoors at night | Keep watch (the hour gives no Rest) · Ignore it: 80% nothing, 20% one food item is gone from the pack |

## Conditions (D-061)

Events leave lasting modifiers on Prabu. Each shows as a tag in the top bar; tapping it says what it does and how long is left. The same condition again restarts its timer; they don't stack.

| Condition | Comes from | Effect | Ends |
|---|---|---|---|
| **Sprained ankle** | Bad footing (twisted ankle) | Walks at 70% speed, on the world map and in towns | After 12 h |
| **Restless** | Something moving in the dark (keeping watch, or food taken) | Rest drains 50% faster while awake | After one sleep of 4 h or more, undisturbed |
| **Weak** | Caught at the roadblock; pushing on in the midday heat (50%) | Maximum Health −10 (and −25% damage in M7) | After 24 h |
| **Shaken** | Any threat event at night (dogs, roadblock, something in the dark) | Searches take 25% longer | After 8 h, or 1 h of rest at home or beside a fire |
| **Infected wound** | A dirty dog bite (30% of bites); cutting his arm reaching in blind (30% of cuts) | Health −1 an hour; no healing | Treated with a sterilized bandage or neem–turmeric paste (a cloth bandage treats the injury but not the infection) |
| **Well rested** (good) | Sleeping to full Rest at home or beside a fire, undisturbed | Rest drains 25% slower while awake | After 12 h |

A wound can kill: with food and water left, death by Health reaching 0 is "His wounds killed him."

## Night and the moon (P-015)

M6 builds `docs/night.md` as proposed: night 18:30–06:00, a 30-day moon with three full-moon nights, the torch switching on by itself on dark legs (10% battery an hour), a moon icon by the clock, and a warning in the trip panel when a trip will run into the dark without light. The risk numbers it left open are the ones above: ×2 event chance and *Bad footing* in the dark.

## Engine (Claude's side)

- Events are data in a new `src/content/data/events.json` (`event.<slug>` ids), validated with Zod at load, with checks that every item, site and building type they name exists.
- Event rolls use the seeded RNG, so tests are reproducible.
- New command `event.choose { choiceId }`; refused when no event is open, the choice doesn't exist, or its need isn't met. While an event is open, every other command is refused with `event_open`.
- Travel already stops between legs; an event pauses the trip there and `event.choose` resumes it.
- **Save v7:** adds the open event (with its rolled result) and the time of the last event, with a migration from v6.
- Tests: each trigger and its odds over many seeds, modifiers, cooldown, every choice's needs, outcomes on state, the trip pausing and resuming, save and reload with an open event.

## Not included

- **Fights:** threat events get a Fight choice with M7 (Q4, Q5 still open).
- **Story events:** the brother's trace, the mother, the settlement's people. These wait for the opening narrative (Q7) and M8.
- **Karma or reputation** from choices (deferred, §6).
- **Trading** with people met on the road (deferred, §6).

## Built choices (Claude's, technical or small)

- **Event finds go into the pack**, or onto the ground where he stands if they would take him past 50 kg. (Search finds still go on the ground, D-045; on a trip he would walk away from them.)
- **Town walks:** at most one event per walk. If its outcome stops him (a sprained ankle), he stays where it happened; otherwise he walks on and the card shows on arrival.
- **Rest events** roll at the end of each full hour; one stops the rest there.
- **Chance per leg** scales with the leg's length (a 15-minute leg is half the chance of a 30-minute one), and a leg's road or cross-country share is worked out from its length and time.
- **Item healing** is now capped at maximum Health (it was capped at 100, which let painkillers go past the radiation limit).
- The e2e tests start games with `?seed=2` so random events don't make them flaky.
