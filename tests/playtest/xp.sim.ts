import { it } from 'vitest';
import { loadContent } from '../../src/content/loader';
import { playRun } from './bot';

declare const process: { env: Record<string, string | undefined> };

// XP a careful player has at the end of each day (median and quartiles), for tuning the level table.
it('XP by day', () => {
  const content = loadContent();
  const runs = Number(process.env.RUNS ?? 100), days = Number(process.env.DAYS ?? 30);
  const all = Array.from({ length: runs }, (_, i) => playRun(content, i + 1, days)).filter((r) => r.xpByDay.length >= days);
  const at = (d: number, q: number) => { const v = all.map((r) => r.xpByDay[d - 1]!).sort((a, b) => a - b); return v[Math.floor(q * (v.length - 1))]; };
  console.log(`${all.length} runs lived ${days} days`);
  for (let d = 1; d <= days; d++) console.log(`day ${d}: ${at(d, 0.25)} / ${at(d, 0.5)} / ${at(d, 0.75)}`);
});
