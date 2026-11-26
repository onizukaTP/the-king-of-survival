import { useState } from 'react';
import { content, useGameStore } from '../../store/gameStore';
import { ridden } from '../../engine/systems/vehicles/ridden';

const byName = <T,>(list: T[], name: (x: T) => string) => [...list].sort((a, b) => name(a).localeCompare(name(b)));

/** Testing tools (D-068), shown only with ?debug=1: events, fights, night, any item or charm, any vehicle and its state. Every list is alphabetical. */
export function TestPanel() {
  const act = useGameStore((s) => s.act);
  const openPanel = useGameStore((s) => s.openPanel);
  const events = byName(content.events.events, (e) => e.title);
  const firstEnemy = Object.values(content.enemies)[0]!.id;
  const enemies = byName(Object.values(content.enemies), (e) => e.name);
  const [eventId, setEventId] = useState(events[0]!.id);
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(enemies.map((e) => [e.id, e.id === firstEnemy ? 2 : 0])));
  const [ambush, setAmbush] = useState(false);
  const run = (command: Parameters<typeof act>[0]) => { if (act(command)) openPanel(null); };
  const total = Object.values(counts).reduce((n, c) => n + c, 0);
  const game = useGameStore((s) => s.game)!;
  const allItems = byName(Object.values(content.items), (i) => i.name);
  const items = allItems.filter((i) => !i.charm);
  const charms = allItems.filter((i) => i.charm);
  const vehicles = byName(Object.values(content.vehicles.byId), (v) => v.name);
  const [itemId, setItemId] = useState(items[0]!.id);
  const [charmId, setCharmId] = useState(charms[0]!.id);
  const [itemCount, setItemCount] = useState(1);
  const [vehicleId, setVehicleId] = useState(vehicles[0]!.id);
  const riding = ridden(game);
  const ridingDef = riding && content.vehicles.byId[riding.vehicleId];
  const [durability, setDurability] = useState(20);
  const [fuel, setFuel] = useState(1);

  return (
    <div className="panel-body" data-testid="test-panel">
      <div className="panel-head">
        <h2>Test</h2>
        <button className="icon" aria-label="Close" onClick={() => openPanel(null)}>×</button>
      </div>
      <p className="muted tiny">Testing tools. Only shown with ?debug=1 in the address.</p>

      <h3>Event</h3>
      <div className="test-row">
        <select aria-label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <button className="small" onClick={() => run({ type: 'debug.event', eventId })}>Open</button>
      </div>
      <button className="small" onClick={() => run({ type: 'debug.event', eventId: 'event.ambush' })}>Start an ambush</button>

      <h3>Fight</h3>
      {enemies.map((e) => (
        <label key={e.id} className="test-row">
          <span>{e.name}</span>
          <input type="number" min={0} max={4} value={counts[e.id]} aria-label={`${e.name} count`}
            onChange={(ev) => setCounts({ ...counts, [e.id]: Math.max(0, Math.min(4, Number(ev.target.value) || 0)) })} />
        </label>
      ))}
      <label className="test-row">
        <span>Ambush (they start at Close and strike first)</span>
        <input type="checkbox" checked={ambush} onChange={(ev) => setAmbush(ev.target.checked)} />
      </label>
      <button className="small" disabled={!total} title={total ? undefined : 'Pick at least one enemy'}
        onClick={() => run({ type: 'debug.fight', enemies: Object.entries(counts).map(([enemyId, count]) => ({ enemyId, count })), ambush })}>
        Start fight
      </button>

      <h3>Items</h3>
      <div className="test-row">
        <select aria-label="Item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <input type="number" min={1} max={100} value={itemCount} aria-label="Item count"
          onChange={(ev) => setItemCount(Math.max(1, Math.min(100, Number(ev.target.value) || 1)))} />
        <button className="small" onClick={() => act({ type: 'debug.item', itemId, count: itemCount })}>Give</button>
      </div>
      <p className="muted tiny">Past 50 kg, the rest is left on the ground here.</p>

      <h3>Charms</h3>
      <div className="test-row">
        <select aria-label="Charm" value={charmId} onChange={(e) => setCharmId(e.target.value)}>
          {charms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="small" onClick={() => act({ type: 'debug.item', itemId: charmId, count: 1 })}>Give</button>
      </div>
      <button className="small" onClick={() => charms.forEach((c) => act({ type: 'debug.item', itemId: c.id, count: 1 }))}>Give one of every charm</button>

      <h3>Vehicles</h3>
      <div className="test-row">
        <select aria-label="Vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <button className="small" onClick={() => act({ type: 'debug.vehicle', vehicleId })}>Park one here</button>
      </div>
      {riding && ridingDef ? (
        <>
          <p className="muted tiny">Riding: {ridingDef.name}</p>
          {riding.durability !== null && (
            <label className="test-row">
              <span>Durability</span>
              <input type="number" min={0} max={100} value={durability} aria-label="Durability" onChange={(ev) => setDurability(Number(ev.target.value) || 0)} />
            </label>
          )}
          {riding.fuel !== null && (
            <label className="test-row">
              <span>Fuel (litres)</span>
              <input type="number" min={0} max={ridingDef.fuel?.tankLitres ?? 0} step={0.5} value={fuel} aria-label="Fuel" onChange={(ev) => setFuel(Number(ev.target.value) || 0)} />
            </label>
          )}
          {(riding.durability !== null || riding.fuel !== null) && (
            <button className="small" onClick={() => act({ type: 'debug.vehicleState', durability: riding.durability !== null ? durability : null, fuel: riding.fuel !== null ? fuel : null })}>Set</button>
          )}
        </>
      ) : <p className="muted tiny">Get on a vehicle to set its durability and fuel.</p>}

      <h3>Time</h3>
      <button className="small" onClick={() => run({ type: 'debug.night' })}>Jump to 22:00</button>
    </div>
  );
}
