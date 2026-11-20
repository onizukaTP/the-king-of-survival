import { useState } from 'react';
import { siteAt } from '../../engine/systems/travel/travel';
import { MapView } from '../../map/MapView';
import { content, useGameStore } from '../../store/gameStore';
import { formatClock } from '../format';
import { Panel } from '../panels/Panel';

export function MapScreen() {
  const game = useGameStore((s) => s.game);
  const message = useGameStore((s) => s.message);
  const selection = useGameStore((s) => s.selection);
  const saveGame = useGameStore((s) => s.saveGame);
  const quitToTitle = useGameStore((s) => s.quitToTitle);
  const [menuOpen, setMenuOpen] = useState(false);
  if (!game) return null;

  const here = siteAt(game.player.position, content);
  const status = game.travel ? 'On the road' : here ? `At: ${here.name}` : 'In the open';
  const panelOpen = Boolean(selection || game.travel);

  return (
    <div className="game">
      <header className="topbar">
        <span className="clock" data-testid="clock">{formatClock(game.clockMinutes)}</span>
        <span className="pill" data-testid="status">{status}</span>
        <span className="topbar-message" role="status">{message}</span>
        <div className="menu">
          <button aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
          {menuOpen && (
            <div className="menu-list" role="menu">
              <button role="menuitem" onClick={() => { setMenuOpen(false); void saveGame(); }}>Save</button>
              <button role="menuitem" onClick={() => { setMenuOpen(false); quitToTitle(); }}>Quit to title</button>
            </div>
          )}
        </div>
      </header>
      <div className={`main ${panelOpen ? 'panel-open' : ''}`}>
        <MapView />
        <aside className="panel">
          <Panel />
        </aside>
      </div>
      {/* Read by the e2e test to compare state across save/load; not shown. */}
      <pre hidden data-testid="game-state">{JSON.stringify(game)}</pre>
    </div>
  );
}
