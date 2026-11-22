import type { Feature, FeatureCollection } from 'geojson';
import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre v6 can't find its own worker once Vite bundles it; give it the bundled worker's URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useRef } from 'react';
import { distanceKm, type LatLon } from '../engine/systems/travel/geo';
import { previewTravel } from '../engine/systems/travel/travel';
import { content, LEG_ANIMATION_MS, useGameStore } from '../store/gameStore';

setWorkerUrl(workerUrl);

const COLORS = {
  sea: '#141210', land: '#3a342c', border: '#6b5f50', road: '#b08546', rail: '#857a6c', route: '#5aa0e0', fog: 'rgba(12, 10, 8, 0.5)',
  still: '#2f5870', river: '#4f9fd8', zone: '#e6c828',
};

// D-044: still water (unsafe) and flowing rivers (clean) from scripts/geo/build-water.mjs.
const waterAreasGeoJson = (): FeatureCollection => ({
  type: 'FeatureCollection',
  features: content.water.areas.map((a) => ({ type: 'Feature', properties: { river: a.river }, geometry: { type: 'Polygon', coordinates: [a.ring] } })),
});
const riversGeoJson = (): Feature => ({ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: content.water.rivers } });
// D-050: mapped wells, clean water.
const wellsGeoJson = (): Feature => ({ type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: content.water.wells } });

/** D-043: the band within radiusKm of the Trichy–Villupuram line, as a polygon with rounded ends. */
function zoneGeoJson(): Feature {
  const { from, to, radiusKm } = content.scavenging.radiation;
  const kx = 111.32 * Math.cos(((from.lat + to.lat) / 2) * (Math.PI / 180));
  const ky = 110.57;
  const heading = Math.atan2((to.lat - from.lat) * ky, (to.lon - from.lon) * kx);
  const arc = (c: LatLon, start: number) =>
    Array.from({ length: 33 }, (_, i) => {
      const a = start + (Math.PI * i) / 32;
      return [c.lon + (radiusKm * Math.cos(a)) / kx, c.lat + (radiusKm * Math.sin(a)) / ky];
    });
  const ring = [...arc(to, heading - Math.PI / 2), ...arc(from, heading + Math.PI / 2)];
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]!]] } };
}

// Placeholder radiation trefoil (D-004: placeholder art), drawn in the zone's middle.
const TREFOIL = `<svg class="zone-icon" viewBox="-50 -50 100 100" aria-hidden="true">
  <circle r="48" fill="#e6c828" stroke="#141210" stroke-width="4"/>
  <circle r="8" fill="#141210"/>
  ${[90, 210, 330].map((d) => `<path d="M0 0 L${40 * Math.cos(((d - 30) * Math.PI) / 180)} ${-40 * Math.sin(((d - 30) * Math.PI) / 180)} A40 40 0 0 0 ${40 * Math.cos(((d + 30) * Math.PI) / 180)} ${-40 * Math.sin(((d + 30) * Math.PI) / 180)} Z" fill="#141210"/>`).join('')}
  <circle r="14" fill="#e6c828"/><circle r="8" fill="#141210"/>
</svg>`;

const roadsGeoJson = (): Feature => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'MultiLineString',
    coordinates: content.roads.edges.map(([a, b]) => {
      const [la, lo] = content.roads.nodes[a]!;
      const [lb, ob] = content.roads.nodes[b]!;
      return [[lo, la], [ob, lb]];
    }),
  },
});

const line = (points: LatLon[]): Feature => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: points.map((p) => [p.lon, p.lat]) },
});

/** Point at fraction `t` of the way along a path, by distance. */
function along(path: LatLon[], t: number): LatLon {
  const lengths = path.slice(1).map((p, i) => distanceKm(path[i]!, p));
  let target = lengths.reduce((a, b) => a + b, 0) * t;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]!) {
      const f = lengths[i] ? target / lengths[i]! : 0;
      const a = path[i]!;
      const b = path[i + 1]!;
      return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f };
    }
    target -= lengths[i]!;
  }
  return path[path.length - 1]!;
}

export function MapView() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const fogRef = useRef<HTMLCanvasElement | null>(null);
  const prabuRef = useRef<Marker | null>(null);
  const siteMarkers = useRef(new Map<string, Marker>());

  const game = useGameStore((s) => s.game);
  const selection = useGameStore((s) => s.selection);
  const lastLegPath = useGameStore((s) => s.lastLegPath);
  const select = useGameStore((s) => s.select);

  // Create the map once.
  useEffect(() => {
    const start = useGameStore.getState().game?.player.position ?? { lat: 9.56, lon: 77.62 };
    const map = new MapLibreMap({
      container: container.current!,
      style: {
        version: 8,
        sources: {
          land: { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: content.outline.polygons } } },
          roads: { type: 'geojson', data: roadsGeoJson() },
          rail: { type: 'geojson', data: new URL('geo/rail.json', document.baseURI).href },
          route: { type: 'geojson', data: line([]) },
          water: { type: 'geojson', data: waterAreasGeoJson() },
          rivers: { type: 'geojson', data: riversGeoJson() },
          wells: { type: 'geojson', data: wellsGeoJson() },
          zone: { type: 'geojson', data: zoneGeoJson() },
        },
        layers: [
          { id: 'sea', type: 'background', paint: { 'background-color': COLORS.sea } },
          { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': COLORS.land } },
          { id: 'border', type: 'line', source: 'land', paint: { 'line-color': COLORS.border, 'line-width': 1 } },
          { id: 'water', type: 'fill', source: 'water', paint: { 'fill-color': ['case', ['get', 'river'], COLORS.river, COLORS.still] } },
          { id: 'rivers', type: 'line', source: 'rivers', paint: { 'line-color': COLORS.river, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 12, 2, 14, 3.5] } },
          { id: 'wells', type: 'circle', source: 'wells', paint: { 'circle-color': COLORS.river, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 12, 3, 15, 5], 'circle-stroke-color': '#1c1916', 'circle-stroke-width': 1 } },
          { id: 'zone', type: 'fill', source: 'zone', paint: { 'fill-color': COLORS.zone, 'fill-opacity': 0.18 } },
          { id: 'zone-edge', type: 'line', source: 'zone', paint: { 'line-color': COLORS.zone, 'line-width': 1.5, 'line-dasharray': [4, 3] } },
          { id: 'rail', type: 'line', source: 'rail', paint: { 'line-color': COLORS.rail, 'line-width': 1.5, 'line-dasharray': [3, 2] } },
          { id: 'roads', type: 'line', source: 'roads', paint: { 'line-color': COLORS.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 11, 1.4, 14, 3] } },
          { id: 'route', type: 'line', source: 'route', paint: { 'line-color': COLORS.route, 'line-width': 3, 'line-dasharray': [1, 1.5] } },
        ],
      },
      center: [start.lon, start.lat],
      zoom: 11,
      minZoom: 6,
      maxZoom: 15,
      maxBounds: [[75.5, 7.6], [81.5, 13.9]],
      attributionControl: { customAttribution: '© OpenStreetMap contributors · Natural Earth' },
      // Without this, compositing the fog canvas on top can show a blank map frame in Chrome.
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-left');
    map.on('click', (e: { lngLat: { lat: number; lng: number } }) => useGameStore.getState().select({ point: { lat: e.lngLat.lat, lon: e.lngLat.lng } }));
    // Double-click on open ground travels there (replaces double-click zoom; wheel, pinch and +/− still zoom).
    map.on('dblclick', (e: { lngLat: { lat: number; lng: number }; preventDefault: () => void }) => {
      e.preventDefault();
      const store = useGameStore.getState();
      store.select({ point: { lat: e.lngLat.lat, lon: e.lngLat.lng } });
      void store.travel();
    });

    // Fog sits between the map and the markers, so known places show through it.
    const fog = document.createElement('canvas');
    fog.className = 'fog';
    map.getCanvasContainer().appendChild(fog);
    fogRef.current = fog;
    const redraw = () => drawFog(map, fog);
    map.on('move', redraw);
    map.on('resize', redraw);
    map.on('load', redraw);

    const { from, to } = content.scavenging.radiation;
    const icon = document.createElement('div');
    icon.innerHTML = TREFOIL;
    icon.title = 'Radiation zone';
    new Marker({ element: icon }).setLngLat([(from.lon + to.lon) / 2, (from.lat + to.lat) / 2]).addTo(map);

    // Clicking Prabu shows what he can do where he stands (the only way to open it on a phone).
    const el = document.createElement('button');
    el.className = 'prabu-marker';
    el.title = 'Prabu';
    el.setAttribute('aria-label', 'Prabu: what to do here');
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      useGameStore.getState().openPanel('here');
    });
    el.addEventListener('dblclick', (e) => e.stopPropagation());
    prabuRef.current = new Marker({ element: el }).setLngLat([start.lon, start.lat]).addTo(map);

    mapRef.current = map;
    const markers = siteMarkers.current;
    return () => {
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Site markers for discovered places.
  const discovered = game?.map.discoveredSiteIds.join(',');
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !discovered) return;
    for (const id of discovered.split(',')) {
      if (siteMarkers.current.has(id)) continue;
      const site = content.sites[id]!;
      const el = document.createElement('button');
      el.className = `site-marker kind-${site.kind}`;
      el.setAttribute('aria-label', site.name);
      el.innerHTML = `<span class="dot"></span><span class="label"></span>`;
      el.querySelector('.label')!.textContent = site.name;
      // Clicking the already-selected place (so also a double-click) travels there.
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const store = useGameStore.getState();
        const selected = store.selection && 'siteId' in store.selection && store.selection.siteId === id;
        if (selected) void store.travel();
        else select({ siteId: id });
      });
      el.addEventListener('dblclick', (e) => e.stopPropagation());
      siteMarkers.current.set(id, new Marker({ element: el, anchor: 'left', offset: [-6, 0] }).setLngLat([site.lon, site.lat]).addTo(map));
    }
  }, [discovered, select]);

  // Fog follows the revealed points.
  const revealed = game?.map.revealed;
  useEffect(() => {
    const map = mapRef.current;
    if (map && fogRef.current) drawFog(map, fogRef.current);
  }, [revealed]);

  // Route line: the trip under way, or a preview of the selected one.
  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>('route');
    if (!source || !game) return;
    let points: LatLon[] = [];
    if (game.travel) points = game.travel.legs.slice(game.travel.nextLeg - 1 < 0 ? 0 : game.travel.nextLeg - 1).flatMap((l) => l.path);
    else if (selection) {
      const preview = previewTravel(game, selection, content);
      if (preview.ok) points = preview.plan.legs.flatMap((l) => l.path);
    }
    source.setData(line(points));
  }, [game, selection]);

  // Prabu's marker: animate along the leg that just resolved, otherwise jump.
  const position = game?.player.position;
  useEffect(() => {
    const marker = prabuRef.current;
    if (!marker || !position) return;
    if (!lastLegPath) {
      marker.setLngLat([position.lon, position.lat]);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / (LEG_ANIMATION_MS * 0.9));
      const p = along(lastLegPath, t);
      marker.setLngLat([p.lon, p.lat]);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [position, lastLegPath]);

  return <div ref={container} className="map" />;
}

/** Darkens everything, then cuts soft holes around each revealed point (sight radius, D-018). */
function drawFog(map: MapLibreMap, canvas: HTMLCanvasElement) {
  const game = useGameStore.getState().game;
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx || !game) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = COLORS.fog;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-out';
  const radiusDeg = content.world.sightRadiusKm / 111.32;
  for (const p of game.map.revealed) {
    const c = map.project([p.lon, p.lat]);
    const r = Math.abs(map.project([p.lon, p.lat + radiusDeg]).y - c.y);
    if (c.x < -r || c.y < -r || c.x > w + r || c.y > h + r) continue;
    const g = ctx.createRadialGradient(c.x, c.y, r * 0.6, c.x, c.y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
