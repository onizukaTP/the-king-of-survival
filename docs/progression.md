# Progression, intro and journal (M8) — approved (D-070 to D-076), live

Approved on 2026-11-25:
- **D-076 (P-020, with changes):** the XP table, the 10 levels with fixed gains and the Journal, as proposed below.
- **The intro is the owner's text** (Prabu's first-person monologue), replacing Claude's draft, with two corrections the owner chose.
- **The story changed at the same time:**
  - **D-073:** the missing sibling is a **younger sister**, whose name is revealed later (*superseded by D-081: Prabu knows her name, Nila, from the start*). The **father is dead**, but Prabu doesn't know it yet.
  - **D-074:** the mother's clue **came to her in a dream**. She was a devotee of **Lord Vishnu** and believed her daughter is still alive.
  - **D-075:** a run starts on **Day 1 at 12:00**, the moment she dies, during a **solar eclipse**. It sets the scene only; daylight rules apply.

## Progression (D-070)

### XP

| Source | XP |
|---|---|
| Winning a fight | The enemies' XP: wild dog 10, mutated boar 30, raider with a blade 25, raider with a bow 20 |
| Fleeing a fight | 0 |
| A successful hunt | 10 |
| Discovering a place (D-018) | 15 |
| A search that finds something | 2 |
| Crafting a recipe for the first time | 5 |
| Some event outcomes | Catching the goat 10, pinning the snake 5, slipping past the roadblock 15, the smoke's tracks 10 |

XP amounts are data (on enemies, events and `progression.json`), so the balance pass (M9) can tune them without code.

### Levels

Level 1 at the start, **level 10 at most**. Each level gives a **fixed** gain; there's no choice screen, since perks and a perk screen are deferred (§6).

| Level | Total XP | Gain |
|---|---|---|
| 2 | 100 | ATK +1 |
| 3 | 250 | ACC +3, Dodge +2 |
| 4 | 450 | SPD +1 |
| 5 | 700 | Hunting +5, crit +2% |
| 6 | 1,000 | DEF +5% |
| 7 | 1,350 | ATK +1, Deathblow res +5% |
| 8 | 1,750 | SPD +1 |
| 9 | 2,200 | ACC +3, Dodge +2 |
| 10 | 2,700 | ATK +1, crit +3% |

- **Stats:** gains add to Prabu's stats with his weapon's (D-066), so they show in the Stats block and count in fights, hunting and searching.
- **Health:** maximum Health stays 100.
- **Permadeath:** a new run starts at level 1 (D-038).
- **Pace:** a 30–60 minute session should reach about level 3–5.

## The intro (D-071, D-076): the owner's text

**When it shows:**
- After **New Game**, before the map: the moment his mother dies, at midday during the eclipse.
- The run then starts on **Day 1 at 12:00** at home.
- It shows once per run, with **Next** and **Skip**; reloading doesn't show it again.

**How it looks:**
- Five screens, split at the text's natural breaks.
- One muted placeholder image behind the text (D-004).
- The words live in `story.json`, so they can be edited (or translated later) without code.

**The text**, exactly as written by the owner, with the corrections they chose: "Twenty-seven years" (canon age 27), "my father or my sister" (D-073) and "Vaikuntha" (D-077):

**Screen 1**
> I was born on the day the bombs fell.
>
> The sky was eerie and dark, devoid of life. The world stood still. And in that moment, as I looked into my mother's eyes, I heard my name for the first time.
>
> "Prabu."
>
> The one who would rule this accursed world.

**Screen 2**
> Twenty-seven years have passed. My mother is dead, and I am left with the burden of a goal. Somewhere in this disease-ridden, poisoned world, my father or my sister may still be alive. I do not know.
>
> But I know what I must become.
>
> A king.

**Screen 3**
> My mother always asked me to be kind. To find someone I could love, someone who would love me as deeply as she did.
>
> Overly optimistic. Just like her.
>
> She believed that even in a world like this, love was worth fighting for. That kindness could survive where everything else had perished.

**Screen 4**
> But my mother is gone now.
>
> And unlike her, I have no room for such hopes. I care only about our survival. About finding my family. About making sure that no one can take away what little I have left.
>
> I will carve a kingdom out of this wasteland. I will conquer lands, break those who stand in my way, and survive.

**Screen 5**
> Forgive me, Mother. I do not think I can be kind. In this world, kindness is death's closest friend.
>
> I will live. I will conquer. And when my time comes, I pray that your soul will find its way to Vaikuntha.
>
> Until then, I will make this world kneel.
>
> For you, Mother.

**First message after the intro:**
- Draft: "Day 1, midday. The eclipse is passing."
- This is Claude's wording and can be changed; it adds nothing to canon.

## The journal

- **Where:** a **Journal** button in the top bar opens a panel like Pack and Craft.
- **"Find my sister":** the quest entry, opened by the intro. Its text is the owner's (D-083): "Mother died saying the name Nila. She might be referring to your lost sister. Gather clues to find her."
  - It gives no place and no direction (D-074).
- **"My mother's wish":** her three wishes as a reminder (find my sister, find someone to love, live a good and happy life). Nothing is scored.
- **Notes:** kept automatically: places discovered, fights won, levels gained, each with the day and time. The last 30 are kept.
- **Level and XP:** the panel's header shows Level and XP to the next level; the Stats block shows them too.
- **Names:** Prabu knows his sister's name from the start (D-081), so the journal can call her Nila. The intro keeps the owner's wording, "my sister".
- **Later:** no quest steps beyond the sister entry until the story is designed further.
- **Owner's text:** the sister entry above is the owner's wording (D-083), kept in `story.json`.
- **Outlook (D-078):** the intro is Prabu's starting resolve; the journal doesn't judge him.

## Engine and saves (Claude's side)

- **Start time:** a new game starts at Day 1 12:00 (`new-game.json`), D-075.
- **Save v10** adds:
  - `progression: { xp, level }`, `journal: { notes[] }`, `introSeen`, and the recipes crafted once;
  - a migration where old runs start at level 1 with 0 XP and the intro marked seen.
- **Data:** enemy `xp`, event outcome `xp`, `progression.json` (XP sources and the level table), and `story.json` (the intro screens and the journal texts).
- **Command:** `intro.done`. Level-ups appear in the message line: "Level 3: ACC +3, Dodge +2."
- **Tests:**
  - XP from each source, thresholds, gains and the cap;
  - gains counting in fights and hunts;
  - journal notes, the intro shown once, saves and the migration.
  - e2e: New Game → intro → Skip → map at 12:00; a won fight raises XP; the Journal shows "Find my sister".

## Not included

- **Not built:** perks, skill trees and a stat choice at level-up (deferred, §6).
- **Not invented:** names, how or when the father died, what the dream showed beyond her belief, or any plot beyond the sister entry.
