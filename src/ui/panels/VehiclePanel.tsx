import { useState } from 'react';
import type { Stack } from '../../engine/core/state';
import { distanceKm } from '../../engine/systems/travel/geo';
import { ridden, stacksKg } from '../../engine/systems/vehicles/ridden';
import { repairPlan, vehiclesHere } from '../../engine/systems/vehicles/vehicles';
import { content, useGameStore } from '../../store/gameStore';
import { ItemName } from '../components/ItemName';
import { formatDuration, formatKg, formatKm } from '../format';

const vehicleName = (vehicleId: string) => content.vehicles.byId[vehicleId]?.name ?? vehicleId;

/** One cargo or pack row with buttons to move one or all of it, and a tick box when it can be picked. */
function MoveRow({ stack, verb, onMove, picked, onPick }: { stack: Stack; verb: string; onMove: (count: number) => void; picked?: boolean; onPick?: () => void }) {
  const item = content.items[stack.itemId]!;
  return (
    <li className="item-line">
      {onPick && <input type="checkbox" checked={picked} onChange={onPick} aria-label={`Select ${item.name}`} />}
      <span className="item-row static"><span><ItemName id={stack.itemId} count={stack.count} /></span><span className="muted">{formatKg(item.weightKg * stack.count)}</span></span>
      <button className="small row-use" aria-label={`${verb} ${item.name}`} onClick={() => onMove(stack.count)}>{verb}{stack.count > 1 ? ' all' : ''}</button>
      {stack.count > 1 && <button className="small row-use" aria-label={`${verb} one ${item.name}`} onClick={() => onMove(1)}>1</button>}
    </li>
  );
}

/** The Vehicle panel (approved layout, M10): the vehicle he rides, its cargo, repairs, fuel and where the others are parked. */
export function VehiclePanel() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const openPanel = useGameStore((s) => s.openPanel);
  // Ticks belong to the pack as it was when they were made; any change to the pack clears them.
  const [ticks, setTicks] = useState<{ stacks: Stack[]; picked: number[] }>({ stacks: [], picked: [] });
  const picked = ticks.stacks === game.inventory.stacks ? ticks.picked : [];
  const pick = (i: number) => setTicks({ stacks: game.inventory.stacks, picked: picked.includes(i) ? picked.filter((p) => p !== i) : [...picked, i] });
  const loadMany = (indexes: number[]) => act({ type: 'cargo.loadMany', indexes });
  const v = ridden(game);
  const def = v && content.vehicles.byId[v.vehicleId];
  const here = vehiclesHere(game);
  const elsewhere = game.vehicles.list.filter((x) => x !== v && !here.includes(x));
  const plan = v ? repairPlan(game, content) : null;
  const scrap = content.items[content.vehicles.repair.itemId]!.name.toLowerCase();
  const fuelItem = def?.fuel && content.items[def.fuel.itemId]!;
  const fuelBlock = def?.fuel && v && v.fuel !== null
    ? v.fuel >= def.fuel.tankLitres ? 'The tank is full'
      : ![...game.inventory.stacks, ...v.cargo].some((s) => s.itemId === def.fuel!.itemId) ? `Needs a ${fuelItem!.name.toLowerCase()}` : null
    : null;

  return (
    <div className="panel-body" data-testid="vehicle-panel">
      <div className="panel-head">
        <h2>Vehicle</h2>
        <button className="icon" aria-label="Close" onClick={() => openPanel(null)}>×</button>
      </div>
      {v && def ? (
        <>
          <p data-testid="riding">Riding: <strong>{def.name}</strong></p>
          {v.durability !== null ? (
            <>
              <div className="row"><span className="muted">Durability</span><span>{Math.round(v.durability)}</span></div>
              <div className={`progress ${v.durability <= content.vehicles.warnAt ? 'warn' : ''}`} aria-hidden="true"><div style={{ width: `${v.durability}%` }} /></div>
            </>
          ) : <p className="muted tiny">Never wears out.</p>}
          {def.fuel && v.fuel !== null && <div className="row"><span className="muted">Fuel</span><span>{Math.round(v.fuel * 10) / 10} / {def.fuel.tankLitres} L</span></div>}
          <div className="row"><span className="muted">Cargo</span><span>{formatKg(stacksKg(v.cargo, content))} of {def.cargoKg} kg</span></div>
          <div className="row"><span className="muted">Speed</span><span>{def.roadKmh} km/h road · {def.crossKmh} km/h off-road</span></div>
          <div className="card-actions">
            <button className="small" onClick={() => act({ type: 'vehicle.leave' })}>Get off</button>
            {v.durability !== null && (plan && !('error' in plan) ? (
              <button className="small" onClick={() => act({ type: 'vehicle.repair', count: plan.use })}>
                Repair: {plan.use} {scrap} → {Math.round(plan.to)}, {formatDuration(plan.minutes)}
              </button>
            ) : <button className="small" disabled title={plan?.error?.error.message}>Repair</button>)}
            {def.fuel && (
              <button className="small" disabled={Boolean(fuelBlock)} title={fuelBlock ?? undefined} onClick={() => act({ type: 'vehicle.refuel' })}>
                Refuel (+{def.fuel.litresPerItem} L)
              </button>
            )}
          </div>
          {v.durability !== null && plan && 'error' in plan && <p className="muted tiny">Repair: {plan.error!.error.message}</p>}
          {fuelBlock && <p className="muted tiny">Refuel: {fuelBlock}.</p>}

          <h3>Cargo</h3>
          {v.cargo.length ? (
            <ul className="items">{v.cargo.map((s, i) => <MoveRow key={i} stack={s} verb="Unload" onMove={(count) => act({ type: 'cargo.unload', index: i, count })} />)}</ul>
          ) : <p className="muted">Empty.</p>}
          <h3>From the pack</h3>
          {game.inventory.stacks.length ? (
            <>
              <div className="card-actions">
                <button className="small" onClick={() => loadMany(game.inventory.stacks.map((_, i) => i))}>Load all</button>
                <button className="small" disabled={!picked.length} title={picked.length ? undefined : 'Tick the items to load'} onClick={() => loadMany(picked)}>
                  Load selected{picked.length ? ` (${picked.length})` : ''}
                </button>
              </div>
              <ul className="items">
                {game.inventory.stacks.map((s, i) => (
                  <MoveRow key={i} stack={s} verb="Load" picked={picked.includes(i)} onPick={() => pick(i)}
                    onMove={(count) => act({ type: 'cargo.load', index: i, count })} />
                ))}
              </ul>
            </>
          ) : <p className="muted">The pack is empty.</p>}
        </>
      ) : <p className="muted">On foot.</p>}

      {here.length > 0 && (
        <>
          <h3>Here</h3>
          <ul className="items">
            {here.map((x) => (
              <li key={x.uid} className="item-line">
                <span className="item-row static"><span>{vehicleName(x.vehicleId)}</span><span className="muted">{x.durability !== null ? Math.round(x.durability) : ''}</span></span>
                <button className="small row-use" onClick={() => act({ type: 'vehicle.board', uid: x.uid })}>Get on</button>
              </li>
            ))}
          </ul>
        </>
      )}
      {elsewhere.length > 0 && (
        <>
          <h3>Parked elsewhere</h3>
          <ul className="items">
            {elsewhere.map((x) => (
              <li key={x.uid} className="row"><span>{vehicleName(x.vehicleId)}</span><span className="muted">{formatKm(distanceKm(game.player.position, x))} away · on the map</span></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
