import type { Content } from '../../../content/loader';
import type { Combatant, GameState } from '../../core/state';
import { abilityBlocked, validTargets } from './abilities';
import { hpOf } from './fighters';
import { sideOf } from './formation';
import { roll } from './resolve';

// Enemy decisions (D-069). One routine reads each enemy's data: its abilities and their weights, the
// ranks it prefers and how it picks targets. Each turn ends in exactly one action, so a fight can't
// stall: use an ability that works from where it stands, else step towards its preferred ranks,
// else a fallback ability (P-023: the archer's bare hands), else pass.

export type Decision =
  | { kind: 'ability'; abilityId: string; target: string | undefined }
  | { kind: 'move'; steps: number }
  | { kind: 'pass' };

const pickOne = <T>(state: GameState, list: T[]): T => list[Math.floor(roll(state) * list.length)]!;

function pickTarget(state: GameState, rule: string, targets: Combatant[]): Combatant {
  const living = targets.filter((c) => !c.corpse);
  const pool = living.length ? living : targets;
  if (rule === 'lowest_hp') return pool.reduce((a, b) => (hpOf(state, b) < hpOf(state, a) ? b : a));
  if (rule === 'front') return pool.reduce((a, b) => (b.rank < a.rank ? b : a));
  if (rule === 'marked') {
    const marked = pool.filter((c) => c.statuses.some((s) => s.kind === 'mark'));
    if (marked.length) return pickOne(state, marked);
  }
  return pickOne(state, pool);
}

/** Whether a step that way has someone (not remains) to swap with. */
function canStep(state: GameState, c: Combatant, steps: number): boolean {
  const order = sideOf(state.combat!, c.side);
  const next = order[order.indexOf(c) + (steps > 0 ? -1 : 1)];
  return Boolean(next && !next.corpse);
}

export function decide(state: GameState, c: Combatant, content: Content): Decision {
  const def = content.enemies[c.defId]!;
  const works = (a: (typeof def.abilities)[number]) => !abilityBlocked(state, c, content.abilities[a.id]!, content);
  const main = useAbility(state, c, def.abilities.filter((a) => !a.fallback && works(a)), content);
  if (main) return main;
  // Nothing works from here: head for the ranks it prefers.
  const [lo, hi] = [Math.min(...def.preferredRanks), Math.max(...def.preferredRanks)];
  const towards = c.rank > hi ? 1 : c.rank < lo ? -1 : 0;
  if (towards && canStep(state, c, towards)) return { kind: 'move', steps: towards };
  const fallback = useAbility(state, c, def.abilities.filter((a) => a.fallback && works(a)), content);
  if (fallback) return fallback;
  if (towards) return { kind: 'move', steps: towards };
  // In its ranks but still nothing to do (everything out of reach): edge forward if it can.
  return c.rank > 1 ? { kind: 'move', steps: 1 } : { kind: 'pass' };
}

/** A weighted pick among the usable abilities, with a target; null when there are none. */
function useAbility(state: GameState, c: Combatant, usable: Content['enemies'][string]['abilities'], content: Content): Decision | null {
  const def = content.enemies[c.defId]!;
  if (usable.length) {
    const total = usable.reduce((n, a) => n + a.weight, 0);
    let r = roll(state) * total;
    const chosen = usable.find((a) => (r -= a.weight) < 0) ?? usable[usable.length - 1]!;
    const ability = content.abilities[chosen.id]!;
    // The AI never wastes a blow on remains.
    const targets = validTargets(state, c, ability).filter((t) => !t.corpse);
    if (ability.target.mode === 'single' && ability.target.side !== 'self' && !targets.length) return { kind: 'pass' };
    const target = ability.target.mode === 'single' && ability.target.side !== 'self' ? pickTarget(state, def.ai.target, targets).uid : undefined;
    return { kind: 'ability', abilityId: chosen.id, target };
  }
  return null;
}
