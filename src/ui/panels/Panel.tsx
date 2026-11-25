import { previewTravel, siteAt } from '../../engine/systems/travel/travel';
import { ridden, riddenDef, speedFactor } from '../../engine/systems/vehicles/ridden';
import { darkMinutes, torchChargeFor } from '../../engine/systems/night/night';
import { content, useGameStore } from '../../store/gameStore';
import { formatClock, formatDuration, formatKm, kindLabel } from '../format';
import { HerePanel } from './HerePanel';
import { SpotPanel } from './SpotPanel';
import { PackPanel } from './PackPanel';
import { RestPanel } from './RestPanel';
import { CraftPanel } from './CraftPanel';
import { TestPanel } from './TestPanel';
import { JournalPanel } from './JournalPanel';
import { VehiclePanel } from './VehiclePanel';

/** Right-hand panel (bottom sheet on mobile): the trip under way, Pack, Rest, the selected place, or where Prabu stands. */
export function Panel() {
  const game = useGameStore((s) => s.game);
  const selection = useGameStore((s) => s.selection);
  const stopRequested = useGameStore((s) => s.stopRequested);
  const select = useGameStore((s) => s.select);
  const travel = useGameStore((s) => s.travel);
  const requestStop = useGameStore((s) => s.requestStop);
  const panel = useGameStore((s) => s.panel);
  const townSelection = useGameStore((s) => s.townSelection);
  if (!game) return null;
  // A sprained ankle slows every leg on foot (D-061); the times shown include it.
  const slow = (minutes: number) => Math.round(minutes / speedFactor(game, content));
  const vehicle = riddenDef(game, content);
  const v = ridden(game);
  const worn = v?.durability !== null && v?.durability !== undefined && v.durability <= content.vehicles.warnAt;

  if (game.travel) {
    const t = game.travel;
    const remaining = t.legs.slice(t.nextLeg).reduce((sum, l) => sum + slow(l.minutes), 0);
    const name = t.siteId ? content.sites[t.siteId]?.name : 'Unmarked ground';
    return (
      <div className="panel-body">
        <h2>Travelling</h2>
        <p className="muted">To {name}</p>
        <hr />
        {vehicle && <Row label="By" value={vehicle.name} />}
        {worn && <p className="warn-text">The {vehicle!.name.toLowerCase()} is wearing out ({Math.round(v!.durability!)}).</p>}
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
  if (panel === 'vehicle') return <VehiclePanel />;
  if (panel === 'rest') return <RestPanel />;
  if (panel === 'craft') return <CraftPanel />;
  if (panel === 'journal') return <JournalPanel />;
  if (panel === 'test') return <TestPanel />;
  if (game.town) return townSelection && townSelection !== game.town.at ? <SpotPanel spotId={townSelection} /> : <HerePanel />;
  // Nothing chosen, or the place he's standing at: show what he can do here (P-013).
  const hereSite = siteAt(game.player.position, content);
  if (panel === 'here' || !selection || ('siteId' in selection && selection.siteId === hereSite?.id)) return <HerePanel />;

  const site = 'siteId' in selection ? content.sites[selection.siteId] : undefined;
  const preview = previewTravel(game, selection, content);
  // P-015: warn when the trip runs into the dark with too little torch charge for it.
  const tripMinutes = preview.ok ? slow(preview.plan.minutes) : 0;
  const need = torchChargeFor(darkMinutes(game.clockMinutes, tripMinutes, content.world.night), content.world.night);
  const charge = Math.max(0, ...game.inventory.stacks.filter((s) => s.itemId === content.scavenging.torchItemId).map((s) => s.charge ?? 0));
  const unlit = need > charge;
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
          <Row label="By" value={vehicle?.name ?? 'On foot'} />
          <Row label="Distance" value={formatKm(preview.plan.roadKm + preview.plan.crossKm)} />
          <Row label="Road" value={formatKm(preview.plan.roadKm)} />
          <Row label="Cross-country" value={formatKm(preview.plan.crossKm)} />
          <Row label="Time" value={formatDuration(tripMinutes)} />
          <Row label="Legs" value={String(preview.plan.legs.length)} />
          {worn && <p className="warn-text">The {vehicle!.name.toLowerCase()} is wearing out ({Math.round(v!.durability!)}).</p>}
          {unlit && <p className="warn-text" data-testid="dark-warning">This trip runs into the dark without enough torch charge. Moving in the dark risks injury.</p>}
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
