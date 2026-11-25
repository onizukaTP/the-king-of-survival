import type { Content } from '../../../content/loader';
import type { Stats, WeaponProfile } from '../../../content/schemas';
import type { GameState } from '../../core/state';
import { levelGains } from '../progression/progression';
import { charmEffects } from '../charms/charms';

/** The equipped weapon's fighting profile, or bare hands. */
export function weaponProfile(state: GameState, content: Content): WeaponProfile {
  const weapon = state.inventory.weapon;
  return (weapon && content.items[weapon]?.combat) || content.combat.unarmed;
}

/**
 * Prabu's stats now (D-065, D-066, D-076, D-086): his base plus what his levels, the weapon and his charms add.
 * Attire and hunting items (later) add to the same total.
 */
export function playerStats(state: GameState, content: Content): Stats {
  const stats = { ...content.characters[state.player.characterId]!.stats };
  for (const bonus of [levelGains(state.progression.level, content), weaponProfile(state, content).bonus ?? {}, charmEffects(state.inventory, content).stats]) {
    for (const key of Object.keys(bonus) as (keyof Stats)[]) stats[key] += bonus[key] ?? 0;
  }
  return stats;
}
