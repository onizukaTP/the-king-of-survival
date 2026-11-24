import type { CombatState, Combatant } from '../../core/state';

// Formations (D-069): each side has ranks 1 (front) to 4 (back). A side is kept packed from the
// front: ranks follow from the order of its fighters and their sizes, so when one is gone for good
// the rest close up. Remains (corpses) keep their ranks until cleared.

export const RANKS = 4;

/** Ranks a fighter stands in: a size-2 fighter at rank 1 takes ranks 1 and 2. */
export const ranksOf = (c: Combatant) => Array.from({ length: c.size }, (_, i) => c.rank + i);
export const stands = (c: Combatant, rank: number) => rank >= c.rank && rank < c.rank + c.size;

/** One side's fighters (living, at Death's Door or remains), front to back. */
export function sideOf(combat: CombatState, side: Combatant['side']): Combatant[] {
  return combat.combatants.filter((c) => c.side === side).sort((a, b) => a.rank - b.rank);
}

/** Gives a side's fighters packed ranks in the given order. */
function layout(order: Combatant[]) {
  let rank = 1;
  for (const c of order) {
    c.rank = rank;
    rank += c.size;
  }
}

/** Ranks taken on a side. */
export const ranksUsed = (combat: CombatState, side: Combatant['side']) => sideOf(combat, side).reduce((n, c) => n + c.size, 0);

/**
 * Moves a fighter `steps` places: positive towards the front, negative towards the back, swapping
 * with whoever is there. Remains block the way (D-069). Returns how many places it actually moved.
 */
export function moveBy(combat: CombatState, c: Combatant, steps: number): number {
  const order = sideOf(combat, c.side);
  let i = order.indexOf(c);
  const dir = steps > 0 ? -1 : 1;
  let moved = 0;
  for (let n = 0; n < Math.abs(steps); n++) {
    const next = order[i + dir];
    if (!next || next.corpse) break;
    order[i] = next;
    order[i + dir] = c;
    i += dir;
    moved += 1;
  }
  if (moved) layout(order);
  return moved;
}

/** Moves a fighter to another place in its formation, chosen by `pick` (0 ≤ pick < 1). */
export function shuffle(combat: CombatState, c: Combatant, pick: number): number {
  const order = sideOf(combat, c.side);
  if (order.length < 2) return 0;
  const from = order.indexOf(c);
  const others = order.map((_, i) => i).filter((i) => i !== from);
  const to = others[Math.floor(pick * others.length)]!;
  order.splice(from, 1);
  order.splice(to, 0, c);
  layout(order);
  return Math.abs(to - from);
}

/** Takes a fighter off the field (dead without remains, remains cleared); the rest close up. */
export function removeFromField(combat: CombatState, c: Combatant) {
  combat.combatants = combat.combatants.filter((x) => x !== c);
  layout(sideOf(combat, c.side));
}

/**
 * Brings a fighter onto a side (a summon or a late arrival): at the back if there is room, otherwise
 * in place of the frontmost remains big enough. Returns whether it found a place.
 */
export function bringIn(combat: CombatState, c: Combatant): boolean {
  const order = sideOf(combat, c.side);
  if (ranksUsed(combat, c.side) + c.size <= RANKS) {
    combat.combatants.push(c);
    layout([...order, c]);
    return true;
  }
  const corpse = order.find((x) => x.corpse && x.size >= c.size);
  if (!corpse) return false;
  order[order.indexOf(corpse)] = c;
  combat.combatants = [...combat.combatants.filter((x) => x !== corpse), c];
  layout(order);
  return true;
}
