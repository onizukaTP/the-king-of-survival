import type { JournalNote } from '../../engine/core/state';
import { nextLevel } from '../../engine/systems/progression/progression';
import { content, useGameStore } from '../../store/gameStore';
import { formatClock } from '../format';

function noteText(n: JournalNote): string {
  if (n.kind === 'discovered') return `Found ${content.sites[n.siteId ?? '']?.name ?? 'a place'}.`;
  if (n.kind === 'level') return `Reached level ${n.level}.`;
  const counts = new Map<string, number>();
  for (const id of n.enemies ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
  const who = [...counts].map(([id, k]) => `${(content.enemies[id]?.name ?? id).toLowerCase()}${k > 1 ? ` ×${k}` : ''}`).join(', ');
  return `Won a fight${who ? `: ${who}` : ''}.`;
}

/** The Journal (D-076): level and XP, the sister entry, the mother's wish and the latest notes. */
export function JournalPanel() {
  const game = useGameStore((s) => s.game)!;
  const openPanel = useGameStore((s) => s.openPanel);
  const { quest, wish } = content.story.journal;
  const { level, xp } = game.progression;
  const next = nextLevel(game, content);

  return (
    <div className="panel-body" data-testid="journal-panel">
      <div className="panel-head">
        <h2>Journal</h2>
        <button className="icon" aria-label="Close" onClick={() => openPanel(null)}>×</button>
      </div>
      <p className="muted" data-testid="level">Level {level} · {next ? `${xp} / ${next.xp} XP` : `${xp} XP (highest level)`}</p>
      <hr />
      <h3>{quest.title}</h3>
      <p className="journal-text">{quest.text}</p>
      <h3>{wish.title}</h3>
      <ul className="journal-list">{wish.items.map((w) => <li key={w}>{w}</li>)}</ul>
      <h3>Notes</h3>
      {game.journal.notes.length ? (
        <ul className="journal-list journal-notes">
          {[...game.journal.notes].reverse().map((n, i) => (
            <li key={i}><span className="muted tiny">{formatClock(n.at)}</span> {noteText(n)}</li>
          ))}
        </ul>
      ) : <p className="muted">Nothing yet.</p>}
    </div>
  );
}
