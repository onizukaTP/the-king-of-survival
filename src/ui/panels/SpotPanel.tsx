import { townSpots, walkMinutes } from '../../engine/systems/town/town';
import { distanceKm } from '../../engine/systems/travel/geo';
import { content, useGameStore } from '../../store/gameStore';
import { formatDuration, formatKm } from '../format';

/** A building or water point picked on the town map (P-014): what it is and the walk there. */
export function SpotPanel({ spotId }: { spotId: string }) {
  const game = useGameStore((s) => s.game)!;
  const selectSpot = useGameStore((s) => s.selectSpot);
  const walk = useGameStore((s) => s.walk);
  const spot = townSpots(content.towns[game.town!.siteId]!, content).find((s) => s.id === spotId);
  if (!spot) return null;
  const kind = spot.kind === 'building' ? spot.type.name : spot.kind === 'water' ? (spot.water === 'well' ? 'Well: clean water' : 'Tank: unsafe water') : 'Where the town meets the world map';
  const entry = game.sites[spot.id];
  const left = entry && !(entry.refreshAt !== null && game.clockMinutes >= entry.refreshAt) ? entry.richness : 100;

  return (
    <div className="panel-body" data-testid="spot-panel">
      <div className="panel-head">
        <h2>{spot.name}</h2>
        <button className="icon" aria-label="Close" onClick={() => selectSpot(null)}>×</button>
      </div>
      <p className="muted">{kind}</p>
      <hr />
      <div className="row"><span className="muted">Distance</span><span>{formatKm(distanceKm(game.player.position, spot))}</span></div>
      <div className="row"><span className="muted">Walk</span><span>{formatDuration(walkMinutes(game.player.position, spot, content))}</span></div>
      {spot.kind === 'building' && (
        <>
          <div className="row"><span className="muted">Search</span><span>{formatDuration(spot.type.searchMinutes)}</span></div>
          <div className="row"><span className="muted">Left to find</span><span>{Math.round(left)}%</span></div>
        </>
      )}
      <button className="panel-action" onClick={() => walk(spot.id)}>Walk there</button>
    </div>
  );
}
