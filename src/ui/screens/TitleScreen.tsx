import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

export function TitleScreen() {
  const { hasSave, message, checkForSave, newGame, loadGame } = useGameStore();
  useEffect(() => {
    void checkForSave();
  }, [checkForSave]);

  return (
    <main className="screen">
      <h1>The King of Survival</h1>
      <p className="muted">M0 skeleton</p>
      <div className="actions">
        <button onClick={newGame}>New Game</button>
        <button onClick={() => void loadGame()} disabled={!hasSave} title={hasSave ? undefined : 'No saved game yet'}>
          Continue
        </button>
      </div>
      {!hasSave && <p className="muted">No saved game yet.</p>}
      {message && <p role="status">{message}</p>}
    </main>
  );
}
