import { useGameStore } from '../store/gameStore';
import { GameOverScreen } from './screens/GameOverScreen';
import { MapScreen } from './screens/MapScreen';
import { TitleScreen } from './screens/TitleScreen';

export function App() {
  const screen = useGameStore((s) => s.screen);
  if (screen === 'game') return <MapScreen />;
  if (screen === 'gameover') return <GameOverScreen />;
  return <TitleScreen />;
}
