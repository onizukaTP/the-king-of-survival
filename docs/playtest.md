# M9 playtest report (2026-11-26)

M9 is the integration, balance and playtest milestone. This report covers the first pass: a scripted player run through the real engine, a fight-by-fight table, and a hand playtest in the browser at phone width. **No game numbers were changed.** The balance proposals at the end (P-023) wait for the owner.

## How it was measured

- **Playtest bot** (`tests/playtest/bot.ts`): plays a run the way a careful player would. It drinks and eats when low, treats injuries and infected wounds, cooks raw meat and millet at a fire, and sleeps when tired. It searches places until they run thin (towns building by building), hunts when food runs short, fights when healthy and flees below 25 Health. It doesn't go to Madurai. It only uses the engine's commands, so it can't break a rule.
- **Fight table** (`tests/playtest/fights.sim.ts`): every fight the events can start, 200 times each, at level 1 with each weapon and at level 5 with the knife. Each fight starts at full Health.
- **Browser** (phone width, 375 px): new run, intro, travel, search, hunt, fire and cooking, an event, two fights, the town map, and every panel.

Run them with `npm run playtest` (environment variables: `RUNS`, `DAYS`, `DETAIL=1`; `SEED=n` for one traced run).

## What a run looks like (100 runs × 30 days, careful player)

| Measure | Result |
|---|---|
| Survive 30 days | **96 of 100** |
| Deaths | 3 killed in fights (days 0.5–7), 1 thirst |
| Starving (Food or Water at 0) | 1.5 h per run on average |
| Lowest Food / Water / Health in a run (average) | 45 / 17 / 47 |
| Level at day 30 | 5 for 93 runs (level 6 for 3) |
| XP per day | about 30, mostly from searches (2 XP each) |
| Fights | about 1 every 4–5 days (0.23 a day); events about 1 a day |
| Hunting | 41% of hunts succeed (Hunting 40) |

**Reading:** once the player knows the systems, survival around home is comfortable. The real danger is an early fight. The first versions of the bot starved by days 6–10 for reasons a new player would also hit:
- tins need a can opener;
- raw meat needs firewood and a fire;
- millet needs a pot, a fire and a bottle of water.

The tooltips say tins need a can opener. Raw meat and millet only say "Cooking ingredient".

## Fight table (200 fights each)

Won / fled / died, then the Health lost in a win. "Flees" means the bot flees below 25 Health; "fights on" means it never flees.

| Fight | Setup | Flees: won / fled / died | Fights on: won / died | Health lost |
|---|---|---|---|---|
| 2 wild dogs | any | 100 / 0 / 0 | 100 / 0 | 17–20 |
| 4 wild dogs | any | 100 / 0 / 0 | 100 / 0 | 19–26 |
| Mutated boar | L1 knife | 99 / 1 / 0 | 100 / 0 | 34 |
| Mutated boar | L1 aruval | 100 / 0 / 0 | 100 / 0 | 23 |
| Roadblock (blade + bow) | L1 knife | 77 / 16 / 8 | 99 / 1 | 51–59 |
| Roadblock (blade + bow) | L1 aruval | 93 / 5 / 3 | 100 / 0 | 43–46 |
| Roadblock (blade + bow) | L1 bow | 82 / 14 / 5 | 97 / 4 | 51–56 |
| Ambush, 1 raider | any | 100 / 0 / 0 | 100 / 0 | 27–35 |
| Ambush, 2 raiders | L1 knife | 28 / 60 / 13 | 77 / 23 | 62–80 |
| Ambush, 2 raiders | L1 aruval | 56 / 38 / 6 | 95 / 5 | 57–70 |
| Ambush, 2 raiders | L1 bow | 34 / 53 / 14 | 82 / 19 | 59–77 |
| Ambush, 2 raiders | L5 knife | 50 / 45 / 6 | 91 / 10 | 56–70 |

**Reading:**
- Dogs and the boar are easy. The two-raider ambush is the one real killer, at about 1 in 4 with the starting knife. It only happens in the dark without light, so a torch avoids it.
- Fleeing at low Health saves fewer lives than expected: a failed escape gives every enemy a free hit.
- The bow does worse than the aruval and the spear, and it spends arrows.
- Level 5 helps only a little.

## On the generated map (M11, 2026-11-27)

- First run: 60 of 60 runs died (54 of thirst, by day 4). The bot walked to the nearest well, and 90% of
  wells in generated places are dry (D-103). The bot now skips dry wells, as a player would after one look.
- After the fix: 57 of 60 runs survive 30 days (2 thirst, 1 killed); with statewide rivers and reservoirs,
  20 of 20 survive (lowest Water 14 on average, level 10 by day 30). Nothing in the game was changed for this.

## Bugs found and fixed (on `dev`)

1. **Combat log:** a blow that cleared remains read "Prabu hits **Someone** for 9". Remains now read "the remains of Wild dog", and a fighter removed during the round keeps its name.
2. **Finds:** two draws of the same item read "Found: bamboo, bamboo". They now read "bamboo ×2".
3. **Hunting:** a failed hunt said "Found nothing.", the same as an empty search. It now says "The hunt failed: the game got away."
4. **Town map on a phone:** Prabu's dot couldn't be tapped. A nearby label (Andal temple) covered his spot, so there was no sure way back to the Here panel (Leave town, search, fire). His dot now opens it, as his marker does on the world map. An e2e test covers it.

Not bugs:
- Corpses in front can be cleared: Stab, Hack, Thrust, Shoot and Punch strike remains.
- Unsafe water, the trip stopping at a low meter, and the lost meat when throwing it to the dogs all work as designed.

## Flagged for the owner (not changed)

- **Wild dogs text vs numbers:** the event says "Five lean dogs step out of the scrub", but the fight it starts has **2 to 4** dogs. *Answered (D-093): the text stays; only 2 to 4 of them have the courage to fight.*
- **A lone archer can't act** *(fixed by D-090: it punches)*: when the bow raider ends up alone in rank 1 (after the blade raider's remains are cleared), it can't shoot. Shoot is used from ranks 2–4, it has no other attack, and with no one behind it, it can't step back. It just waits, which makes it a free kill.

## Balance proposals (P-023, answered by D-090 on 2026-11-27)

The owner's answers: 1 yes, as bare hands (built); 2 yes (built); 3 **level 10 in about 20 days**, since more levels will come (table in P-024 below); 4, 5 and 6 yes.

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | The lone archer | (a) give the bow raider a weak blow from rank 1 (e.g. a bow bash, damage ×0.5); (b) let Shoot be used from rank 1 at −15 ACC; (c) leave it | **(a)**: it keeps the archer's role and gives it a fallback |
| 2 | Raw meat and millet tooltips | Add a line built from the fire recipes: "Cook at a fire: cooked meat", "At a fire with a pot and water: millet porridge" | **Yes**: it's data, not new text, and it fixes the most common early starvation |
| 3 | Pace to level 10 | At about 30 XP a day, level 10 (2,700 XP) takes about 90 days. Options: keep; raise XP for fights and hunts; lower the table | Owner's call: **how many days should a run take to reach level 10?** |
| 4 | Fights per run | About 1 every 4–5 days. Options: keep; raise the threat events' chance | **Keep for now**; decide after a human playtest |
| 5 | The two-raider ambush | About 1 in 4 deaths at level 1 with the knife. Options: keep (it's avoidable with a light); cap it at 1 raider until a later day | **Keep**: the torch is the counter, and the game teaches it (D-048) |
| 6 | The bow | It does worse than melee and costs arrows. Options: keep (it reaches every rank and gives Hunting +15%); raise its damage | **Keep for now**: its value is reach and hunting |

Still to do in M9 after the owner's answers: a human playtest of a full 30–60 minute session on desktop and a phone (acceptance criterion), and any approved balance changes.

## P-024: level table for level 10 in about 20 days (approved as option A: D-091, 2026-11-27)

A careful player's XP by the end of each day (100 runs, median, `tests/playtest/xp.sim.ts`): day 1: 45 · 2: 77 · 3: 115 · 5: 184 · 7: 263 · 10: 349 · 15: 479 · 20: **606** · 30: 876. After the first week it's about 30 XP a day, nearly all from searches.

Two ways to make day 20 reach level 10:
- **(A) Lower the thresholds.** XP awards stay as they are. The table keeps its growing gaps, so new levels just continue it. **Recommended.**
- **(B) Raise every XP award about 4.5 times** (a search 9, a hunt 45, a discovery 68, enemies ×4.5). The table stays, but every XP number changes.

Option A, gains unchanged:

| Level | Total XP now | Proposed | Reached on about (median) |
|---|---|---|---|
| 2 | 100 | 20 | day 1 (about 11 h in) |
| 3 | 250 | 55 | day 2 |
| 4 | 450 | 100 | day 3 |
| 5 | 700 | 155 | day 5 |
| 6 | 1,000 | 220 | day 6 |
| 7 | 1,350 | 300 | day 9 |
| 8 | 1,750 | 390 | day 12 |
| 9 | 2,200 | 490 | day 16 |
| 10 | 2,700 | 600 | day 20 |

Levels after 10 would continue the gaps (+120, +130, …): level 11 at about 720 XP (day 24) and level 12 at about 850 (day 29), at the current XP rate.

