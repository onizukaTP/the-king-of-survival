import { conditionEffects } from '../../engine/systems/conditions/conditions';
import { content, useGameStore } from '../../store/gameStore';
import { formatClock, formatDuration } from '../format';

/** Rest anywhere for 1 h, 4 h or until rested (D-035). Resolves instantly. */
export function RestPanel() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const openPanel = useGameStore((s) => s.openPanel);
  const { rest, food, water, injured } = game.survival;
  const untilRested = Math.ceil(((100 - rest) / content.survival.sleepRestPerHour) * 60);
  const infected = conditionEffects(game.survival, content).blocksHealing;
  const heals = !injured && !infected && food > content.survival.sleepHealAbove && water > content.survival.sleepHealAbove;

  return (
    <div className="panel-body">
      <div className="panel-head">
        <h2>Rest</h2>
        <button className="icon" aria-label="Close" onClick={() => openPanel(null)}>×</button>
      </div>
      <p className="muted">Sleep where he stands. Food and Water keep draining.</p>
      <div className="row"><span className="muted">Rest</span><span>{Math.round(rest)}</span></div>
      <p className="muted">{heals ? 'Health recovers while he sleeps.' : injured ? 'Health won\'t recover until the injury is treated.' : infected ? 'Health won\'t recover until the infected wound is treated.' : 'Health won\'t recover: Food and Water must be above 25.'}</p>
      <div className="card-actions">
        <button onClick={() => act({ type: 'rest', minutes: 60 })}>1 hour</button>
        <button onClick={() => act({ type: 'rest', minutes: 240 })}>4 hours</button>
        {untilRested > 0 && (
          <button onClick={() => act({ type: 'rest', minutes: 'until_rested' })}>
            Until rested ({formatDuration(untilRested)}, wakes {formatClock(game.clockMinutes + untilRested)})
          </button>
        )}
      </div>
    </div>
  );
}
