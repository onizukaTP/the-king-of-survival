import { useState } from 'react';
import type { Band } from '../../content/schemas';
import type { CombatLog, GameState } from '../../engine/core/state';
import { attackBlocked, attackOdds, fleeChance } from '../../engine/systems/combat/combat';
import { weaponProfile } from '../../engine/systems/combat/stats';
import { content, useGameStore } from '../../store/gameStore';
import { StatsBlock } from '../components/StatsBlock';

const BANDS: [Band, string][] = [['far', 'Far'], ['mid', 'Mid'], ['close', 'Close']];
const itemName = (id: string) => content.items[id]?.name ?? id;

/** "Wild dog A", "Wild dog B" when there are several of a kind; the bare name otherwise. */
function enemyNames(game: GameState): string[] {
  const enemies = game.combat!.enemies;
  return enemies.map((e, i) => {
    const same = enemies.filter((x) => x.id === e.id);
    const name = content.enemies[e.id]?.name ?? e.id;
    return same.length > 1 ? `${name} ${String.fromCharCode(65 + same.indexOf(enemies[i]!))}` : name;
  });
}

function logLine(l: CombatLog, names: string[]): string {
  const who = (n: number | undefined) => (n === -1 || n === undefined ? 'Prabu' : names[n] ?? 'Someone');
  switch (l.kind) {
    case 'hit': return `${who(l.actor)} hits ${l.target === -1 ? 'Prabu' : who(l.target)} for ${l.damage}${l.crit ? ' (critical)' : ''}.`;
    case 'miss': return `${who(l.actor)} misses ${l.target === -1 ? 'Prabu' : who(l.target)}.`;
    case 'move': return l.actor === -1 ? `Prabu closes in on ${who(l.target)}.` : `${who(l.actor)} moves to ${l.band}.`;
    case 'aim': return 'Prabu takes aim.';
    case 'step_back': return 'Prabu steps back.';
    case 'item': return `Prabu uses ${itemName(l.itemId ?? '').toLowerCase()}.`;
    case 'flee_failed': return 'Prabu tries to run, but can\'t get away.';
    case 'killed': return `${who(l.target)} is dead.`;
  }
}

/** The fight (M7, D-063, D-066): enemies by band, the turn order, Prabu and his actions. Replaces the map. */
export function CombatScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const closeCombat = useGameStore((s) => s.closeCombat);
  const [picked, setPicked] = useState<number | null>(null);
  const [items, setItems] = useState(false);
  const c = game.combat!;
  const names = enemyNames(game);
  const alive = c.enemies.flatMap((e, i) => (e.hp > 0 ? [i] : []));
  const target = picked !== null && c.enemies[picked]?.hp ? picked : alive.find((i) => !attackBlocked(game, i, content)) ?? alive[0] ?? null;
  const w = weaponProfile(game, content);
  const myTurn = c.order[0] === -1 && !c.result && !game.dead;
  const blocked = target === null ? 'No target' : attackBlocked(game, target, content);
  const odds = target !== null && !blocked ? attackOdds(game, target, content) : null;
  const usable = game.inventory.stacks.flatMap((s, i) => {
    const it = content.items[s.itemId]!;
    return !it.recharges && (it.effects || it.curesInjury) ? [{ i, s, it }] : [];
  });
  const run = (command: Parameters<typeof act>[0]) => { setItems(false); act(command); };

  return (
    <div className="combat" data-testid="combat">
      <div className="combat-head row">
        <strong>Round {c.round}</strong>
        <span className="muted tiny">Next: {c.order.map((who) => (who === -1 ? 'Prabu' : names[who])).join(' → ') || '—'}</span>
      </div>
      {BANDS.map(([band, label]) => (
        <div key={band} className="combat-band">
          <span className="band-label muted">{label}</span>
          <div className="band-enemies">
            {c.enemies.map((e, i) => (e.hp > 0 && e.band === band ? (
              <button key={i} className={`enemy-card ${i === target ? 'selected' : ''}`} aria-pressed={i === target} onClick={() => setPicked(i)}>
                <span>{names[i]}</span>
                <span className="hp-bar" aria-hidden="true"><span style={{ width: `${(e.hp / content.enemies[e.id]!.hp) * 100}%` }} /></span>
                <span className="tiny muted">{e.hp}/{content.enemies[e.id]!.hp}</span>
              </button>
            ) : null))}
          </div>
        </div>
      ))}
      <div className="combat-prabu">
        <div className="row">
          <strong>Prabu</strong>
          <span>Health {Math.round(game.survival.health)}</span>
          <span className="muted">{game.inventory.weapon ? itemName(game.inventory.weapon) : 'Bare hands'}{w.ammo && ` · ${game.inventory.stacks.filter((s) => s.itemId === w.ammo).reduce((n, s) => n + s.count, 0)} ${itemName(w.ammo).toLowerCase()}s`}</span>
        </div>
        <StatsBlock game={game} />
      </div>
      {!c.result && (
        <div className="combat-actions">
          <button disabled={!myTurn || Boolean(blocked)} title={blocked ?? undefined} onClick={() => run({ type: 'combat.act', action: 'attack', target: target! })}>
            Attack{odds ? ` (${Math.round(odds.hit)}%)` : ''}
          </button>
          <button disabled={!myTurn || c.aimed} title={c.aimed ? 'Already aiming' : undefined} onClick={() => run({ type: 'combat.act', action: 'aim' })}>{c.aimed ? 'Aiming' : 'Aim'}</button>
          <button disabled={!myTurn || target === null || c.enemies[target]?.band === 'close'} title={target !== null && c.enemies[target]?.band === 'close' ? 'Already close' : undefined}
            onClick={() => run({ type: 'combat.act', action: 'close_in', target: target! })}>Close in</button>
          <button disabled={!myTurn || alive.every((i) => c.enemies[i]!.band === 'far')} onClick={() => run({ type: 'combat.act', action: 'step_back' })}>Step back</button>
          <button disabled={!myTurn || !usable.length} title={usable.length ? undefined : 'Nothing usable'} aria-expanded={items} onClick={() => setItems(!items)}>Use item</button>
          <button disabled={!myTurn} onClick={() => run({ type: 'combat.act', action: 'flee' })}>Flee ({Math.round(fleeChance(game, content))}%)</button>
        </div>
      )}
      {blocked && !c.result && <p className="warn-text tiny">{blocked === 'Out of reach' ? `Out of reach: ${game.inventory.weapon ? `the ${itemName(game.inventory.weapon).toLowerCase()}` : 'bare hands'} reach${game.inventory.weapon ? 'es' : ''} ${w.reach === 'close' ? 'Close only' : 'Close and Mid'}. Close in, or pick another enemy.` : blocked}</p>}
      {items && (
        <div className="combat-items">
          {usable.map(({ i, s, it }) => (
            <button key={i} className="small" onClick={() => run({ type: 'combat.act', action: 'use_item', index: i })}>{it.name}{s.count > 1 ? ` ×${s.count}` : ''}</button>
          ))}
        </div>
      )}
      <ul className="combat-log" aria-live="polite">
        {c.log.map((l, i) => <li key={i}>{logLine(l, names)}</li>)}
      </ul>
      {c.result && (
        <div className="event-overlay">
          <div className="event-card" role="dialog" aria-modal="true" aria-labelledby="combat-result">
            <h2 id="combat-result">{c.result.outcome === 'won' ? 'He won the fight' : 'He got away'}</h2>
            <ul className="event-effects">
              {c.result.found.map((f, i) => <li key={`f${i}`}>Found: {itemName(f.itemId).toLowerCase()}{f.count > 1 ? ` ×${f.count}` : ''}</li>)}
              {c.result.left.map((f, i) => <li key={`l${i}`}>Too heavy, left on the ground: {itemName(f.itemId).toLowerCase()}</li>)}
              <li>Health {Math.round(game.survival.health)}</li>
            </ul>
            <button className="panel-action" autoFocus onClick={closeCombat}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}
