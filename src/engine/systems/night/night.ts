import type { Content } from '../../../content/loader';
import type { WorldConfig } from '../../../content/schemas';
import type { GameEvent } from '../../core/commands';
import type { GameState } from '../../core/state';
import { addStack, takeOne } from '../inventory/inventory';

type NightConfig = WorldConfig['night'];
const DAY = 24 * 60;

/** Night runs from 18:30 to 06:00 (D-060). */
export function isNight(minute: number, cfg: NightConfig): boolean {
  const t = minute % DAY;
  return t >= cfg.startMinute || t < cfg.endMinute;
}

/** Whether `minute` falls in a full-moon night. A night belongs to the evening it began; Day 1 is a new moon. */
export function isFullMoonNight(minute: number, cfg: NightConfig): boolean {
  if (!isNight(minute, cfg)) return false;
  const day = Math.floor(minute / DAY) - (minute % DAY < cfg.endMinute ? 1 : 0);
  const cycleDay = (((day % cfg.moonCycleDays) + cfg.moonCycleDays) % cfg.moonCycleDays) + 1;
  return cfg.fullMoonDays.includes(cycleDay);
}

/** Night without the full moon: moving needs a light (D-048). */
export const isDark = (minute: number, cfg: NightConfig) => isNight(minute, cfg) && !isFullMoonNight(minute, cfg);

/** Minutes of [start, start + minutes) that are dark. */
export function darkMinutes(start: number, minutes: number, cfg: NightConfig): number {
  let n = 0;
  for (let m = start; m < start + minutes; m++) if (isDark(m, cfg)) n += 1;
  return n;
}

/** Torch charge a stretch of dark movement uses (10% an hour, at least 1 for any dark time). */
export const torchChargeFor = (dark: number, cfg: NightConfig) => (dark > 0 ? Math.ceil((dark * cfg.torchChargePerHour) / 60) : 0);

/**
 * Before moving for `minutes` from now: the torch switches on by itself for the dark part (P-015).
 * Returns whether he moves in the dark without light. A torch that runs flat part-way counts as no light.
 * Mutates `state`.
 */
export function lightTheWay(state: GameState, minutes: number, content: Content, events: GameEvent[]): boolean {
  const cfg = content.world.night;
  const dark = darkMinutes(state.clockMinutes, minutes, cfg);
  if (!dark) return false;
  const need = torchChargeFor(dark, cfg);
  const i = state.inventory.stacks.findIndex((s) => s.itemId === content.scavenging.torchItemId && (s.charge ?? 0) > 0);
  if (i < 0) return true;
  const torch = takeOne(state.inventory, i);
  const left = Math.max(0, (torch.charge ?? 0) - need);
  addStack(state.inventory, { ...torch, charge: left });
  if (left === 0) events.push({ type: 'torch_flat' });
  return (torch.charge ?? 0) < need;
}
