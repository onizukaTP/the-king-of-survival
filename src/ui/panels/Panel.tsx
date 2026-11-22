import { previewTravel, siteAt } from '../../engine/systems/travel/travel';
import { content, useGameStore } from '../../store/gameStore';
import { formatClock, formatDuration, formatKm, kindLabel } from '../format';
import { HerePanel } from './HerePanel';
import { PackPanel } from './PackPanel';
import { RestPanel } from './RestPanel';

/** Right-hand panel (bottom sheet on mobile): the trip under way, Pack, Rest, the selected place, or where Prabu stands. */
export function Panel() {
  const game = useGameStore((s) => s.game);
  const selection = useGameStore((s) => s.selection);
  const stopRequested = useGameStore((s) => s.stopRequested);
  const select = useGameStore((s) => s.select);
  const travel = useGameStore((s) => s.travel);
  const requestStop = useGameStore((s) => s.requestStop);
  const panel = useGameStore((s) => s.panel);
  if (!game) return null;

  if (game.travel) {
    const t = game.travel;
    const remaining = t.legs.slice(t.nextLeg).reduce((sum, l) => sum + l.minutes, 0);
    const name = t.siteId ? content.sites[t.siteId]?.name : 'Unmarked ground';
    return (
      <div className="panel-body">
        <h2>Travelling</h2>
        <p className="muted">To {name}</p>
        <hr />
        <Row label="Leg" value={`${Math.max(1, t.nextLeg)} of ${t.legs.length}`} />
        <div className="progress" aria-hidden="true"><div style={{ width: `${(t.nextLeg / t.legs.length) * 100}%` }} /></div>
        <Row label="Arrive" value={formatClock(game.clockMinutes + remaining)} />
        <button className="panel-action" onClick={requestStop} disabled={stopRequested}>
          {stopRequested ? 'Stopping…' : 'Stop after this leg'}
        </button>
      </div>
    );
  }

  if (panel === 'pack') return <PackPanel />;
  if (panel === 'rest') return <RestPanel />;
  // Nothing chosen, or the place he's standing at: show what he can do here (P-013).
  const hereSite = siteAt(game.player.position, content);
  if (panel === 'here' || !selection || ('siteId' in selection && selection.siteId === hereSite?.id)) return <HerePanel />;

  const site = 'siteId' in selection ? content.sites[selection.siteId] : undefined;
  const preview = previewTravel(game, selection, content);
  return (
    <div className="panel-body">
      <div className="panel-head">
        <h2>{site?.name ?? 'Unmarked ground'}</h2>
        <button className="icon" aria-label="Close" onClick={() => select(null)}>×</button>
      </div>
      <p className="muted">
        {site ? kindLabel[site.kind] : 'point' in selection && `${selection.point.lat.toFixed(3)}° N, ${selection.point.lon.toFixed(3)}° E`}
      </p>
      <hr />
      {preview.ok ? (
        <>
          <Row label="Distance" value={formatKm(preview.plan.roadKm + preview.plan.crossKm)} />
          <Row label="Road" value={formatKm(preview.plan.roadKm)} />
          <Row label="Cross-country" value={formatKm(preview.plan.crossKm)} />
          <Row label="Time" value={formatDuration(preview.plan.minutes)} />
          <Row label="Legs" value={String(preview.plan.legs.length)} />
          <button className="panel-action" onClick={() => void travel()}>Travel</button>
        </>
      ) : (
        <p className="muted">{preview.error.message}</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="row">
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
