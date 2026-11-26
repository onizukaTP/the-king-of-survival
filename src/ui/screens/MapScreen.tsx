import { useState } from 'react';
import { maxHealth, type Meter } from '../../engine/core/state';
import { carriedKg } from '../../engine/systems/inventory/inventory';
import { riddenDef, ridden } from '../../engine/systems/vehicles/ridden';
import { siteAt } from '../../engine/systems/travel/travel';
import { spotHere, TOWN_EDGE } from '../../engine/systems/town/town';
import { MapView } from '../../map/MapView';
import { TownMap } from '../../map/TownMap';
import { content, DEBUG, useGameStore } from '../../store/gameStore';
import { formatClock, formatKg } from '../format';
import { Panel } from '../panels/Panel';
import { EventCard } from '../components/EventCard';
import { CombatScreen } from './CombatScreen';
import { isFullMoonNight, isNight } from '../../engine/systems/night/night';
import { formatDuration } from '../format';

const METERS: [Meter, string][] = [['health', 'Health'], ['food', 'Food'], ['water', 'Water'], ['rest', 'Rest']];

export function MapScreen() {
  const game = useGameStore((s) => s.game);
  const message = useGameStore((s) => s.message);
  const selection = useGameStore((s) => s.selection);
  const townSelection = useGameStore((s) => s.townSelection);
  const panel = useGameStore((s) => s.panel);
  const openPanel = useGameStore((s) => s.openPanel);
  const saveAndQuit = useGameStore((s) => s.saveAndQuit);
  const note = useGameStore((s) => s.note);
  const [menuOpen, setMenuOpen] = useState(false);
  if (!game) return null;

  const here = siteAt(game.player.position, content);
  const spot = spotHere(game, content);
  const status = game.town
    ? `In ${content.sites[game.town.siteId]?.name}${spot && spot.id !== TOWN_EDGE ? `: ${spot.name}` : ''}`
    : game.travel ? 'On the road' : here ? `At: ${here.name}` : 'In the open';
  const panelOpen = Boolean(selection || (game.town && townSelection) || game.travel || panel);
  const toggle = (p: 'player' | 'pack' | 'vehicle' | 'rest' | 'craft' | 'journal' | 'test') => openPanel(panel === p ? null : p);
  const vehicle = riddenDef(game, content);
  const durability = ridden(game)?.durability;
  const warnAt = content.survival.warnAt;
  const nightCfg = content.world.night;
  const night = isNight(game.clockMinutes, nightCfg);
  const fullMoon = isFullMoonNight(game.clockMinutes, nightCfg);

  return (
    <div className="game">
      <header className="topbar">
        <span className="clock" data-testid="clock">{formatClock(game.clockMinutes)}</span>
        <span className="pill" data-testid="status">{status}</span>
        {night && (
          <span className="pill" data-testid="moon" title={fullMoon ? 'Full moon: light enough to travel.' : 'Dark: moving without a torch risks injury.'}>
            {fullMoon ? '○ Full moon' : '● Dark night'}
          </span>
        )}
        {game.survival.illUntil !== null && <span className="pill warn">Ill</span>}
        {game.survival.injured && <span className="pill warn">Injured</span>}
        {game.survival.radiation > 0 && <span className="pill warn">Irradiated</span>}
        {game.survival.conditions.map((c) => {
          const def = content.conditions[c.id];
          if (!def) return null;
          const left = c.until !== null ? ` (${formatDuration(c.until - game.clockMinutes)} left)` : '';
          const text = `${def.name}: ${def.description}${left}`;
          return (
            <button key={c.id} className={`pill condition ${def.good ? 'good' : 'warn'}`} title={text} onClick={() => note(text)}>
              {def.name}
            </button>
          );
        })}
        <span className="topbar-message" role="status">{message}</span>
        <div className="meters">
          {METERS.map(([meter, label]) => {
            const value = Math.round(game.survival[meter]);
            const level = value <= 0 ? 'empty' : value <= warnAt ? 'low' : '';
            // D-043: the part of Health lost to radiation shows as a dark end segment.
            const lost = meter === 'health' ? 100 - maxHealth(game.survival, content) : 0;
            return (
              <span key={meter} className={`meter ${level}`} title={`${label} ${value}${lost ? ` (max ${100 - lost})` : ''}`} role="meter" aria-label={label}
                aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} data-testid={`meter-${meter}`}>
                <span className="meter-label">{label}</span>
                <span className="meter-bar"><span style={{ width: `${value}%` }} />{lost > 0 && <span className="meter-lost" style={{ width: `${lost}%` }} />}</span>
              </span>
            );
          })}
        </div>
        <button className="small" aria-pressed={panel === 'player'} onClick={() => toggle('player')}>Player</button>
        <button className="small" aria-pressed={panel === 'pack'} onClick={() => toggle('pack')}>
          Pack {formatKg(carriedKg(game.inventory, content))}
        </button>
        {game.vehicles.list.length > 0 && (
          <button className="small" aria-pressed={panel === 'vehicle'} onClick={() => toggle('vehicle')} data-testid="vehicle-button">
            Vehicle{vehicle ? `: ${vehicle.name}${durability !== null && durability !== undefined ? ` ${Math.round(durability)}%` : ''}` : ''}
          </button>
        )}
        <button className="small" aria-pressed={panel === 'craft'} onClick={() => toggle('craft')}>Craft</button>
        <button className="small" aria-pressed={panel === 'rest'} onClick={() => toggle('rest')}>Rest</button>
        <button className="small" aria-pressed={panel === 'journal'} onClick={() => toggle('journal')}>Journal</button>
        {DEBUG && <button className="small" aria-pressed={panel === 'test'} onClick={() => toggle('test')}>Test</button>}
        <div className="menu">
          <button className="small" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
          {menuOpen && (
            <div className="menu-list" role="menu">
              <button role="menuitem" onClick={() => { setMenuOpen(false); void saveAndQuit(); }}>Save and quit</button>
            </div>
          )}
        </div>
      </header>
      <div className={`main ${panelOpen && !game.combat ? 'panel-open' : ''} ${game.combat ? 'in-combat' : ''}`}>
        {game.combat ? <CombatScreen /> : (
          <>
            {game.town ? <TownMap key={game.town.siteId} /> : <MapView />}
            <aside className="panel">
              <Panel />
            </aside>
          </>
        )}
      </div>
      <EventCard />
      {/* Read by the e2e test to compare state across save/load; not shown. */}
      <pre hidden data-testid="game-state">{JSON.stringify(game)}</pre>
    </div>
  );
}
