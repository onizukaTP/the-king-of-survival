import type { Content } from '../../../content/loader';
import type { Ability } from '../../../content/schemas';
import type { GameEvent } from '../../core/commands';
import type { Combatant, GameState } from '../../core/state';
import { addCondition } from '../conditions/conditions';
import { takeOne } from '../inventory/inventory';
import { damageMultiplierOf, damageRangeOf, statsOf } from './fighters';
import { moveBy, shuffle, stands } from './formation';
import { between, damage, heal, log, roll } from './resolve';
import { applyStatus, cleanse } from './statuses';
import { weaponProfile } from './stats';

// Abilities (D-069): where each can be used from and what it can hit come from its data; using one
// goes through one pipeline (hit, crit, damage, healing, effects, movement) for every fighter.

const other = (side: Combatant['side']) => (side === 'player' ? 'enemy' : 'player');
const isMarked = (c: Combatant) => c.statuses.some((s) => s.kind === 'mark');

/** Who an ability could hit right now. A big fighter in two target ranks is still one target. */
export function validTargets(state: GameState, user: Combatant, ability: Ability): Combatant[] {
  const t = ability.target;
  if (t.side === 'self') return [user];
  const side = t.side === 'ally' ? user.side : other(user.side);
  return state.combat!.combatants.filter((c) =>
    c.side === side && (!c.corpse || (t.side === 'enemy' && t.corpses)) && t.ranks.some((r) => stands(c, r)));
}

/** Arrows for an ammo ability: the protagonist's weapon's ammo. */
function ammoOf(state: GameState, user: Combatant, content: Content): string | null {
  return user.protagonist ? weaponProfile(state, content).ammo ?? null : null;
}

/** Why a fighter can't use an ability now, or null when it can. */
export function abilityBlocked(state: GameState, user: Combatant, ability: Ability, content: Content): string | null {
  if (!ability.usableFrom.includes(user.rank)) return `Wrong position: usable from rank ${ability.usableFrom.join(', ')}`;
  if (ability.ammo) {
    const ammo = ammoOf(state, user, content);
    if (ammo && !state.inventory.stacks.some((s) => s.itemId === ammo)) return `No ${content.items[ammo]?.name.toLowerCase() ?? 'ammo'}s`;
  }
  if (!validTargets(state, user, ability).length) return `No target in rank ${ability.target.ranks.join(', ')}`;
  return null;
}

/** Chance (%) to hit and to crit a target with an ability, for the screen and the attack. */
export function odds(state: GameState, user: Combatant, ability: Ability, target: Combatant, content: Content) {
  const me = statsOf(state, user, content);
  const marked = isMarked(target) ? ability.vsMarked : undefined;
  const [lo, hi] = content.combat.hitChance;
  // Remains don't dodge; allies and yourself are never missed.
  const dodge = target.corpse ? 0 : statsOf(state, target, content).dodge;
  const hit = ability.target.side !== 'enemy' ? 100 : Math.min(hi, Math.max(lo, me.acc + (ability.accuracy ?? 0) - dodge));
  const luck = user.protagonist ? me.luck * content.combat.luck.critRate : 0;
  return { hit, crit: Math.min(100, me.critRate + (ability.crit ?? 0) + (marked?.crit ?? 0) + luck) };
}

/** One hit's damage: (roll + ATK) × ability × crit × (1 − DEF) × the user's multipliers; at least 1. */
function hitDamage(state: GameState, user: Combatant, ability: Ability, target: Combatant, crit: boolean, content: Content): number {
  const me = statsOf(state, user, content);
  const mult = (ability.damage ?? 0) + (isMarked(target) ? ability.vsMarked?.damage ?? 0 : 0);
  const base = (between(state, damageRangeOf(state, user, content)) + me.atk) * mult;
  const afterCrit = crit ? (base * me.critDamage) / 100 : base;
  const def = target.corpse ? 0 : Math.min(content.combat.defCap, Math.max(0, statsOf(state, target, content).def));
  return Math.max(1, Math.round(afterCrit * (1 - def / 100) * damageMultiplierOf(state, user, content)));
}

/**
 * Uses an ability. `targetUid` picks the target of a single-target ability; an all-targets ability
 * hits everyone in its ranks once. The caller has checked `abilityBlocked`.
 */
export function performAbility(state: GameState, user: Combatant, ability: Ability, targetUid: string | undefined, content: Content, events: GameEvent[]) {
  const combat = state.combat!;
  const valid = validTargets(state, user, ability);
  const targets = ability.target.side === 'self' ? [user]
    : ability.target.mode === 'all' ? valid.filter((c) => !c.corpse)
      : valid.filter((c) => c.uid === targetUid);
  log(state, { kind: 'ability', actor: user.uid, abilityId: ability.id, target: targets.length === 1 ? targets[0]!.uid : undefined });
  const ammo = ability.ammo ? ammoOf(state, user, content) : null;
  if (ammo) {
    takeOne(state.inventory, state.inventory.stacks.findIndex((s) => s.itemId === ammo));
    combat.arrowsShot += 1;
  }

  for (const target of targets) {
    if (state.dead) return;
    const o = odds(state, user, ability, target, content);
    if (roll(state) * 100 >= o.hit) {
      log(state, { kind: 'miss', actor: user.uid, target: target.uid });
      continue;
    }
    if (ability.damage !== undefined) {
      const crit = roll(state) * 100 < o.crit;
      const dealt = hitDamage(state, user, ability, target, crit, content);
      log(state, { kind: 'hit', actor: user.uid, target: target.uid, amount: dealt, crit });
      const wasCorpse = target.corpse;
      damage(state, target, dealt, content, events);
      if (crit && !wasCorpse && target.protagonist && !state.dead) {
        // D-039: a critical hit injures him; some leave more (a dirty bite).
        state.survival.injured = true;
        const cc = user.side === 'enemy' ? content.enemies[user.defId]!.critCondition : undefined;
        if (cc && roll(state) < cc.chance) addCondition(state, cc.conditionId, content, events);
      }
      if (state.dead) return;
    }
    if (ability.heal) heal(state, target, between(state, ability.heal), content);
    for (const effect of ability.effects ?? []) {
      const on = effect.onSelf ? user : target;
      if (!combat.combatants.includes(on) || on.corpse) continue;
      if (effect.kind === 'cleanse') cleanse(on, content);
      else if (effect.kind === 'extra_turn') combat.queue.splice(1, 0, on.uid);
      else if (effect.kind === 'push' || effect.kind === 'pull' || effect.kind === 'shuffle') {
        // Moving yourself always works; moving someone else is resisted (D-069).
        const resist = on === user ? 0 : statsOf(state, on, content)[content.combat.moveResist as 'moveRes'] ?? 0;
        if (roll(state) * 100 >= (effect.chance ?? 100) - resist) {
          log(state, { kind: 'resisted', target: on.uid, status: effect.kind });
          continue;
        }
        const steps = effect.amount ?? 1;
        const moved = effect.kind === 'shuffle' ? shuffle(combat, on, roll(state))
          : moveBy(combat, on, effect.kind === 'pull' ? steps : -steps);
        if (moved) log(state, { kind: 'move', target: on.uid, amount: on.rank });
      } else {
        applyStatus(state, on, effect, content);
      }
    }
  }
  if (ability.selfMove && combat.combatants.includes(user) && moveBy(combat, user, ability.selfMove)) {
    log(state, { kind: 'move', target: user.uid, amount: user.rank });
  }
}
