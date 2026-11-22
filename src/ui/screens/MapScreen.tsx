import { useState } from 'react';
import { maxHealth, type Meter } from '../../engine/core/state';
import { carriedKg } from '../../engine/systems/inventory/inventory';
import { siteAt } from '../../engine/systems/travel/travel';
import { spotHere, TOWN_EDGE } from '../../engine/systems/town/town';
import { MapView } from '../../map/MapView';
import { TownMap } from '../../map/TownMap';
import { content, useGameStore } from '../../store/gameStore';
import { formatClock, formatKg } from '../format';
import { Panel } from '../panels/Panel';

const METERS: [Meter, string][] = [['health', 'Health'], ['food', 'Food'], ['water', 'Water'], ['rest', 'Rest']];

export function MapScreen() {
  const game = useGameStore((s) => s.game);
  const message = useGameStore((s) => s.message);
  const selection = useGameStore((s) => s.selection);
  const townSelection = useGameStore((s) => s.townSelection);
  const panel = useGameStore((s) => s.panel);
  const openPanel = useGameStore((s) => s.openPanel);
  const saveAndQuit = useGameStore((s) => s.saveAndQuit);
  const [menuOpen, setMenuOpen] = useState(false);
  if (!game) return null;

  const here = siteAt(game.player.position, content);
  const spot = spotHere(game, content);
  const status = game.town
    ? `In ${content.sites[game.town.siteId]?.name}${spot && spot.id !== TOWN_EDGE ? `: ${spot.name}` : ''}`
    : game.travel ? 'On the road' : here ? `At: ${here.name}` : 'In the open';
  const panelOpen = Boolean(selection || (game.town && townSelection) || game.travel || panel);
  const toggle = (p: 'pack' | 'rest') => openPanel(panel === p ? null : p);
  const warnAt = content.survival.warnAt;

  return (
    <div className="game">
      <header className="topbar">
        <span className="clock" data-testid="clock">{formatClock(game.clockMinutes)}</span>
        <span className="pill" data-testid="status">{status}</span>
        {game.survival.illUntil !== null && <span className="pill warn">Ill</span>}
        {game.survival.injured && <span className="pill warn">Injured</span>}
        {game.survival.radiation > 0 && <span className="pill warn">Irradiated</span>}
        <span className="topbar-message" role="status">{message}</span>
        <div className="meters">
          {METERS.map(([meter, label]) => {
            const value = Math.round(game.survival[meter]);
            const level = value <= 0 ? 'empty' : value <= warnAt ? 'low' : '';
            // D-043: the part of Health lost to radiation shows as a dark end segment.
            const lost = meter === 'health' ? 100 - maxHealth(game.survival) : 0;
            return (
              <span key={meter} className={`meter ${level}`} title={`${label} ${value}${lost ? ` (max ${100 - lost})` : ''}`} role="meter" aria-label={label}
                aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} data-testid={`meter-${meter}`}>
                <span className="meter-label">{label}</span>
                <span className="meter-bar"><span style={{ width: `${value}%` }} />{lost > 0 && <span className="meter-lost" style={{ width: `${lost}%` }} />}</span>
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
        {game.town ? <TownMap key={game.town.siteId} /> : <MapView />}
        <aside className="panel">
          <Panel />
        </aside>
      </div>
      {/* Read by the e2e test to compare state across save/load; not shown. */}
      <pre hidden data-testid="game-state">{JSON.stringify(game)}</pre>
    </div>
  );
}
