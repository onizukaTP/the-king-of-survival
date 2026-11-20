import { useGameStore } from '../store/gameStore';
import { GameScreen } from './screens/GameScreen';
import { TitleScreen } from './screens/TitleScreen';

export function App() {
  const screen = useGameStore((s) => s.screen);
  return screen === 'game' ? <GameScreen /> : <TitleScreen />;
}
