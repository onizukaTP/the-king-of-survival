import { resolveAsset } from '../../assets/resolve';
import { content, useGameStore } from '../../store/gameStore';

export function GameScreen() {
  const { game, message, saveGame, quitToTitle } = useGameStore();
  if (!game) return null;
  const character = content.characters[game.player.characterId];

  return (
    <main className="screen">
      <p className="muted">M0 skeleton — the map and gameplay arrive in later milestones.</p>
      {character && (
        <section className="character">
          <img src={resolveAsset(character.portrait)} alt="" width={64} height={64} />
          <div>
            <h2>{character.name}</h2>
            <p>Age {character.age}</p>
          </div>
        </section>
      )}
      <div className="actions">
        <button onClick={() => void saveGame()}>Save</button>
        <button onClick={quitToTitle}>Quit to Title</button>
      </div>
      {message && <p role="status">{message}</p>}
      <details>
        <summary>Debug: game state</summary>
        <pre data-testid="game-state">{JSON.stringify(game, null, 2)}</pre>
      </details>
    </main>
  );
}
