# Combat — four-rank tactical combat (D-069), built and live (released 2026-11-24); numbers approved for now (D-084)

This replaces the first combat (M7, D-063 to D-067), which used Close/Mid/Far bands and generic Attack and Aim actions; that version is kept for history in `docs/combat-m7.md`. The owner's redesign (2026-11-24) asked for a four-rank formation, position-dependent abilities, initiative from SPD, statuses and resistances, Death's Door and Deathblow, corpses, and enemy AI that understands the formation. Stress and psychological mechanics are deferred.

## What changed from M7

| Decision | Status now |
|---|---|
| D-003: no Darkest Dungeon four-rank formation | **Superseded.** Both sides have four ranks. |
| D-063: Close/Mid/Far bands, band movement, reach by band | **Superseded.** Ranks, abilities and their rank rules. |
| D-063: Prabu fights alone; fleeing with free hits on failure | **Kept.** The engine allows 1–4 per side. |
| D-067: side view with Close/Mid/Far columns | **Superseded** by the four ranks a side; Prabu's side is still on the left. |
| D-038: death at Health 0 | **Refined.** In a fight he first reaches Death's Door. A failed Deathblow kills him, and permadeath and game over follow as before. |
| D-065, D-066: ATK, DEF, SPD, crit rate, crit damage, ACC, Dodge, Hunting, Luck; turn order SPD + 1–8 | **Kept**, with six resistances added. |
| Weapons, damage values, arrows and their recovery, Hunting bonuses, Luck | **Kept.** Weapons now give abilities instead of a reach. |

## The rules

### Formation

- Each side has **ranks 1–4**. Rank 1 is the front, nearest the other side.
- A side is kept **packed from the front**. Empty ranks are at the back; Prabu alone holds rank 1, and ranks 2–4 stay empty.
- **Big fighters** take two ranks (the mutated boar). An attack on two ranks hits a two-rank fighter **once**.
- **Moving** swaps places with a neighbour:
  - **Move forward / Move back** (player): one place, using the turn.
  - **Push and pull** (an ability's effect): move the target, resisted by its Move resistance.
  - **Shuffle**: moves the target to a random place.
- **Remains (corpses)** block movement; nobody can be pushed or pulled past them.
- When a fighter dies **without remains**, the ones behind close up.

### Turns

- **Each round**, every living fighter rolls **SPD + 1–8** (an enemy with `turnsPerRound` 2 rolls twice and acts twice). Turns go from highest to lowest.
- **Ties** go to the player's side, then to the front rank.
- **A turn** is one action:
  - **Player side:** an ability, Move forward or back, Pass, Use an item, or Flee.
  - **Enemies:** their AI picks one.
- **At the start of a turn:**
  - Bleed and blight hurt.
  - A stun takes the whole turn, then gives a short boost to stun resistance (+50 for 2 turns) so he can't be stun-locked.
  - Every status counts down one turn.
- **Extra turns:** an ability effect (`extra_turn`) can put its user straight back in the queue.
- **New rounds:** when the queue is empty, a new round rolls initiative again. The queue is never rebuilt after a single action.
- **Ambushes:** in an ambush the enemies take the whole first round.

### Abilities

**Prabu's abilities** are his own three plus two from his weapon:

| Ability | From rank | Targets | Effect |
|---|---|---|---|
| Take aim (own) | 1–4 | himself | ACC +15 and crit +10%, through his next turn |
| Brace (own) | 1–4 | himself | DEF +20% for two turns |
| Shove (own) | 1 | enemy rank 1 | ×0.3 damage, pushes it back a rank |
| Punch (bare hands) | 1–2 | enemy 1–2 | ×1 |
| Stab (knife) | 1–2 | enemy 1–2, or remains | ×1, crit +5 |
| Open a vein (knife) | 1–2 | enemy 1–2 | ×0.5, bleed 2 a turn for 3 turns |
| Hack (aruval) | 1–2 | enemy 1–2, or remains | ×1 |
| Sweep (aruval) | 1 | all of enemy 1–2 | ×0.6, ACC −5 |
| Thrust (spear) | 1–3 | enemy 1–3, or remains | ×1 |
| Hook (spear) | 1–2 | enemy 2–3 | ×0.5, pulls it a rank forward |
| Shoot (bow) | 1–4 | enemy 1–4, or remains | ×1, uses an arrow |
| Pinning shot (bow) | 2–4 | enemy 1–4 | ×0.6, can stun, uses an arrow |

**Limits:**
- An ability **can't be used** from the wrong rank, with no target in its ranks, or without arrows. The button is disabled with the reason, for example "Wrong position: usable from rank 2, 3, 4".
- While Prabu fights alone he always stands in rank 1, so **Pinning shot** can't be used yet. It shows "Wrong position" until companions can stand in front of him.

### Damage, hits and crits (one pipeline for every fighter)

- **Hit chance:** the attacker's ACC + the ability's accuracy − the target's Dodge, kept between 5% and 95%. Abilities on allies or yourself never miss; remains don't dodge.
- **Crit chance:** crit rate + the ability's crit, + its bonus against a marked target, + Luck × 0.25 for Prabu.
- **Damage:** (damage roll + ATK) × the ability's multiplier, then:
  - a crit multiplies it by crit damage;
  - the target's DEF cuts it, capped at 75%;
  - Weak and Death's Door multiply it last.
  - It is rounded, and a hit always does at least 1.
- **Damage rolls:** the protagonist uses his weapon; an enemy has its own.
- **Bleed and blight** ignore DEF.
- **Injuries:** a critical hit on Prabu injures him (D-039). A wild dog's crit can also infect the wound (30%).

### Statuses and resistances

- **Landing:** a status lands when a roll beats (the effect's chance − the target's resistance).
- **Resistances:** stun, bleed, blight, debuff, move and deathblow, all in %.
- **Statuses** (defined in `combat.json`):

| Status | What it does | Resisted by |
|---|---|---|
| Bleed | Damage at the start of each turn; stacks | Bleed res |
| Blight | The same, separately; stacks | Blight res |
| Stunned | Loses the next turn, then a stun-resistance boost | Stun res |
| Marked | Some abilities do more against it, and blade raiders go for it | — (always lands) |
| Buff | Raises a stat for some turns | — |
| Debuff | Lowers a stat for some turns | Debuff res |

- **Movement:** push, pull and shuffle are effects resisted by Move res.
- **Cleanse:** removes bleed and blight.
- **Lifecycle:** apply (with the resistance roll) → count down at the holder's turn start → take effect → expire, logged as "wears off", or be cleansed.
- **New kinds:** a new status with the same behaviours (damage a turn, skip a turn, change a stat) is added in `combat.json` alone. The tests add one ("burn") this way.

### Death's Door and Deathblow (player side)

- **Reaching it:** at 0 Health Prabu is at **Death's Door**, not dead. Penalties: ACC −10, SPD −2, damage ×0.8.
- **Deathblow checks:** every further blow, bleed tick or blight tick is a **Deathblow check** against his Deathblow resistance (60%). Each instance is its own check, so two hits are two checks.
- **Failing a check** kills him: game over, and the save is deleted (D-038).
- **Leaving it:** any healing above 0 (an item, a heal ability) ends Death's Door.
- **Surviving the fight:** if he wins or flees while at Death's Door, he walks away at **1 Health**. Death's Door only exists inside a fight.
- **Enemies** die at 0.

### Remains

- **What remains do:** a dead enemy may leave remains (per enemy: `corpse.hp`, or `null` for none). They keep its ranks, take no turns and block movement.
- **Clearing them:** abilities marked `corpses` (Stab, Hack, Thrust, Shoot, Punch) can strike them to clear them. Enemies never waste blows on them.
- **Making room:** a newcomer takes an empty back rank, or the place of the frontmost remains when the side is full.

### Enemy AI

- **Data:** each enemy has its abilities with weights, its preferred ranks and a targeting rule: random, the weakest, a marked target first, or the one nearest the front.
- **Each turn:**
  1. Use an ability that works from where it stands and has a target, picked by weight.
  2. Otherwise, step towards its preferred ranks.
  3. Otherwise, pass.
- **Every turn ends** in exactly one action, so fights can't stall. A test runs fights where Prabu only passes, and they always end.

| Enemy | Ranks | Abilities | Picks |
|---|---|---|---|
| Wild dog | 1–2 | Bite (1–2 → 1–2); Hamstring (1 → 1, bleed) | random |
| Mutated boar (2 ranks) | 1 | Gore (1–2 → 1, blight); Trample (1–2 → all of 1–2, can stun) | the front |
| Raider with a blade | 1–2 | Cut (1–2 → 1–2, +50% damage on the marked); Rend (1 → 1, bleed) | the marked first |
| Raider with a bow | 3–4 | Shoot (2–4 → any); Call the target (2–4 → any, marks and lowers DEF) | the weakest |

- **Unchanged:** HP, damage rolls, DEF, SPD, ACC, Dodge and crit are as in M7. The resistances are new.
- **Out of position:** a bow raider pushed to the front has nothing to shoot from there, so it steps back. A blade raider at the back steps forward.

### Fleeing, time and loot

- **Flee chance:**
  - 50% base, +25% when no enemy stands in their rank 1;
  - −15% at Health 25 or below, −15% over 25 kg carried;
  - + Luck × 0.5;
  - kept between 10% and 90%.
- **A failed flee** gives every enemy a free action (D-063).
- **Time:** a fight passes **1 minute a round** when it ends.
- **Loot:** from each defeated enemy's table, plus half the arrows shot. It goes into the pack, or onto the ground if too heavy.

## The screen (`docs/ui.md`)

- **Battlefield:** both formations on one field. Prabu's ranks 4 → 1 run from the left to the middle, the enemy's ranks 1 → 4 from the middle to the right, with rank labels and a line between the sides.
- **Each fighter** shows:
  - a placeholder figure (two-rank enemies span two ranks);
  - its name, health bar and numbers;
  - status badges (Bleed 4, Stunned, Marked, DEF −10), and a red Death's Door badge;
  - an amber outline on its turn;
  - floating numbers for what just happened to it (−8, Crit −12, Miss, +10, Resist).
- **Turn order:** round number and the queue, with the current turn highlighted.
- **Acting character's card:** rank, health, weapon and arrows, and live stats with buffs and Death's Door included.
- **Abilities:**
  - One button per ability, showing the hit chance and "From rank 1, 2 → rank 1, 2".
  - Disabled with the reason when it can't be used.
  - Choosing one highlights the valid targets; the rest can't be picked.
  - Abilities on himself or on everyone in their ranks go at once.
- **Other actions:** Move forward, Move back, Pass, Use item (opens a list) and Flee (shows its chance).
- **Log:** everything since the last action.
- **Result:** "He won the fight" or "He got away", with the finds, then Continue.
- **Phone:** the same layout, smaller; it fits a 375 px screen.

## Data (how it's stored)

| File | What it holds |
|---|---|
| `characters.json` | Each character's stats (with resistances, Hunting and Luck) and own abilities |
| `items.json` | A weapon's `combat`: damage roll, the abilities it gives, ammo, stat bonuses |
| `abilities.json` | Every ability: `usableFrom`, `target` {side, ranks, mode, corpses}, damage multiplier, heal, accuracy, crit, ammo, `vsMarked`, `effects`, `selfMove` |
| `enemies.json` | HP, damage roll, stats with resistances, size, preferred ranks, weighted abilities, AI targeting, turns a round, remains, crit condition, loot |
| `combat.json` | Initiative die, hit range, DEF cap, minutes a round, arrow recovery, the status kinds, stun guard, the move-resist stat, Death's Door penalties, flee and Luck numbers |
| `events.json` | Fights start from an outcome's `fight` (enemies, ambush), as before |

The loader checks every reference: abilities, items, conditions, status kinds and the stats they use.

## How to add things

- **A new ability for Prabu or a companion:**
  1. Add it to `abilities.json`.
  2. List its id in the character's `abilities` (always available) or a weapon's `combat.abilities` (while that weapon is in hand).
- **A new enemy:**
  1. Add it to `enemies.json` with its stats, size, preferred ranks, abilities (each with a weight), a targeting rule and remains.
  2. Add its abilities to `abilities.json`.
  3. Add a `figure.<enemy id>` entry to `src/assets/manifest.json` (a placeholder works).
  4. Use it in an event outcome's `fight`.
- **A new status** that hurts each turn, skips a turn or changes a stat: add a kind to `combat.json` → `statuses`, with its name, resisting stat and behaviour flags. Abilities can then apply it. A status with a new behaviour (guard, riposte) needs one small handler in `statuses.ts` or `abilities.ts`.
- **A companion:** add a character to `characters.json`. Then add it to the player side in `startFight`; the formation, turns, targeting, Death's Door and the screen already handle more than one fighter.

## Code

`src/engine/systems/combat/`:

| File | Does |
|---|---|
| `combat.ts` | Starting a fight, initiative, the turn loop, player actions, fleeing, the end of the fight |
| `formation.ts` | Ranks, moving, shuffling, closing up, bringing someone in |
| `abilities.ts` | Usable ranks, valid targets, why an ability is blocked, hit and crit odds, using an ability (`performAbility`) |
| `resolve.ts` | Damage, Death's Door, Deathblow, death, remains, healing, the combat RNG |
| `statuses.ts` | Applying statuses against resistance, turn-start ticks, stun guard, cleansing |
| `ai.ts` | Enemy decisions from their data |
| `fighters.ts` | A fighter's health, stats (with statuses and Death's Door), damage roll and abilities |
| `stats.ts` | Prabu's stats and weapon profile, also used by hunting and searching |

- **Purity:** the engine is pure TypeScript (no UI), deterministic from the seeded RNG, and driven by `combat.act` / `combat.close` commands.
- **Testing tools:** `debug.fight` starts any fight (D-068).

## Saves

- **Save version 9.** `combat` holds:
  - the fighters (uid, side, type, protagonist flag, health, rank, size, statuses with turns left, Death's Door, remains);
  - the round, the turn queue and whether the current turn has begun;
  - the defeated enemies, the arrows shot, the log since the player last acted, and the result.
- **Reloading** mid-fight continues the same turn with the same formation and statuses. Making the same choice after a reload gives the same result.
- **Migration 8 → 9:** an old band fight becomes a formation:
  - Prabu in rank 1;
  - the enemies still standing line up nearest first (Close, Mid, Far), as many as four ranks hold;
  - those already dead count as defeated for the loot;
  - it is Prabu's turn.
- **Nothing to do with Stress** is saved.

## Stress later (deferred, not built)

Nothing of Stress is built. These are the places it would plug in:

- **The fighter state** (`combatantSchema` in `state.ts`) can take a stress meter as a new field, with a migration.
- **Abilities and effects:** an effect kind such as `stress` (deal or heal) would be one more branch in `performAbility` next to `cleanse`, and data in `abilities.json`.
- **The log** already records the moments that would cause stress (crits, deaths, Death's Door, a Deathblow survived). A stress rule could read the same events without changing how they are raised.
- **Statuses** can already carry psychological states, as status kinds with stat changes; afflictions would need their own turn behaviour in `statuses.ts`.
- **Configuration** has room in `combat.json` for a stress section.

## Values chosen by Claude for your review

The redesign asked for these systems without numbers, so these are starting values for the balance pass (M9):
- the 12 abilities above and the 8 enemy abilities;
- every resistance, Prabu's 60% Deathblow resistance, and the Death's Door penalties;
- 1 Health after a fight won at Death's Door;
- remains HP: dog 6, boar 12, raiders 8 and 6;
- stun guard +50 for 2 turns;
- the +25% flee bonus.

## Limits now

- **Prabu fights alone**, so player-side movement, Pinning shot and ally targeting can't be used in play yet. Tests cover them with a second fighter.
- **Not built:** guard, riposte and enemy reinforcements mid-fight. The formation already supports a newcomer (`bringIn`), and statuses have room for guard and riposte.
- **Art:** the figures are placeholders from the asset manifest (D-004).
