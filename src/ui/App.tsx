import { useGameStore } from '../store/gameStore';
import { MapScreen } from './screens/MapScreen';
import { TitleScreen } from './screens/TitleScreen';

export function App() {
  const screen = useGameStore((s) => s.screen);
  return screen === 'game' ? <MapScreen /> : <TitleScreen />;
}
