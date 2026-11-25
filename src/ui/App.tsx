import { useGameStore } from '../store/gameStore';
import { GameOverScreen } from './screens/GameOverScreen';
import { IntroScreen } from './screens/IntroScreen';
import { MapScreen } from './screens/MapScreen';
import { TitleScreen } from './screens/TitleScreen';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const introSeen = useGameStore((s) => s.game?.introSeen ?? true);
  // A new run opens on the intro, once (D-076).
  if (screen === 'game') return introSeen ? <MapScreen /> : <IntroScreen />;
  if (screen === 'gameover') return <GameOverScreen />;
  return <TitleScreen />;
}
