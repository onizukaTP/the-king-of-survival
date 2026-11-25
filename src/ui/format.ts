import type { SiteKind, Stats } from '../content/schemas';

export const STAT_LABELS: Record<string, string> = {
  atk: 'ATK', def: 'DEF', spd: 'SPD', critRate: 'Crit', critDamage: 'Crit dmg', acc: 'ACC', dodge: 'Dodge',
  stunRes: 'Stun res', bleedRes: 'Bleed res', blightRes: 'Blight res', debuffRes: 'Debuff res', moveRes: 'Move res', deathblowRes: 'Deathblow res',
  hunting: 'Hunting', luck: 'Luck',
};
export const PERCENT_STATS = new Set(['def', 'critRate', 'critDamage', 'stunRes', 'bleedRes', 'blightRes', 'debuffRes', 'moveRes', 'deathblowRes', 'hunting']);

/** A level's gains (D-076) → "ACC +3, Dodge +2". */
export function formatGains(gains: Partial<Stats>): string {
  return Object.entries(gains).map(([k, v]) => `${STAT_LABELS[k] ?? k} +${v}${PERCENT_STATS.has(k) ? '%' : ''}`).join(', ');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Minutes since Day 1 00:00 → "Day 1 · 06:00". */
export function formatClock(minutes: number): string {
  const day = Math.floor(minutes / 1440) + 1;
  const ofDay = minutes % 1440;
  return `Day ${day} · ${pad(Math.floor(ofDay / 60))}:${pad(ofDay % 60)}`;
}

/** 160 → "2 h 40 min"; 50 → "50 min". */
export function formatDuration(minutes: number): string {
  if (minutes >= 48 * 60) {
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    return h ? `${d} d ${h} h` : `${d} d`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const formatKg = (kg: number) => `${Math.round(kg * 100) / 100} kg`;

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
