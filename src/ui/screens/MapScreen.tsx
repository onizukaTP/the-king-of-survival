import { useState } from 'react';
import type { Meter } from '../../engine/core/state';
import { carriedKg } from '../../engine/systems/inventory/inventory';
import { siteAt } from '../../engine/systems/travel/travel';
import { MapView } from '../../map/MapView';
import { content, useGameStore } from '../../store/gameStore';
import { formatClock, formatKg } from '../format';
import { Panel } from '../panels/Panel';

const METERS: [Meter, string][] = [['health', 'Health'], ['food', 'Food'], ['water', 'Water'], ['rest', 'Rest']];

export function MapScreen() {
  const game = useGameStore((s) => s.game);
  const message = useGameStore((s) => s.message);
  const selection = useGameStore((s) => s.selection);
  const panel = useGameStore((s) => s.panel);
  const openPanel = useGameStore((s) => s.openPanel);
  const saveAndQuit = useGameStore((s) => s.saveAndQuit);
  const [menuOpen, setMenuOpen] = useState(false);
  if (!game) return null;

  const here = siteAt(game.player.position, content);
  const status = game.travel ? 'On the road' : here ? `At: ${here.name}` : 'In the open';
  const panelOpen = Boolean(selection || game.travel || panel);
  const toggle = (p: 'pack' | 'rest') => openPanel(panel === p ? null : p);
  const warnAt = content.survival.warnAt;

  return (
    <div className="game">
      <header className="topbar">
        <span className="clock" data-testid="clock">{formatClock(game.clockMinutes)}</span>
        <span className="pill" data-testid="status">{status}</span>
        {game.survival.illUntil !== null && <span className="pill warn">Ill</span>}
        {game.survival.injured && <span className="pill warn">Injured</span>}
        <span className="topbar-message" role="status">{message}</span>
        <div className="meters">
          {METERS.map(([meter, label]) => {
            const value = Math.round(game.survival[meter]);
            const level = value <= 0 ? 'empty' : value <= warnAt ? 'low' : '';
            return (
              <span key={meter} className={`meter ${level}`} title={`${label} ${value}`} role="meter" aria-label={label}
                aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} data-testid={`meter-${meter}`}>
                <span className="meter-label">{label}</span>
                <span className="meter-bar"><span style={{ width: `${value}%` }} /></span>
              </span>
            );
          })}
        </div>
        <button className="small" aria-pressed={panel === 'pack'} onClick={() => toggle('pack')}>
          Pack {formatKg(carriedKg(game.inventory, content))}
        </button>
        <button className="small" aria-pressed={panel === 'rest'} onClick={() => toggle('rest')}>Rest</button>
        <div className="menu">
          <button className="small" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
          {menuOpen && (
            <div className="menu-list" role="menu">
              <button role="menuitem" onClick={() => { setMenuOpen(false); void saveAndQuit(); }}>Save and quit</button>
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
