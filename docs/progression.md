# Progression, opening and journal (M8) — proposed (P-020), awaiting approval

Everything below is a proposal. Nothing is built. The story text is a **draft for the owner to approve or rewrite** (D-072); nothing in it is canon until approved.

## Already decided

- **D-070:** XP and levels. Fights, hunts, finds and events give XP; each level gives a small stat gain; **perks stay deferred** (and the perk selection screen is on the deferred list, §6).
- **D-071:** a short **text intro after his mother's death**: who Prabu is, her death, her clue, her wish. Then the run starts at home as now.
- **D-072:** Claude drafts the mother's final scene and two or three options for her clue; the owner approves or rewrites.
- **Canon (§4) the intro must respect:**
  - Prabu is 27, born on the day of the Annihilation, and the hunter of a settlement of about 20.
  - About ten years ago a scuffle during the mass migration separated the family; he and his mother lost his father and younger brother.
  - They came to the settlement from the north, where her sickness began (D-040).
  - She has found a trace of his brother.
  - Her wish is that he finds his brother, finds love, and lives a good and happy life, not merely power or wealth.
  - **There is no sister.** No names (mother, father, brother, settlement) are used.
- **M8 acceptance (§9):** progression works; the approved opening plays; the brother quest appears in the journal.

## Progression

### XP

| Source | XP |
|---|---|
| Winning a fight | The enemies' XP: wild dog 10, mutated boar 30, raider with a blade 25, raider with a bow 20 |
| Fleeing a fight | 0 |
| A successful hunt | 10 |
| Discovering a place (D-018) | 15 |
| A search that finds something | 2 |
| Crafting a recipe for the first time | 5 |
| Some event outcomes | 5–15: catching the goat 10, pinning the snake 5, slipping past the roadblock 15, the smoke's tracks 10 |

XP amounts are data (on enemies, events and a small config), so the balance pass (M9) can tune them without code.

### Levels

Level 1 at the start, **level 10 at most** in the prototype. Each level gives a **fixed** gain, so there is no choice screen; a choice would be close to the deferred perk screen.

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

- **How fast it goes:** a 30–60 minute session (M9's target) should reach about level 3–5: a few fights, some hunts and the first discoveries.
- **What a level doesn't change:** maximum Health stays 100 (radiation and Weak still lower it), so survival keeps its weight.
- **Gains** add to Prabu's stats in the same total as his weapon (D-066), so they show in the Stats block and count in fights, hunting and searching.
- **Permadeath (D-038):** levels go with the run; a new run starts at level 1.

## The opening (DRAFT for approval)

**When it shows:** after **New Game**, before the map, as 4 short text screens with **Next** and **Skip**. It shows once per run; a reloaded save doesn't show it again.

**Placeholder art:** one muted placeholder image behind the text (D-004).

**When it happens (D-020):** the intro happens the night before. The run still starts on **Day 1 at 06:00**, the first morning after her death, so D-020 stands.

### Screen 1: who he is

> Twenty-seven years ago the sky burned, and Prabu was born the same day.
> He grew up in a world that was already over. Now he is the hunter of a small settlement in the foothills, twenty mouths and a failing field, where the forest is the only thing still giving.

### Screen 2: the road from the north

> Ten years ago, when the wells in the north ran dry, everyone walked south. In the crush of that road his family was torn apart. His father and his younger brother were lost in the crowd, and Prabu and his mother never found them again.
> They came here with nothing. The sickness she carried had already started.

### Screen 3: her last night (the clue: see the options below)

> This season he stopped going out to hunt so he could sit with her. Last night, near the end, she pressed his hand and told him she had found something: a trace of his brother.
> *[The clue, once chosen.]*

### Screen 4: her wish

> Her last words were not about revenge or riches.
> Find your brother. Find someone to love. Live a good life, a happy one.
> By morning they had laid her to rest. The settlement is still hungry, and the world is still dangerous. What he becomes now is up to him.

**The wish wording is a draft.** The canon wish has three parts (find the brother, find love, live a good and happy life); the exact dialogue is owner-only (§4).

**What the draft adds beyond canon, so you can strike it:**
- that the migration went south (from D-040: they came from the north);
- that drought drove it ("the wells in the north ran dry");
- that the separation happened "in the crush" of the road (canon: a chaotic scuffle);
- that she told him "last night";
- "laid her to rest", which deliberately avoids naming a funeral rite.

### Options for her clue (pick one, change one, or write your own)

| Option | The trace | What it means for play |
|---|---|---|
| **A. A traveller's word** | A trader passing through months ago spoke of a young man from the north, about the right age, seen with a group heading towards Madurai. | Gives the long trip to Madurai (D-012) a story reason. Nothing is found there in the prototype; the journal just points that way. |
| **B. Something of his** | She traded for a small object that she knew at once as her younger son's, and the trader said where it came from (to be decided: a place in the prototype area or beyond). | A physical keepsake in the pack (a story item, weightless, can't be dropped). |
| **C. A message passed on** | Word reached her, through a chain of strangers, that someone was asking after a woman of her description from the northern road. | Says only that he may be alive and looking. No direction yet; it leaves the most room for later story. |

I'd recommend **A**: it fits the prototype's one long journey and promises no content that isn't built.

## The journal

- **Where:** a **Journal** button in the top bar opens a panel like Pack and Craft.
- **Brother quest entry:** **"Find my brother"**, opened by the intro, with the approved clue in one or two lines.
- **Mother's wish:** **"My mother's wish"**, listing its three parts as a reminder; nothing is scored or tracked.
- **Notes:** a short list kept automatically: places discovered, fights won, levels gained, each with the day and time. The last 30 are kept.
- **Level and XP:** the panel's header shows Level and XP to the next level. The Stats block in the Pack shows them too.
- **Later:** no quest steps beyond the brother entry until the story is designed further (§4 forbids inventing plot).

## Engine and saves (Claude's side)

- **Save v10** adds `progression: { xp, level }`, `journal: { notes[] }`, `introSeen`, and the recipes crafted once. Migration: old runs start at level 1 with 0 XP, the intro marked seen (so it doesn't interrupt a run in progress), and the brother entry present.
- **Data:**
  - Enemy `xp`, event outcome `xp`, and `progression.json` for the XP table and level gains.
  - The intro text lives in a data file (`story.json`), so the owner's wording can replace the draft without code, and Tamil can come later.
- **Command:** `intro.done` (Next past the last screen, or Skip).
- **Messages:** level-ups appear in the message line, for example "Level 3: ACC +3, Dodge +2."
- **Tests:** XP from every source, thresholds and gains, the cap, stats with gains in fights and hunting, journal notes, the intro shown once, saves and migration. e2e: New Game → intro → Skip → map; win a fight → XP rises; Journal shows the brother entry.

## Not included

- Perks, skill trees, a stat choice at level-up (deferred, §6).
- Names, more family history, or any plot beyond the approved clue.
- A playable prologue (D-071 chose the text intro).

## Choices for the owner

1. **XP and levels:** the XP amounts, the 10-level table and the fixed gains. Keep or change?
2. **The intro:** approve the four screens as drafted, or edit the wording? The mother's words especially.
3. **The clue:** A, B, C, or your own?
4. **The journal:** brother entry, the wish as a reminder, and automatic notes. Approve?
5. **When the intro happens:** the night before Day 1, with the run still starting at 06:00. All right?
