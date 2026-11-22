import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { townSpots, type Spot } from '../engine/systems/town/town';
import { distanceKm, type LatLon } from '../engine/systems/travel/geo';
import { content, useGameStore } from '../store/gameStore';

// Flat plan in metres around the town's edge point: plenty accurate across a town.
const RAD = Math.PI / 180;
const project = (p: LatLon, origin: LatLon) => ({
  x: (p.lon - origin.lon) * 111_320 * Math.cos(origin.lat * RAD),
  y: (origin.lat - p.lat) * 110_570,
});
// The first view frames spots within this distance of the edge; Madurai's airport is a pan away.
const FIRST_VIEW_KM = 3;
const PAD_M = 250;
// Labels show once the plan is zoomed in at least this far (pixels per km), so they don't pile up.
const LABELS_PX_PER_KM = 120;

type Box = { x: number; y: number; w: number; h: number };

/** The town map (P-014): a flat plan of real streets with the town's buildings and water. */
export function TownMap() {
  const game = useGameStore((s) => s.game)!;
  const selected = useGameStore((s) => s.townSelection);
  const selectSpot = useGameStore((s) => s.selectSpot);
  const walk = useGameStore((s) => s.walk);
  const openPanel = useGameStore((s) => s.openPanel);
  const siteId = game.town!.siteId;
  const town = content.towns[siteId]!;
  const origin = content.sites[siteId]!;

  const spots = useMemo(() => townSpots(town, content), [town]);
  const streets = useMemo(
    () => (content.townStreets[siteId] ?? []).map((line) => line.map(([lon, lat]) => project({ lat, lon }, origin)).map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ')),
    [siteId, origin],
  );

  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<Box>(() => {
    const near = spots.filter((s) => distanceKm(s, origin) <= FIRST_VIEW_KM).map((s) => project(s, origin));
    const xs = near.map((p) => p.x), ys = near.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs) - PAD_M, Math.max(...xs) + PAD_M, Math.min(...ys) - PAD_M, Math.max(...ys) + PAD_M];
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  });

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize({ w: el.clientWidth || 1, h: el.clientHeight || 1 }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The viewBox is fitted with "meet", so one screen pixel is the larger of the two ratios in metres.
  const metresPerPx = Math.max(view.w / size.w, view.h / size.h);
  const px = (n: number) => n * metresPerPx;
  const showLabels = 1000 / metresPerPx >= LABELS_PX_PER_KM;

  const zoom = (factor: number, cx = view.x + view.w / 2, cy = view.y + view.h / 2) =>
    setView((v) => ({ x: cx - (cx - v.x) * factor, y: cy - (cy - v.y) * factor, w: v.w * factor, h: v.h * factor }));

  const toPlan = (clientX: number, clientY: number) => {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(clientX, clientY).matrixTransform(m);
    return { x: p.x, y: p.y };
  };
  const onWheel = (e: WheelEvent) => {
    const p = toPlan(e.clientX, e.clientY);
    zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, p.x, p.y);
  };

  // Drag to pan; a press that barely moves is a click.
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.buttons === 0) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) svg.current?.setPointerCapture(e.pointerId);
    d.moved = true;
    d.x = e.clientX;
    d.y = e.clientY;
    setView((v) => ({ ...v, x: v.x - px(dx), y: v.y - px(dy) }));
  };
  const wasDrag = () => drag.current?.moved ?? false;

  const at = game.town!.at;
  const pick = (spot: Spot) => {
    if (wasDrag()) return;
    if (spot.id === at) openPanel('here');
    // D-022 on the town map: clicking the selected spot again walks there.
    else if (spot.id === selected) walk(spot.id);
    else selectSpot(spot.id);
  };
  const prabu = project(game.player.position, origin);

  return (
    <div className="map town-map">
      <svg
        ref={svg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onClick={() => !wasDrag() && selectSpot(null)}
        role="img"
        aria-label={`Map of ${origin.name}`}
      >
        <g className="streets">
          {streets.map((points, i) => <polyline key={i} points={points} />)}
        </g>
        {spots.map((spot) => {
          const p = project(spot, origin);
          const left = spot.kind === 'building' ? (game.sites[spot.id]?.richness ?? 100) : 100;
          const r = px(spot.kind === 'building' ? 7 : 6);
          const label = showLabels || spot.id === selected || spot.id === at;
          return (
            <g
              key={spot.id}
              className={`spot spot-${spot.kind} ${spot.kind === 'water' ? spot.water : ''} ${spot.id === selected ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={spot.name}
              aria-pressed={spot.id === selected}
              // Searched buildings fade with their stock (P-014).
              opacity={0.45 + 0.55 * (left / 100)}
              onClick={(e) => { e.stopPropagation(); pick(spot); }}
              onDoubleClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(spot); } }}
            >
              {spot.kind === 'water' ? <circle cx={p.x} cy={p.y} r={r} /> : spot.kind === 'edge'
                ? <rect x={p.x - r} y={p.y - r} width={2 * r} height={2 * r} transform={`rotate(45 ${p.x} ${p.y})`} />
                : <rect x={p.x - r} y={p.y - r} width={2 * r} height={2 * r} rx={px(2)} />}
              {label && <text x={p.x + r + px(4)} y={p.y + px(4)} fontSize={px(12)}>{spot.name}</text>}
            </g>
          );
        })}
        <circle className="town-prabu" cx={prabu.x} cy={prabu.y} r={px(6)} strokeWidth={px(2)}>
          <title>Prabu</title>
        </circle>
      </svg>
      <div className="town-zoom">
        <button className="small" aria-label="Zoom in" onClick={() => zoom(1 / 1.5)}>+</button>
        <button className="small" aria-label="Zoom out" onClick={() => zoom(1.5)}>−</button>
      </div>
      <p className="town-credit">© OpenStreetMap contributors</p>
    </div>
  );
}
