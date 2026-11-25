import type { CombatStats } from '../../content/schemas';
import { content } from '../../store/gameStore';
import { PERCENT_STATS as PERCENT, STAT_LABELS } from '../format';

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
