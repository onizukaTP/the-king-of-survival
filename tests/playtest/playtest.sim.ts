import { it } from 'vitest';
import { loadContent } from '../../src/content/loader';
import { playRun, type RunReport } from './bot';

// Node's process, without pulling in @types/node for one script.
declare const process: { env: Record<string, string | undefined> };

const RUNS = Number(process.env.RUNS ?? 40);
const DAYS = Number(process.env.DAYS ?? 10);

it(`plays ${RUNS} runs of up to ${DAYS} days`, () => {
  const content = loadContent();
  const runs: RunReport[] = [];
  for (let seed = 1; seed <= RUNS; seed++) runs.push(playRun(content, seed, DAYS));
  const avg = (f: (r: RunReport) => number) => Math.round((runs.reduce((n, r) => n + f(r), 0) / runs.length) * 10) / 10;
  const causes: Record<string, number> = {};
  for (const r of runs) if (r.died) causes[r.cause ?? '?'] = (causes[r.cause ?? '?'] ?? 0) + 1;
  const dayDead = runs.filter((r) => r.died).map((r) => r.days).sort((a, b) => a - b);
  console.log(JSON.stringify({
    runs: RUNS, days: DAYS,
    died: runs.filter((r) => r.died).length, causes, dayOfDeath: dayDead,
    stuck: runs.filter((r) => r.stuck).map((r) => r.seed),
    avg: {
      daysLived: avg((r) => r.days), level: avg((r) => r.level), xp: avg((r) => r.xp), fights: avg((r) => r.fights), won: avg((r) => r.won), fled: avg((r) => r.fled),
      events: avg((r) => r.events), searches: avg((r) => r.searches), hunts: avg((r) => r.hunts), huntsHit: avg((r) => r.huntsHit),
      injuries: avg((r) => r.injuries), ill: avg((r) => r.ill), starvingHours: avg((r) => r.starvingHours),
      lowestFood: avg((r) => r.lowest.food), lowestWater: avg((r) => r.lowest.water), lowestHealth: avg((r) => r.lowest.health),
    },
  }, null, 1));
  if (process.env.DETAIL) for (const r of runs) console.log(JSON.stringify(r));
});
