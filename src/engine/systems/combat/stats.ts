import type { Content } from '../../../content/loader';
import type { Stats, WeaponProfile } from '../../../content/schemas';
import type { GameState } from '../../core/state';

/** The equipped weapon's fighting profile, or bare hands. */
export function weaponProfile(state: GameState, content: Content): WeaponProfile {
  const weapon = state.inventory.weapon;
  return (weapon && content.items[weapon]?.combat) || content.combat.unarmed;
}

/**
 * Prabu's stats now (D-065, D-066): his base plus what the weapon adds. Attire, charms and
 * hunting items (later, D-062) add to the same total.
 */
export function playerStats(state: GameState, content: Content): Stats {
  const stats = { ...content.characters[state.player.characterId]!.stats };
  const bonus = weaponProfile(state, content).bonus ?? {};
  for (const key of Object.keys(bonus) as (keyof Stats)[]) stats[key] += bonus[key] ?? 0;
  return stats;
}
