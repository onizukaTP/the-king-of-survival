import type { CombatStats } from '../../content/schemas';
import { content } from '../../store/gameStore';

export const STAT_LABELS: Record<string, string> = {
  atk: 'ATK', def: 'DEF', spd: 'SPD', critRate: 'Crit', critDamage: 'Crit dmg', acc: 'ACC', dodge: 'Dodge',
  stunRes: 'Stun res', bleedRes: 'Bleed res', blightRes: 'Blight res', debuffRes: 'Debuff res', moveRes: 'Move res', deathblowRes: 'Deathblow res',
  hunting: 'Hunting', luck: 'Luck',
};
const PERCENT = new Set(['def', 'critRate', 'critDamage', 'stunRes', 'bleedRes', 'blightRes', 'debuffRes', 'moveRes', 'deathblowRes', 'hunting']);

/** Stats (D-065, D-066, D-069): in the Pack (with the weapon in hand) and on the combat screen (with buffs). */
export function StatsBlock({ stats, damage, ammo }: { stats: CombatStats & { hunting?: number; luck?: number }; damage: [number, number]; ammo?: string }) {
  const keys = Object.keys(STAT_LABELS).filter((k) => k in stats) as (keyof typeof stats)[];
  return (
    <div className="stats-block" data-testid="stats">
      <div className="row tiny muted">
        <span>Damage {damage[0]}–{damage[1]}</span>
        {ammo && <span>Uses {content.items[ammo]?.name.toLowerCase()}s</span>}
      </div>
      <dl>
        {keys.map((key) => (
          <div key={key}><dt>{STAT_LABELS[key]}</dt><dd>{stats[key]}{PERCENT.has(key) ? '%' : ''}</dd></div>
        ))}
      </dl>
    </div>
  );
}
