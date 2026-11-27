import { useState } from 'react';
import { groundHere, searchOptions, waterHere, waterOptions } from '../../engine/systems/scavenging/scavenging';
import { fireOptions } from '../../engine/systems/fire/fire';
import { spotHere } from '../../engine/systems/town/town';
import { inRadiationZone } from '../../engine/systems/survival/radiation';
import { content, useGameStore } from '../../store/gameStore';
import { formatDuration, formatKg, kindLabel } from '../format';
import { itemTip } from '../components/ItemName';
import { vehiclesHere } from '../../engine/systems/vehicles/vehicles';
import { ridden } from '../../engine/systems/vehicles/ridden';

/** Where Prabu stands (P-013): search, hunt, water, and what's on the ground here (D-045). */
export function HerePanel() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const openPanel = useGameStore((s) => s.openPanel);
  const [picked, setPicked] = useState<number[]>([]);
  const cfg = content.scavenging;
  const { site, ground, canSearch, canHunt, searchMinutes, torchSearchMinutes, torch, richness } = searchOptions(game, content);
  const water = waterHere(game, content);
  const pond = waterOptions(game, content);
  const spot = spotHere(game, content);
  const townName = spot ? content.sites[spot.townId]?.name : undefined;
  const zone = inRadiationZone(game.player.position, content);
  const empties = game.inventory.stacks.filter((s) => s.itemId === cfg.bottles.empty).reduce((n, s) => n + s.count, 0);
  const here = groundHere(game);
  const fire = fireOptions(game, content);
  const { lat, lon } = game.player.position;
  const parked = vehiclesHere(game);
  const riding = ridden(game);

  const run = (command: Parameters<typeof act>[0]) => {
    if (act(command)) setPicked([]);
  };
  const toggle = (i: number) => setPicked(picked.includes(i) ? picked.filter((p) => p !== i) : [...picked, i]);

  return (
    <div className="panel-body" data-testid="here-panel">
      <div className="panel-head">
        <h2>{spot?.name ?? site?.name ?? ground?.name ?? 'Open ground'}</h2>
        <button className="icon" aria-label="Close" onClick={() => openPanel(null)}>×</button>
      </div>
      <p className="muted">
        {spot ? `${spot.kind === 'building' ? spot.type.name : spot.water === 'well' ? 'Well' : 'Tank'}, ${townName}` : site ? kindLabel[site.kind] : `${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`}
      </p>
      {site && content.towns[site.id] && <p className="muted">Its buildings, wells and tanks show on the map when you zoom in.</p>}
      {water && <p>{water === 'river' ? 'A flowing river: clean water.' : water === 'well' ? 'A well: clean water.' : 'Still water: unsafe to drink without boiling or filtering.'}</p>}
      {zone && <p className="warn-text">Radiation zone. Every hour here risks radiation.</p>}
      {parked.length > 0 && (
        <div data-testid="vehicles-here">
          <p className="muted">Vehicles here:</p>
          <ul className="items">
            {parked.map((v) => (
              <li key={v.uid} className="item-line">
                <span className="item-row static"><span>{content.vehicles.byId[v.vehicleId]?.name}</span><span className="muted">{v.durability !== null ? Math.round(v.durability) : ''}</span></span>
                <button className="small row-use" onClick={() => run({ type: 'vehicle.board', uid: v.uid })}>Get on</button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
          {pond.open && (
            <button onClick={() => run({ type: 'water.fish' })} disabled={!pond.tool}
              title={pond.tool ? `${Math.round(pond.fishChance)}% with the ${content.items[pond.tool.itemId]?.name.toLowerCase()}` : 'Needs a spear or a fishing rod'}>
              Fish ({formatDuration(cfg.fishing.minutes)}){pond.tool ? '' : ' · needs a spear or rod'}
            </button>
          )}
          {pond.open && <button onClick={() => run({ type: 'water.moss' })}>Gather moss ({formatDuration(cfg.moss.minutes)})</button>}
          {pond.open && <p className="muted tiny">Water's stock: {Math.round(pond.left)}%</p>}
        </div>
      )}
      {canSearch && <p className="muted">Left to find: {Math.round(richness)}%</p>}
      {!canSearch && !canHunt && !water && !(site && content.towns[site.id]) && (
        <p className="muted">{`Nothing to find here${site?.kind === 'home' ? ' yet' : ''}.`}</p>
      )}

      {/* Fire and cooking (D-056, P-016). */}
      <section className="fire">
        <h3>Fire</h3>
        {fire.minutesLeft > 0 ? (
          <>
            <p className="muted">Burns for {formatDuration(fire.minutesLeft)}.</p>
            <div className="card-actions">
              {fire.firewood && <button className="small" onClick={() => run({ type: 'fire.feed' })}>Add firewood (+{formatDuration(content.fire.burnMinutesPerFirewood)})</button>}
              {fire.recipes.map(({ recipe, count, missing }) => {
                const why = missing ?? (fire.minutesLeft < recipe.minutes ? 'Add firewood first' : null);
                return (
                  <button key={recipe.id} className="small" disabled={Boolean(why)} onClick={() => run({ type: 'fire.cook', recipeId: recipe.id })}>
                    {recipe.name}{count > 1 && ` ×${count}`} ({formatDuration(recipe.minutes)}){why && ` · ${why}`}
                  </button>
                );
              })}
            </div>
          </>
        ) : fire.firewood ? (
          <div className="card-actions">
            {fire.methods.map((m) => (
              <button key={m.id} className="small" onClick={() => run({ type: 'fire.make', method: m.id })}>
                {m.itemId ? `Light with ${m.name.toLowerCase()}` : m.name} ({formatDuration(m.minutes)})
              </button>
            ))}
          </div>
        ) : <p className="muted">Needs firewood to make a fire.</p>}
      </section>

      {here.length > 0 && (
        <section>
          <h3>On the ground</h3>
          <ul className="items">
            {here.map((i) => {
              const pile = game.ground[i]!;
              const item = content.items[pile.itemId]!;
              return (
                <li key={i}>
                  <label className="item-row" title={itemTip(pile.itemId)}>
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
            {riding && (
              <button className="small" onClick={() => run({ type: 'ground.take', indexes: picked.length ? picked : here, toCargo: true })}>
                Load {picked.length ? 'selected' : 'all'} into cargo
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
