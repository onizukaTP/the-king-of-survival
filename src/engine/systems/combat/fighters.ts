import type { Content } from '../../../content/loader';
import type { Ability, CombatStats } from '../../../content/schemas';
import { maxHealth, type Combatant, type GameState } from '../../core/state';
import { conditionEffects } from '../conditions/conditions';
import { playerStats, weaponProfile } from './stats';

// What a fighter is right now: its health, stats (with statuses and Death's Door), damage roll and
// abilities. Player-side and enemy fighters go through the same functions, so the rest of the engine
// never asks which kind it has (and companions can join later, D-063, D-069).

/** Health now. The protagonist's is the real Health meter (D-023). */
export const hpOf = (state: GameState, c: Combatant) => (c.protagonist ? state.survival.health : c.hp);

export function maxHpOf(state: GameState, c: Combatant, content: Content): number {
  if (c.protagonist) return maxHealth(state.survival, content);
  return c.side === 'enemy' ? content.enemies[c.defId]!.hp : c.hp;
}

export function setHp(state: GameState, c: Combatant, hp: number) {
  if (c.protagonist) state.survival.health = Math.max(0, hp);
  c.hp = Math.max(0, Math.round(hp));
}

/** Base combat stats before statuses: the character's (with its weapon) or the enemy's. */
function baseStats(state: GameState, c: Combatant, content: Content): CombatStats {
  if (c.protagonist) return playerStats(state, content);
  if (c.side === 'enemy') return content.enemies[c.defId]!.stats;
  return content.characters[c.defId]!.stats;
}

/** Stats now: base, plus buffs and debuffs, minus the Death's Door penalties (D-069). */
export function statsOf(state: GameState, c: Combatant, content: Content): CombatStats & { luck: number } {
  const stats: Record<string, number> = { luck: 0, ...baseStats(state, c, content) };
  for (const s of c.statuses) {
    if (content.combat.statuses[s.kind]?.modifiesStat && s.stat) stats[s.stat] = (stats[s.stat] ?? 0) + (s.amount ?? 0);
  }
  if (c.deathsDoor) {
    stats.acc! += content.combat.deathsDoor.acc;
    stats.spd! += content.combat.deathsDoor.spd;
  }
  return stats as CombatStats & { luck: number };
}

/** The fighter's damage roll: the protagonist's weapon, or the enemy's own. */
export function damageRangeOf(state: GameState, c: Combatant, content: Content): [number, number] {
  if (c.side === 'enemy') return content.enemies[c.defId]!.damage;
  return c.protagonist ? weaponProfile(state, content).damage : content.combat.unarmed.damage;
}

/** What multiplies the damage it deals: Weak (D-061) for the protagonist, Death's Door for anyone on the player side. */
export function damageMultiplierOf(state: GameState, c: Combatant, content: Content): number {
  let m = c.protagonist ? conditionEffects(state.survival, content).damage : 1;
  if (c.deathsDoor) m *= content.combat.deathsDoor.damageMultiplier;
  return m;
}

/** Abilities it has: a character's own plus its weapon's; an enemy's from its data. */
export function abilitiesOf(state: GameState, c: Combatant, content: Content): Ability[] {
  const ids = c.side === 'enemy'
    ? content.enemies[c.defId]!.abilities.map((a) => a.id)
    : [...(c.protagonist ? weaponProfile(state, content).abilities : content.combat.unarmed.abilities), ...content.characters[c.defId]!.abilities];
  return ids.map((id) => content.abilities[id]!);
}

export const nameOf = (c: Combatant, content: Content) =>
  c.side === 'enemy' ? content.enemies[c.defId]?.name ?? c.defId : content.characters[c.defId]?.name ?? c.defId;
