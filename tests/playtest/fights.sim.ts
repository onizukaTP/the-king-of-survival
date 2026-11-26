import { it } from 'vitest';
import { loadContent } from '../../src/content/loader';
import { applyCommand, type Command } from '../../src/engine/core/commands';
import { createNewGame, type GameState } from '../../src/engine/core/state';
import { combatWishes } from './bot';

declare const process: { env: Record<string, string | undefined> };

// Every fight the events can start (events.json), at their smallest and largest.
const FIGHTS: { name: string; enemies: { enemyId: string; count: number }[]; ambush: boolean }[] = [
  { name: '2 wild dogs', enemies: [{ enemyId: 'enemy.wild_dog', count: 2 }], ambush: false },
  { name: '4 wild dogs', enemies: [{ enemyId: 'enemy.wild_dog', count: 4 }], ambush: false },
  { name: 'Roadblock (blade + bow)', enemies: [{ enemyId: 'enemy.raider_blade', count: 1 }, { enemyId: 'enemy.raider_bow', count: 1 }], ambush: false },
  { name: 'Mutated boar', enemies: [{ enemyId: 'enemy.mutated_boar', count: 1 }], ambush: false },
  { name: 'Ambush, 1 raider', enemies: [{ enemyId: 'enemy.raider_blade', count: 1 }], ambush: true },
  { name: 'Ambush, 2 raiders', enemies: [{ enemyId: 'enemy.raider_blade', count: 2 }], ambush: true },
];
const SETUPS = [
  { name: 'L1 knife', level: 1, weapon: 'item.hunting_knife' },
  { name: 'L1 aruval', level: 1, weapon: 'item.aruval' },
  { name: 'L1 spear', level: 1, weapon: 'item.bamboo_spear' },
  { name: 'L1 bow', level: 1, weapon: 'item.bow' },
  { name: 'L5 knife', level: 5, weapon: 'item.hunting_knife' },
];

it('fights every encounter many times', () => {
  const content = loadContent();
  const N = Number(process.env.FIGHTS ?? 200);
  const rows: string[] = [];
  for (const fleeBelow of [25, 0]) {
    rows.push(`\n${fleeBelow ? 'Flees below 25 Health' : 'Never flees'} (${N} fights each): won / fled / died, Health lost when won, rounds`);
    for (const f of FIGHTS) {
      for (const setup of SETUPS) {
        let won = 0, fled = 0, died = 0, lost = 0, rounds = 0;
        for (let seed = 1; seed <= N; seed++) {
          let s: GameState = createNewGame(content, seed * 7919);
          s.introSeen = true;
          s.progression.level = setup.level;
          if (setup.weapon !== s.inventory.weapon) {
            s = must(s, { type: 'debug.item', itemId: setup.weapon, count: 1 }, content);
            s = must(s, { type: 'item.equip', index: s.inventory.stacks.findIndex((x) => x.itemId === setup.weapon) }, content);
          }
          if (setup.weapon === 'item.bow') s = must(s, { type: 'debug.item', itemId: 'item.arrow', count: 20 }, content);
          s = must(s, { type: 'debug.fight', enemies: f.enemies, ambush: f.ambush }, content);
          let guard = 0;
          while (s.combat && !s.combat.result && !s.dead && guard++ < 500) {
            let played = false;
            for (const c of combatWishes(s, content, fleeBelow)) {
              const r = applyCommand(s, c, content);
              if (r.ok) { s = r.state; played = true; break; }
            }
            if (!played) break;
          }
          if (s.dead) died++;
          else if (s.combat?.result?.outcome === 'won') { won++; lost += 100 - s.survival.health; rounds += s.combat.round; }
          else fled++;
        }
        const pct = (n: number) => `${Math.round((n / N) * 100)}%`.padStart(4);
        rows.push(`${f.name.padEnd(24)} ${setup.name.padEnd(10)} ${pct(won)} ${pct(fled)} ${pct(died)}   −${won ? Math.round(lost / won) : '-'} Health, ${won ? (rounds / won).toFixed(1) : '-'} rounds`);
      }
    }
  }
  console.log(rows.join('\n'));
});

function must(s: GameState, c: Command, content: ReturnType<typeof loadContent>): GameState {
  const r = applyCommand(s, c, content);
  if (!r.ok) throw new Error(`${c.type}: ${r.error.message}`);
  return r.state;
}
