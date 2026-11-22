import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function TitleScreen() {
  const { hasSave, message, checkForSave, newGame, loadGame } = useGameStore();
  // One run at a time (D-038): starting over replaces it, so ask once.
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    void checkForSave();
  }, [checkForSave]);

  return (
    <main className="screen">
      <h1>The King of Survival</h1>
      <p className="muted">Prototype</p>
      <div className="actions">
        {hasSave && confirming ? (
          <>
            <button onClick={newGame}>Start a new run</button>
            <button onClick={() => setConfirming(false)}>Keep my run</button>
          </>
        ) : (
          <>
            <button onClick={() => (hasSave ? setConfirming(true) : newGame())}>New Game</button>
            <button onClick={() => void loadGame()} disabled={!hasSave} title={hasSave ? undefined : 'No run in progress'}>
              Continue
            </button>
          </>
        )}
      </div>
      {hasSave && confirming && <p>Your current run will be lost.</p>}
      {!hasSave && <p className="muted">No run in progress.</p>}
      {message && <p role="status">{message}</p>}
    </main>
  );
}
