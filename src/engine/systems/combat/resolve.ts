import type { Content } from '../../../content/loader';
import type { GameEvent } from '../../core/commands';
import { nextRandom } from '../../core/rng';
import type { CombatLog, Combatant, GameState } from '../../core/state';
import { hpOf, maxHpOf, setHp, statsOf } from './fighters';
import { removeFromField } from './formation';

// Damage, healing, Death's Door and death (D-069), in one place so every source (a hit, a bleed,
// a blight tick) goes through the same rules.

export function roll(state: GameState): number {
  const [value, next] = nextRandom(state.rngState);
  state.rngState = next;
  return value;
}
export const between = (state: GameState, [min, max]: readonly [number, number]) => min + Math.floor(roll(state) * (max - min + 1));

export const log = (state: GameState, entry: CombatLog) => state.combat!.log.push(entry);

/** A fighter dies. The protagonist's death ends the run (D-038); an enemy may leave its remains. */
export function kill(state: GameState, c: Combatant, content: Content, events: GameEvent[]) {
  const combat = state.combat!;
  log(state, { kind: 'killed', target: c.uid, defId: c.defId });
  if (c.protagonist) {
    setHp(state, c, 0);
    state.dead = true;
    state.travel = null;
    events.push({ type: 'died', cause: 'killed' });
    return;
  }
  if (c.side === 'enemy') combat.defeated.push(c.defId);
  const corpse = c.side === 'enemy' ? content.enemies[c.defId]!.corpse : null;
  if (corpse) {
    c.corpse = true;
    c.hp = corpse.hp;
    c.statuses = [];
    c.deathsDoor = false;
  } else {
    removeFromField(combat, c);
  }
}

/**
 * Deals damage to a fighter. A player-side fighter at 0 goes to Death's Door; each further blow,
 * bleed or blight tick there is a Deathblow check against deathblowRes. Enemies die at 0. Damage
 * to remains wears them away until they are cleared.
 */
export function damage(state: GameState, c: Combatant, amount: number, content: Content, events: GameEvent[]) {
  if (amount <= 0 || state.dead) return;
  if (c.corpse) {
    c.hp -= amount;
    if (c.hp <= 0) {
      log(state, { kind: 'corpse_cleared', target: c.uid, defId: c.defId });
      removeFromField(state.combat!, c);
    }
    return;
  }
  if (c.side === 'player' && c.deathsDoor) {
    const survived = roll(state) * 100 < statsOf(state, c, content).deathblowRes;
    log(state, { kind: 'deathblow', target: c.uid, survived });
    if (!survived) kill(state, c, content, events);
    return;
  }
  const hp = hpOf(state, c) - amount;
  if (hp > 0) return setHp(state, c, hp);
  setHp(state, c, 0);
  if (c.side === 'player') {
    c.deathsDoor = true;
    log(state, { kind: 'deaths_door', target: c.uid });
  } else {
    kill(state, c, content, events);
  }
}

/** Heals a fighter; any healing above 0 brings a player-side fighter back from Death's Door. */
export function heal(state: GameState, c: Combatant, amount: number, content: Content) {
  const hp = Math.min(maxHpOf(state, c, content), hpOf(state, c) + amount);
  setHp(state, c, hp);
  if (hp > 0) c.deathsDoor = false;
  log(state, { kind: 'heal', target: c.uid, amount });
}
