# Combat (M7) — approved (D-066, was P-019) and built

Approved on 2026-11-23 with these changes, built and live (released 2026-11-23):

- **ACC, Dodge, Hunting and Luck** are stats. The bow gives Hunting +15%.
- **Luck** (base 0; items will raise it later) applies everywhere. Each point adds:
  - 1% to search find chances;
  - +1 to hunting success;
  - +0.5 to the flee chance;
  - +0.25 to crit rate.
- **Screens:** the combat screen and the Stats block are approved.
- **Side view (D-067, 2026-11-23):** the screen now shows Prabu on the left facing the enemies on the right in Close, Mid and Far columns. D-003 and the bands stay. Spec in `docs/ui.md`.

Data:
- Stats are in `characters.json`.
- Weapon profiles are on the weapon items in `items.json`.
- Enemies are in `enemies.json`.
- Combat numbers are in `combat.json`.
- Fights start from `events.json`.

## Already decided

- **D-003:** turn-based and tactical, without Darkest Dungeon's 4-rank formation.
- **D-063:**
  - Prabu fights alone, but the engine allows any number of fighters on each side.
  - Each enemy is Close, Mid or Far. Knives and the aruval hit Close, the spear reaches Mid, and the bow hits any band and uses arrows.
  - Moving a band takes a turn.
  - Fleeing is a chance roll that uses his turn. It is easier from Far and harder when he is hurt or heavily loaded. If it fails, the enemies get a free hit.
- **D-064:** prototype enemies are mutated animals and nameless human raiders.
- **D-065** (your rules, 2026-11-23):
  - Every fighter has **ATK, DEF, SPD, crit rate and crit damage**. Items and attire will raise or lower them later.
  - **Turn order** is SPD plus a roll, as in Darkest Dungeon.
  - Prototype enemies are **wild dogs, mutated animals and raiders**.
  - **Fights come from random encounters.**
  - **Hunting** stays a success roll, driven by a hunting stat that hunting items will raise later.
  - **Weapons stay primitive** for now. Guns, crossbows, compound bows, sniper rifles and so on come later.
- **D-061:** Weak gives −25% damage in combat.
- **D-039:** combat can injure Prabu.

All numbers are starting values for the balance pass (M9).

## Stats

Your five stats, plus three I suggest adding (choice 1 at the end):

| Stat | What it does | Prabu's base |
|---|---|---|
| **ATK** | Added to every hit's damage | 2 |
| **DEF** | Cuts damage taken by this %, capped at 75% | 0% |
| **SPD** | Turn order: each round every fighter rolls SPD + 1–8, highest goes first | 4 |
| **Crit rate** | Chance that a hit is a critical | 5% |
| **Crit damage** | A critical's damage | 150% |
| *ACC (suggested)* | Base chance to hit | 85 |
| *Dodge (suggested)* | Subtracted from the attacker's ACC | 10 |
| *Hunting (suggested)* | Chance that an hour of hunting succeeds | 40% |

- **Hit chance:** attacker's ACC − target's Dodge, kept between 5% and 95%. Without ACC and Dodge every attack would hit, and armour (DEF) would be the only defence.
- **Damage:** weapon damage roll + ATK. Then crit damage applies on a crit, then the target's DEF cuts it, then Weak takes off 25%. A hit always does at least 1.
- **Health is Prabu's HP.** Damage in a fight comes off the real Health meter.
- **Where stats come from:** base + weapon. Attire, charms (D-062) and hunting items add to the same total later, so adding them needs no change to combat.

## Weapons (primitive, as now)

| Weapon | Damage | Reach | Other |
|---|---|---|---|
| Bare hands | 1–3 | Close | |
| Hunting knife | 4–7 | Close | SPD +1, crit +5% |
| Aruval | 7–11 | Close | SPD −1 |
| Bamboo spear | 5–9 | Close and Mid | ACC +5 |
| Bamboo bow | 5–8 | Any band | 1 arrow a shot; ACC −10 at Close; crit +5%; Hunting +15% |

- The spear also gives **Hunting +10%**.
- **Arrows:** half the arrows fired are picked up again after a won fight.

**Weapon recipes (held back from M5, D-058):**

| Recipe | Inputs | Tool | Time | Makes |
|---|---|---|---|---|
| Bamboo spear | 1 bamboo + 1 scrap metal | Hunting knife | 45 min | 1 bamboo spear |
| Bamboo bow | 1 bamboo + 1 coir rope | Hunting knife | 1 h | 1 bamboo bow |
| Arrows | 1 bamboo + 1 scrap metal | Hunting knife | 30 min | 5 arrows |

## Enemies (4 types)

| Enemy | HP | Damage | DEF | SPD | ACC / Dodge | Crit | Starts at | How it fights |
|---|---|---|---|---|---|---|---|---|
| **Wild dog** (mutated, pack of 2–4) | 12 | 2–5 | 0% | 6 | 80 / 15 | 5% | Mid or Far | Closes in one band a turn, bites at Close. A crit bite has a 30% chance of an infected wound. |
| **Mutated boar** (alone) | 30 | 6–10 | 10% | 2 | 75 / 0 | 10% | Far | Slow and tough. Charges in one band a turn and hits hard at Close. |
| **Raider with a blade** | 25 | 5–9 | 10% | 4 | 80 / 10 | 10% | Mid | Closes in and cuts. |
| **Raider with a bow** | 20 | 4–7 | 0% | 5 | 80 / 10 | 10% | Far | Shoots from Mid or Far, and steps back if Prabu gets Close. |

**Loot after a win** (into the pack, or onto the ground if too heavy, as with event finds):
- **Dog:** raw meat ×1 each.
- **Boar:** raw meat ×3–4 and animal hide.
- **Raiders:** a small table per raider (food, water, cloth rags, matchbox, arrows; an aruval rarely).

## A fight, turn by turn

- **Rounds:** every fighter rolls SPD + 1–8, and turns run from highest to lowest. An ambush gives the enemies the whole first round.
- **Prabu's actions on his turn:**
  - **Attack** one enemy within his weapon's reach.
  - **Aim:** his next attack gets ACC +15 and crit +10%.
  - **Close in** on one enemy: it moves one band nearer.
  - **Step back:** every enemy moves one band farther, Far at most.
  - **Use an item:** a bandage, paste, food or water, as from the Pack.
  - **Flee:** see below.
- **Enemies:** melee enemies move one band closer until Close, then attack. Archers keep their distance and shoot.
- **Injury:** a critical hit on Prabu injures him (D-039).
- **Time:** a fight passes **1 minute a round** of game time.
- **Fleeing:**
  - The base chance is 50%, +10% if the nearest enemy is at Mid, +25% if at Far.
  - −15% at Health 25 or below, and −15% over 25 kg carried.
  - Kept between 10% and 90%.
  - **If it fails, every enemy in reach gets a free attack.**
  - If it works, the fight ends, he keeps what he carries, and a trip can carry on.
- **Winning:** loot is handed out, the arrows are picked up, and a trip carries on.
- **Losing:** Health 0 means death and the end of the run (D-038). The game-over screen names what killed him.

## Where fights come from (random encounters)

| Event | Change |
|---|---|
| Wild dogs | Gains a **Fight** choice: 2–4 dogs. |
| Roadblock | Gains a **Fight** choice: a raider with a blade and a raider with a bow. |
| **New: Mutated boar** | Cross-country, or during a hunt: choices **Fight** or **Back off** (a flee roll from Far). |
| **New: Ambush in the dark** | Travelling in the dark without light (D-048): 1–2 raiders start at Close and the fight begins at once. |

That brings the events to 14.

**Ambushes:** the ambush chance in the dark is the existing ×2 for events in the dark. No extra roll.

## Hunting

- An hour of hunting succeeds with Prabu's **Hunting** chance: 40% base, +15% with the bow, +10% with the spear.
- **On success:** raw meat ×2–3, plus animal hide 75% of the time. That matches today's odds with the knife (40% meat, 30% hide).
- **Encounter:** each hunt has a **10% chance of meeting the mutated boar** (the event above).
- **Later:** hunting items such as traps and camouflage add to Hunting (your rule).

## Screens

**Combat screen.** It replaces the map while a fight is on and uses the same top bar.

```
┌ Round 3 ─────────── turn: Prabu → Dog → Dog ┐
│ FAR    [Raider (bow) ████░ 14/20]            │
│ MID    [Dog ██░ 7/12]                        │
│ CLOSE  [Dog ████ 12/12]  ← target            │
│──────────────────────────────────────────────│
│ Prabu  Health 72  Aruval 7–11  Close only    │
│ [Attack] [Aim] [Close in] [Step back]        │
│ [Use item]  [Flee 35%]                       │
│ Dog bites you for 4.                         │
└──────────────────────────────────────────────┘
```

- **Choosing a target:** tap an enemy card to select it.
- **Unusable actions** are disabled with the reason, for example "Out of reach", "No arrows" or "Nothing usable".
- **Phone:** the same layout stacked, with the actions in a bottom sheet.
- **Fight result:** a card like the event card ("You won. Found: raw meat ×2."), then Continue.

**Stats in the Pack.** The Pack panel gains a small **Stats** block under the weapon slot: ATK, DEF, SPD, crit, crit damage, ACC, Dodge and Hunting. It changes when the weapon changes. A full Character screen waits for P-007.

## Engine (Claude's side)

- **Data:**
  - `enemies.json` holds the stats, behaviour and loot.
  - Weapon stats go on the weapon items.
  - Prabu's base stats go in `characters.json`.
  - An event outcome can start a fight with `fight: encounterId`.
- **Save v8:** adds `combat: null | { enemies [{type, hp, band}], round, order, aimed }` with a migration. A fight is saved between turns, so a reload goes back into it.
- **Command `combat.act { action, target? }`:** refused with `not_in_combat`, `out_of_reach`, `no_arrows` or `bad_target`. While a fight is on, every other command except using an item through the fight is refused.
- **Tests:** turn order, hit, crit and damage maths, DEF cap, Weak, reach per weapon, band moves, enemy behaviour, fleeing odds and failure, win loot and arrows, death, ambush first round, hunting odds, save and reload in a fight, v7 → v8.
- **e2e:** a dog fight from the event card to a win.

## Not included

- **Attire, charms and hunting items:** the stat totals are built so they can plug in later (D-062, D-065).
- **Firearms and better bows** (D-065, later).
- **Companions:** the engine allows them (D-063), but none are added.
- **Enemies running away or surrendering.**

## Built choices (Claude's, technical or small)

- **Log:** the combat screen's log shows everything since Prabu's last action, so it can cover the end of one round and the start of the next.
- **Fleeing:** a successful escape still takes a minute.
- **Failed escape:** after the free hits, the round goes on as usual.
- **Fight loot:** goes into the pack like event finds. Two dogs give one line, "raw meat ×2".
- **Using an item in a fight:** allowed only for things eaten, drunk or applied at once. Cranking the charger takes 30 minutes, so it isn't allowed.
- **Order ties:** when Prabu and an enemy roll the same, Prabu goes first.
