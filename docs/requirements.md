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
| R-12 | Settlement: Western Ghats foothills west of Srivilliputhur. | ✅ | D-011 |
| R-13 | Prototype area ~25 km around the settlement, plus Madurai city ruins as the one far destination. | ✅ | D-012 |
| R-14 | Discoverable places cover city ruins, water, hunting grounds, roads/rail/airport. | ✅ | D-013 |
| R-15 | Specific sites and the exact settlement spot. | ✅ | D-015, `docs/world.md` |
| R-16 | Madurai not struck directly; scattered low-level fallout patches. | ✅ | D-014 |
| R-17 | Where the fallout patches are. | ❓ | Q9 |
| R-18 | Safe zones, hostile territories, other settlements, route system. | ❓ | Owner-only (§3) |

## Story and character

| ID | Requirement | Status | Source |
|---|---|---|---|
| R-20 | Prabu, 27, hunter, ~20-person settlement; no preset moral alignment. | ✅ | §4 |
| R-21 | Canon timeline, the mother's revelation and her final wish, as written in §4. No sister. | ✅ | §4 |
| R-22 | Timeline inconsistencies T1–T4. | ❓ | §4 |
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
| R-40 | Combat design details. | 🟡 / ❓ | P-005, Q4, Q5 |
| R-41 | Basic progression. | 🟡 / ❓ | P-006, Q6 |
| R-42 | Data-driven events with choices. | ✅ (contents 🟡) | D-006, P-001 |
| R-43 | Screen flow and layout: map screen ✅ (D-016, `docs/ui.md`); other screens 🟡. | ✅ / 🟡 | D-016, P-007 |
| R-46 | Walking speeds: road 4.5 km/h, cross-country 3 km/h. | ✅ | D-019 |
| R-47 | A new game starts on Day 1 at 06:00. | ✅ | D-020 |
| R-44 | Save model (manual / autosave / permadeath). | ❓ | Q8 |
| R-45 | Content counts: 7 places + home (✅ D-015); ~20–25 items, 6–8 recipes, 3–4 enemies, 8–10 events (🟡). | ✅ / 🟡 | D-015, P-001 |

## Deferred (do not build)

Team building, expeditions, colony management, factions, karma, perk screen, romance, empire/territory, trading/currency, other states, native apps/PWA, final art. See CLAUDE.md §6.
