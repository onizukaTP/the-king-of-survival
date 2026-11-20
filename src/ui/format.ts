import type { SiteKind } from '../content/schemas';

const pad = (n: number) => String(n).padStart(2, '0');

/** Minutes since Day 1 00:00 → "Day 1 · 06:00". */
export function formatClock(minutes: number): string {
  const day = Math.floor(minutes / 1440) + 1;
  const ofDay = minutes % 1440;
  return `Day ${day} · ${pad(Math.floor(ofDay / 60))}:${pad(ofDay % 60)}`;
}

/** 160 → "2 h 40 min"; 50 → "50 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const formatKm = (km: number) => `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;

export const kindLabel: Record<SiteKind, string> = {
  home: 'Home',
  hunting: 'Hunting ground',
  ruins: 'Ruins',
  rail: 'Railway',
  road: 'Highway',
  water: 'Water',
  city: 'City ruins',
};
