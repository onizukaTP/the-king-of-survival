import { useState } from 'react';
import { groundHere, searchOptions, waterHere } from '../../engine/systems/scavenging/scavenging';
import { spotHere } from '../../engine/systems/town/town';
import { inRadiationZone } from '../../engine/systems/survival/radiation';
import { content, useGameStore } from '../../store/gameStore';
import { formatDuration, formatKg, kindLabel } from '../format';

/** Where Prabu stands (P-013): search, hunt, water, and what's on the ground here (D-045). */
export function HerePanel() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const openPanel = useGameStore((s) => s.openPanel);
  const [picked, setPicked] = useState<number[]>([]);
  const cfg = content.scavenging;
  const { site, canSearch, canHunt, canEnterTown, searchMinutes, torchSearchMinutes, torch, richness } = searchOptions(game, content);
  const water = waterHere(game, content);
  const spot = spotHere(game, content);
  const townName = game.town ? content.sites[game.town.siteId]?.name : undefined;
  const zone = inRadiationZone(game.player.position, content);
  const empties = game.inventory.stacks.filter((s) => s.itemId === cfg.bottles.empty).reduce((n, s) => n + s.count, 0);
  const here = groundHere(game);
  const { lat, lon } = game.player.position;

  const run = (command: Parameters<typeof act>[0]) => {
    if (act(command)) setPicked([]);
  };
  const toggle = (i: number) => setPicked(picked.includes(i) ? picked.filter((p) => p !== i) : [...picked, i]);

  return (
    <div className="panel-body" data-testid="here-panel">
      <div className="panel-head">
        <h2>{game.town ? spot?.name ?? 'Between buildings' : site?.name ?? 'Open ground'}</h2>
        <button className="icon" aria-label="Close" onClick={() => openPanel(null)}>×</button>
      </div>
      <p className="muted">
        {game.town ? (spot?.kind === 'building' ? `${spot.type.name}, ${townName}` : townName) : site ? kindLabel[site.kind] : `${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`}
      </p>
      {game.town && <button className="small leave-town" onClick={() => run({ type: 'town.leave' })}>Leave town</button>}
      {canEnterTown && <button onClick={() => run({ type: 'town.enter' })}>Enter town</button>}
      {water && <p>{water === 'river' ? 'A flowing river: clean water.' : water === 'well' ? 'A well: clean water.' : 'Still water: unsafe to drink without boiling or filtering.'}</p>}
      {zone && <p className="warn-text">Radiation zone. Every hour here risks radiation.</p>}
      <hr />

      {(canSearch || canHunt || water) && (
        <div className="card-actions">
          {canSearch && <button onClick={() => run({ type: 'scavenge.search', torch: false })}>Search ({formatDuration(searchMinutes)})</button>}
          {canSearch && torch && (
            <button onClick={() => run({ type: 'scavenge.search', torch: true })}>
              Search with torch ({formatDuration(torchSearchMinutes)}, {cfg.torchChargePerSearch}%)
            </button>
          )}
          {canHunt && <button onClick={() => run({ type: 'scavenge.hunt' })}>Hunt ({formatDuration(cfg.huntMinutes)})</button>}
          {water && empties > 0 && (
            <button onClick={() => run({ type: 'water.fill' })}>
              Fill {empties} bottle{empties > 1 ? 's' : ''} ({formatDuration(empties * cfg.fillMinutesPerBottle)})
            </button>
          )}
          {water && <button onClick={() => run({ type: 'water.drink' })}>Drink ({formatDuration(cfg.drinkMinutes)})</button>}
        </div>
      )}
      {canSearch && <p className="muted">Left to find: {Math.round(richness)}%</p>}
      {!canSearch && !canHunt && !water && !canEnterTown && (
        <p className="muted">{game.town ? 'Pick a building on the map to walk there.' : `Nothing to do here${site?.kind === 'home' ? ' yet' : ''}.`}</p>
      )}

      {here.length > 0 && (
        <section>
          <h3>On the ground</h3>
          <ul className="items">
            {here.map((i) => {
              const pile = game.ground[i]!;
              const item = content.items[pile.itemId]!;
              return (
                <li key={i}>
                  <label className="item-row">
                    <input type="checkbox" checked={picked.includes(i)} onChange={() => toggle(i)} />
                    <span className="pile-name">
                      {item.name}{pile.count > 1 && ` ×${pile.count}`}
                      <small className="muted">gone in {formatDuration(pile.expiresAt - game.clockMinutes)}</small>
                    </span>
                    <span className="muted">{formatKg(item.weightKg * pile.count)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="card-actions">
            {picked.length > 0 && <button className="small" onClick={() => run({ type: 'ground.take', indexes: picked })}>Take selected</button>}
            <button className="small" onClick={() => run({ type: 'ground.take', indexes: here })}>Take all</button>
          </div>
        </section>
      )}
    </div>
  );
}
