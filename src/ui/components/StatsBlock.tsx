import type { Stats } from '../../content/schemas';
import { playerStats, weaponProfile } from '../../engine/systems/combat/stats';
import type { GameState } from '../../engine/core/state';
import { content } from '../../store/gameStore';

const REACH = { close: 'Close', mid: 'Close and Mid', far: 'Any band' } as const;
const ROWS: [keyof Stats, string, string][] = [
  ['atk', 'ATK', ''], ['def', 'DEF', '%'], ['spd', 'SPD', ''], ['critRate', 'Crit', '%'], ['critDamage', 'Crit dmg', '%'],
  ['acc', 'ACC', ''], ['dodge', 'Dodge', ''], ['hunting', 'Hunting', '%'], ['luck', 'Luck', ''],
];

/** Prabu's stats with the weapon in hand (D-065, D-066): in the Pack and on the combat screen. */
export function StatsBlock({ game }: { game: GameState }) {
  const stats = playerStats(game, content);
  const w = weaponProfile(game, content);
  return (
    <div className="stats-block" data-testid="stats">
      <div className="row tiny muted">
        <span>Damage {w.damage[0]}–{w.damage[1]} · {REACH[w.reach]}</span>
        {w.ammo && <span>Uses {content.items[w.ammo]?.name.toLowerCase()}s</span>}
      </div>
      <dl>
        {ROWS.map(([key, label, unit]) => (
          <div key={key}><dt>{label}</dt><dd>{stats[key]}{unit}</dd></div>
        ))}
      </dl>
    </div>
  );
}
