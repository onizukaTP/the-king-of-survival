# Decision log

Mirrors CLAUDE.md §8. Update both when the owner rules on something.

### Confirmed
- D-001 Browser-first, single-player; desktop primary, responsive mobile browser where practical.
- D-002 Tamil Nadu only, real geography, continuous map.
- D-003 Combat is turn-based and tactical; must NOT reproduce Darkest Dungeon's 4-rank formation.
- D-004 Placeholder art only, centrally managed.
- D-005 Client-side architecture, stack as in §7 (Claude's authority per owner).
- D-006 Prototype systems as listed in §5; deferred list in §6.
- D-007 Game name: **The King of Survival**.
- D-008 (Q1, part) Prabu's settlement and the prototype's playable locations are in **Madurai and the dry south**. The whole state is still rendered. The exact settlement spot is still open (Q1b).
- D-009 (Q2, replaces P-004) Free movement: the player can travel to any point. Routes use roads where faster and go cross-country (slower, riskier) elsewhere. M1 treats cross-country as uniform ground (no terrain cost yet); the "riskier" part arrives with events (M6).
- D-010 (Q2) Travel resolves in **legs**: each leg resolves instantly with a short cosmetic marker animation, the clock advances by the leg's time, and travel can be interrupted between legs. No real-time movement; state is never saved mid-leg.

### Proposed — awaiting owner approval
- P-001 Prototype content: 1 home settlement + 6–8 discoverable locations in one region; ~20–25 items; 6–8 recipes (craft anywhere); 3–4 enemy types; 8–10 text events.
- P-002 Survival attributes: Health, Hunger, Thirst, Fatigue, Radiation, with threshold penalties.
- P-003 Action-based time (travel/scavenge/rest/craft advance the clock).
- P-005 Combat: Prabu solo vs 1–3 enemies, range bands (close/mid/far), speed-based turn order; actions: attack, aim, move band, use item, flee.
- P-006 Progression: XP → levels with small stat gains; perks deferred.
- P-007 Screens: Title → Intro → World Map hub (HUD bar top, location side panel, bottom nav) → Location / Event dialog / Combat → Game Over; panels for Inventory, Crafting, Character, Journal, Menu. Mobile: full-screen map, bottom sheets.

### Open — blocking (do not implement affected areas until answered)
- Q1b Exact settlement spot within the Madurai/south region, and the prototype's discoverable locations (ties to P-001). *(blocks M1 locations and discovery; map rendering and travel can start)*
- Q3 Final survival attribute list; are injuries separate from Health? *(blocks M2)*
- Q4 Combat: solo or companion; positioning model; can the player flee? *(blocks M7)*
- Q5 Enemy mix: animals / human bandits / mutants. *(blocks M7)*
- Q6 Progression model. *(blocks M8)*
- Q7 Opening narrative: playable prologue with mother alive, text intro after her death, or death mid-play. *(blocks M8)*
- Q8 Death and save model: permadeath / manual saves / autosave. *(affects M0 save UX, M2)*
- T1–T4 Timeline/character inconsistencies in §4.

### Open — non-blocking
- Tamil localisation readiness.
- Names: settlement, mother, father, brother.
- Currency/bartering before the wealth arc.

When the owner answers, move the item to **Confirmed** with a new D-number and update `docs/decisions.md`.
