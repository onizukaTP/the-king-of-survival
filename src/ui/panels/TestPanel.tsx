import { useState } from 'react';
import { content, useGameStore } from '../../store/gameStore';

/** Testing tools (D-068), shown only with ?debug=1: open any event, start an ambush or any fight, make it night. */
export function TestPanel() {
  const act = useGameStore((s) => s.act);
  const openPanel = useGameStore((s) => s.openPanel);
  const events = content.events.events;
  const enemies = Object.values(content.enemies);
  const [eventId, setEventId] = useState(events[0]!.id);
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(enemies.map((e, i) => [e.id, i === 0 ? 2 : 0])));
  const [ambush, setAmbush] = useState(false);
  const run = (command: Parameters<typeof act>[0]) => { if (act(command)) openPanel(null); };
  const total = Object.values(counts).reduce((n, c) => n + c, 0);

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

      <h3>Time</h3>
      <button className="small" onClick={() => run({ type: 'debug.night' })}>Jump to 22:00</button>
    </div>
  );
}
