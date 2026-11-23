# Requirements (Stage 1, consolidated)

Every requirement traces to a decision (D-), a proposal awaiting approval (P-) or an open question (Q-) in CLAUDE.md §8.
Only **Confirmed** rows may be built. CLAUDE.md is the source; if this file disagrees with it, CLAUDE.md wins and this file gets fixed.

Status: ✅ confirmed · 🟡 proposed (needs owner approval) · ❓ open question · ⏸ deferred (not in the prototype)

## Platform and product

| ID | Requirement | Status | Source |
|---|---|---|---|
| R-01 | Single-player, browser-based; desktop first, mobile browser where practical. | ✅ | D-001 |
| R-02 | Name: The King of Survival. | ✅ | D-007 |
| R-03 | Fully client-side; no backend. | ✅ | D-005 |
| R-04 | Placeholder art only, managed through the asset manifest. | ✅ | D-004 |
| R-05 | No non-functional buttons; unbuilt features are hidden or clearly disabled with a reason. | ✅ | CLAUDE.md §2 |
| R-06 | Native mobile apps / PWA. | ⏸ | §6 |

## World

| ID | Requirement | Status | Source |
|---|---|---|---|
| R-10 | Tamil Nadu only, real geography, one continuous map; data structures allow more regions later. | ✅ | D-002 |
| R-11 | Prototype region: Madurai and the dry south. | ✅ | D-008 |
| R-12 | Settlement: the sanctuary's north-east forest edge, ~6 km north-west of Srivilliputhur town. | ✅ | D-011, D-021 |
| R-13 | Prototype area ~25 km around the settlement, plus Madurai city ruins as the one far destination. | ✅ | D-012 |
| R-14 | Discoverable places cover city ruins, water, hunting grounds, roads/rail/airport. | ✅ | D-013 |
| R-15 | Specific sites and the exact settlement spot. | ✅ | D-015, `docs/world.md` |
| R-16 | Madurai not struck directly; no radiation there (the patches were dropped by D-043). | ✅ | D-014, D-043 |
| R-17 | Where the fallout patches are. | ❓ | Q9 |
| R-18 | Safe zones, hostile territories, other settlements, route system. | ❓ | Owner-only (§3) |

## Story and character

| ID | Requirement | Status | Source |
|---|---|---|---|
| R-20 | Prabu, 27, hunter, ~20-person settlement; no preset moral alignment. | ✅ | §4 |
| R-21 | Canon timeline, the mother's revelation and her final wish, as written in §4. No sister. | ✅ | §4 |
| R-22 | Timeline inconsistencies T1–T3 (T4 answered). | ❓ | §4, D-063 |
| R-23 | Opening narrative format. | ❓ | Q7 |
| R-24 | Names of the settlement, mother, father, brother. | ❓ | §8 non-blocking |

## Prototype systems

| ID | Requirement | Status | Source |
|---|---|---|---|
| R-30 | Map of Tamil Nadu with pan/zoom. | ✅ | D-006, §5 |
| R-31 | Free movement to any point; roads faster, cross-country slower (and riskier from M6). | ✅ | D-009 |
| R-32 | Travel resolves in legs; the clock advances per leg; it can be interrupted between legs. | ✅ | D-010 |
| R-33 | Location discovery and exploration (fog of war): nearby sites known at start, ~3 km sight radius. | ✅ | D-006, D-015, D-017, D-018 |
| R-34 | Game time advances with actions (travel confirmed; scavenge/rest/craft proposed). | ✅ / 🟡 | D-010, P-003 |
| R-35 | Survival attributes and penalties. | 🟡 / ❓ | P-002, Q3 |
| R-36 | Inventory: definitions, stacking, weight, use, equip. | ✅ (contents 🟡) | D-006, P-001 |
| R-37 | Scavenging with loot tables and depletion. | ✅ (contents 🟡) | D-006, P-001 |
| R-38 | Small crafting system. | ✅ (recipes 🟡) | D-006, P-001 |
| R-39 | One real turn-based tactical combat encounter; not Darkest Dungeon's 4-rank formation. | ✅ | D-003, D-006 |
| R-40 | Combat design details: solo, range bands, fleeing (✅); mutated animals and raiders (✅); numbers (🟡). | ✅ / 🟡 | D-063, D-064, P-005 |
| R-41 | Basic progression. | 🟡 / ❓ | P-006, Q6 |
| R-42 | Data-driven events with choices. | ✅ (contents 🟡) | D-006, P-001 |
| R-43 | Screen flow and layout: map screen ✅ (D-016, `docs/ui.md`); other screens 🟡. | ✅ / 🟡 | D-016, P-007 |
| R-48 | Trips are cut into legs of at most 30 game minutes and stop by themselves when a meter falls to 25 or 0. | ✅ | D-035 |
| R-46 | Walking speeds: road 4.5 km/h, cross-country 3 km/h. | ✅ | D-019 |
| R-47 | A new game starts on Day 1 at 06:00. | ✅ | D-020 |
| R-44 | Permadeath with autosave: one run, saved after every leg and action, deleted on death. | ✅ | D-038 |
| R-49 | Clicking the selected place again (or double-clicking it) travels there; double-clicking open ground travels there. | ✅ | D-022 |
| R-50 | Survival meters Health, Food, Water, Rest; Food or Water at 0 lowers Health; Rest at 0 speeds Food/Water drain and raises encounter chance; radiation can lower Health. | ✅ | D-023, D-035 |
| R-51 | Vehicles from cycle to military vehicle, crafted and used for travel. | ✅ | D-024, D-030 to D-034 |
| R-52 | Item list and starting kit (knife, half-full lighter, half-charged torch); torch speeds searching; lighter fuel is rare. | ✅ | D-026, D-036, D-037 |
| R-53 | Unsafe water can make him ill (dehydration); food spoils, gently at first. | ✅ | D-027, D-028, D-036 |
| R-54 | Prototype vehicles: bullock cart (rare find), hand cart, cycle with trailer, auto-rickshaw; biodiesel scavenged; drop chances; wear faster off-road. | ✅ (numbers ❓) | D-031 to D-034 |
| R-56 | Carry 25 kg freely, up to 50 kg with Food, Water and Rest draining up to ×2. | ✅ | D-036 |
| R-57 | Injuries lower Health and block recovery until cured with a bandage or neem paste. | ✅ | D-039 |
| R-55 | Radiation: a zone within 30 km of the Trichy–Villupuram line; none in the prototype area or Madurai; each hour inside has a 1-in-4 chance of +5 radiation, lowering maximum Health. | ✅ | D-025, D-035, D-043 |
| R-58 | Water at any lake, tank, pond, reservoir or river; clean only from flowing rivers; unsafe water drinkable with risk until boiled or filtered. | ✅ | D-027, D-044 |
| R-59 | Search finds: take or leave; leftovers stay 96 h. Home stores wait for trading. Hunting is chance-based until combat. | ✅ | D-045, D-046 |
| R-45 | Content counts: 7 places + home (✅ D-015); ~20–25 items, 6–8 recipes, 3–4 enemies, 8–10 events (🟡). | ✅ / 🟡 | D-015, P-001 |

## Deferred (do not build)

Team building, expeditions, colony management, factions, karma, perk screen, romance, empire/territory, trading/currency, other states, native apps/PWA, final art. See CLAUDE.md §6.
