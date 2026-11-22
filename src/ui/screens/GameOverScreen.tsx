import type { DeathCause } from '../../engine/core/commands';
import { useGameStore } from '../../store/gameStore';
import { formatClock } from '../format';

const CAUSE: Record<DeathCause, string> = {
  hunger: 'He starved.',
  thirst: 'He died of thirst.',
  hunger_and_thirst: 'He died of hunger and thirst.',
  radiation: 'Radiation killed him.',
};

/** Permadeath (D-038): the run is over and its save is gone. */
export function GameOverScreen() {
  const death = useGameStore((s) => s.death);
  const quitToTitle = useGameStore((s) => s.quitToTitle);
  return (
    <main className="screen">
      <h1>Prabu has died</h1>
      {death && <p>{CAUSE[death.cause]} {formatClock(death.clockMinutes)}.</p>}
      <p className="muted">This run is over.</p>
      <div className="actions">
        <button onClick={quitToTitle}>Back to title</button>
      </div>
    </main>
  );
}
