import type { ReactNode } from 'react';
import type { EventOutcome } from '../../content/schemas';
import type { EventState } from '../../engine/core/state';
import { choiceMissing } from '../../engine/systems/events/events';
import { content, useGameStore } from '../../store/gameStore';
import { formatClock, formatDuration } from '../format';
import { ItemName } from './ItemName';

const signed = (n: number) => `${n > 0 ? '+' : '−'}${Math.round(Math.abs(n))}`;
/** Item names, each with its tooltip, separated by commas. */
const names = (list: { itemId: string; count: number }[]) =>
  list.map((f, i) => <span key={i}>{i > 0 && ', '}<ItemName id={f.itemId} count={f.count} lower /></span>);

/** The lines under an outcome: what changed. Built from the outcome's data and what was rolled. */
function effectLines(o: EventOutcome, r: NonNullable<EventState['result']>): ReactNode[] {
  const lines: ReactNode[] = [];
  const meters: [keyof EventOutcome, string][] = [['health', 'Health'], ['food', 'Food'], ['water', 'Water'], ['rest', 'Rest']];
  const changes = meters.flatMap(([k, label]) => (typeof o[k] === 'number' && o[k] ? [`${label} ${signed(o[k] as number)}`] : []));
  if (changes.length) lines.push(changes.join(', '));
  if (o.injure) lines.push('Injured');
  if (o.ill) lines.push('Ill');
  for (const id of r.conditions) lines.push(content.conditions[id]?.name ?? id);
  if (r.lost.length) lines.push(<>Lost: {names(r.lost.map((itemId) => ({ itemId, count: 1 })))}</>);
  if (r.found.length) lines.push(<>Found: {names(r.found)}</>);
  if (r.left.length) lines.push(<>Too heavy, left on the ground: {names(r.left)}</>);
  if (r.siteId) lines.push(`On the map: ${content.sites[r.siteId]?.name ?? r.siteId}`);
  if (o.minutes) lines.push(`${formatDuration(o.minutes)} passed`);
  if (o.stopTravel) lines.push('He stops here.');
  return lines;
}

/** The event dialog (D-059): must be answered; then shows what happened and Continue. */
export function EventCard() {
  const game = useGameStore((s) => s.game);
  const act = useGameStore((s) => s.act);
  const closeEvent = useGameStore((s) => s.closeEvent);
  const open = game?.event;
  const def = open && content.events.events.find((e) => e.id === open.id);
  if (!game || !open || !def) return null;
  const r = open.result;
  const outcome = r && def.choices.find((c) => c.id === r.choiceId)?.outcomes[r.outcome];

  return (
    <div className="event-overlay">
      <div className="event-card" role="dialog" aria-modal="true" aria-labelledby="event-title" data-testid="event-card">
        <div className="row">
          <h2 id="event-title">{def.title}</h2>
          <span className="muted">{formatClock(game.clockMinutes)}</span>
        </div>
        <p>{def.text}</p>
        {outcome && r ? (
          <>
            <p className="event-outcome">{outcome.text}</p>
            <ul className="event-effects">{effectLines(outcome, r).map((line, i) => <li key={i}>{line}</li>)}</ul>
            <button className="panel-action" autoFocus onClick={closeEvent}>Continue</button>
          </>
        ) : (
          <div className="event-choices">
            {def.choices.map((c) => {
              const missing = choiceMissing(game, c, content);
              return (
                <div key={c.id}>
                  <button disabled={Boolean(missing)} title={missing ?? undefined} onClick={() => act({ type: 'event.choose', choiceId: c.id })}>
                    {c.tag && <span className="event-tag">[{c.tag}]</span>} {c.label}
                  </button>
                  {missing && <span className="warn-text tiny">{missing}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
