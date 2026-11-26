import { it } from 'vitest';
import { loadContent } from '../../src/content/loader';
import { playRun } from './bot';

declare const process: { env: Record<string, string | undefined> };

// One run, every command: SEED=3 npm run playtest -- trace
it('traces one run', () => {
  if (!process.env.SEED) return;
  const lines: string[] = [];
  const r = playRun(loadContent(), Number(process.env.SEED), Number(process.env.DAYS ?? 14), (l) => lines.push(l));
  console.log(lines.slice(-Number(process.env.LAST ?? 120)).join('\n'));
  console.log(JSON.stringify(r));
});
