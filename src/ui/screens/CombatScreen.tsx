import { useState } from 'react';
import type { Ability } from '../../content/schemas';
import { resolveAsset } from '../../assets/resolve';
import type { CombatLog, Combatant, GameState } from '../../engine/core/state';
import { abilityBlocked, odds, validTargets } from '../../engine/systems/combat/abilities';
import { actingNow, fleeChance } from '../../engine/systems/combat/combat';
import { abilitiesOf, damageRangeOf, hpOf, maxHpOf, statsOf } from '../../engine/systems/combat/fighters';
import { sideOf } from '../../engine/systems/combat/formation';
import { weaponProfile } from '../../engine/systems/combat/stats';
import { content, useGameStore } from '../../store/gameStore';
import { STAT_LABELS, StatsBlock } from '../components/StatsBlock';

const itemName = (id: string) => content.items[id]?.name ?? id;
const statusName = (kind: string) => content.combat.statuses[kind]?.name ?? kind;

/** Display names: "Wild dog A", "Wild dog B" when there are several of a kind. */
function namesOf(game: GameState): Record<string, string> {
  const all = game.combat!.combatants;
  const out: Record<string, string> = {};
  for (const c of all) {
    const base = c.side === 'enemy' ? content.enemies[c.defId]?.name ?? c.defId : content.characters[c.defId]?.name ?? c.defId;
    const same = all.filter((x) => x.side === c.side && x.defId === c.defId);
    out[c.uid] = same.length > 1 ? `${base} ${String.fromCharCode(65 + same.indexOf(c))}` : base;
  }
  return out;
}

function logLine(l: CombatLog, n: Record<string, string>): string {
  // A fighter no longer on the field is named by its type.
  const gone = l.defId ? content.enemies[l.defId]?.name ?? content.characters[l.defId]?.name : undefined;
  const who = (uid?: string) => (uid ? n[uid] ?? gone ?? 'Someone' : 'Someone');
  switch (l.kind) {
    case 'ability': return `${who(l.actor)} uses ${content.abilities[l.abilityId ?? '']?.name ?? 'an ability'}${l.target && l.target !== l.actor ? ` on ${who(l.target)}` : ''}.`;
    case 'hit': return `${who(l.actor)} hits ${who(l.target)} for ${l.amount}${l.crit ? ', a critical hit!' : '.'}`;
    case 'miss': return `${who(l.actor)} misses ${who(l.target)}.`;
    case 'heal': return `${who(l.target)} heals ${l.amount}.`;
    case 'status': return `${who(l.target)}: ${statusName(l.status ?? '')}${l.amount ? ` ${l.amount > 0 ? '+' : ''}${l.amount}` : ''}.`;
    case 'resisted': return `${who(l.target)} resists ${l.status === 'push' || l.status === 'pull' || l.status === 'shuffle' ? 'being moved' : statusName(l.status ?? '').toLowerCase()}.`;
    case 'dot': return `${who(l.target)} takes ${l.amount} from ${statusName(l.status ?? '').toLowerCase()}.`;
    case 'move': return `${who(l.target)} moves to rank ${l.amount}.`;
    case 'stunned': return `${who(l.target)} is stunned and loses the turn.`;
    case 'expired': return `${who(l.target)}: ${statusName(l.status ?? '').toLowerCase()} wears off.`;
    case 'deaths_door': return `${who(l.target)} is at Death's Door!`;
    case 'deathblow': return l.survived ? `${who(l.target)} survives a deathblow.` : `${who(l.target)} takes a deathblow.`;
    case 'killed': return `${who(l.target)} is dead.`;
    case 'corpse_cleared': return `The remains of ${who(l.target)} are cleared away.`;
    case 'pass': return `${who(l.actor)} waits.`;
    case 'item': return `${who(l.actor)} uses ${itemName(l.itemId ?? '').toLowerCase()}.`;
    case 'flee_failed': return `${who(l.actor)} tries to run but can't get away.`;
    default: return '';
  }
}

/** Short status badges: "Bleed 4", "Stunned", "DEF −10". */
function badges(c: Combatant): string[] {
  const out: string[] = [];
  const kinds = content.combat.statuses;
  const totals: Record<string, number> = {};
  for (const s of c.statuses) {
    const def = kinds[s.kind];
    if (def?.damagePerTurn) totals[s.kind] = (totals[s.kind] ?? 0) + (s.amount ?? 0);
    else if (def?.modifiesStat && s.stat) out.push(`${STAT_LABELS[s.stat] ?? s.stat} ${(s.amount ?? 0) > 0 ? '+' : '−'}${Math.abs(s.amount ?? 0)}`);
    else out.push(def?.name ?? s.kind);
  }
  return [...Object.entries(totals).map(([k, v]) => `${kinds[k]?.name ?? k} ${v}`), ...out];
}

/** What happened to a fighter since the player last acted, as floating numbers: "−8", "Crit −12", "Miss", "+10". */
function popups(log: CombatLog[], uid: string): string[] {
  return log.flatMap((l) => {
    if (l.target !== uid) return [];
    if (l.kind === 'hit') return [`${l.crit ? 'Crit ' : ''}−${l.amount}`];
    if (l.kind === 'dot') return [`−${l.amount}`];
    if (l.kind === 'miss') return ['Miss'];
    if (l.kind === 'heal') return [`+${l.amount}`];
    if (l.kind === 'resisted') return ['Resist'];
    return [];
  }).slice(-3);
}

type FigureProps = { game: GameState; c: Combatant; name: string; acting: boolean; targetable: boolean; picking: boolean; onPick: () => void };

/** One fighter in its rank: placeholder art (asset manifest), health, statuses, turn and target marks. */
function Figure({ game, c, name, acting, targetable, picking, onPick }: FigureProps) {
  const hp = Math.round(hpOf(game, c));
  const max = c.corpse ? content.enemies[c.defId]?.corpse?.hp ?? 1 : maxHpOf(game, c, content);
  // Player ranks run right to left towards the middle (rank 1 in column 4); enemy ranks left to right (rank 1 in column 6).
  const col = c.side === 'player' ? 5 - (c.rank + c.size - 1) : 5 + c.rank;
  const cls = ['figure', c.side === 'enemy' ? 'enemy' : 'ally', c.corpse ? 'corpse' : '', acting ? 'active' : '', targetable ? 'targetable' : '', c.deathsDoor ? 'deaths-door' : ''].join(' ');
  const label = `${c.corpse ? `Remains of ${name}` : name}, ${hp} of ${max}${c.deathsDoor ? ", at Death's Door" : ''}${acting ? ', acting now' : ''}`;
  const body = (
    <>
      <span className="popups" aria-hidden="true">{popups(game.combat!.log, c.uid).map((p, i) => <span key={i} className={p.startsWith('+') ? 'pop heal' : p === 'Miss' || p === 'Resist' ? 'pop miss' : 'pop'}>{p}</span>)}</span>
      <img className="figure-art" src={resolveAsset(`figure.${c.defId}`)} alt="" />
      <span className="figure-name">{c.corpse ? 'Remains' : name}</span>
      <span className="hp-bar" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, (hp / max) * 100))}%` }} /></span>
      <span className="tiny muted">{hp}/{max}</span>
      {c.deathsDoor && <span className="badge danger">Death's Door</span>}
      <span className="badges">{badges(c).map((b, i) => <span key={`${b}-${i}`} className="badge">{b}</span>)}</span>
    </>
  );
  const style = { gridColumn: `${col} / span ${c.size}` };
  return picking
    ? <button className={cls} style={style} aria-label={label} disabled={!targetable} onClick={onPick}>{body}</button>
    : <div className={cls} style={style} aria-label={label}>{body}</div>;
}

/** The fight (D-069): both formations in four ranks, the turn order, the acting character's abilities and the log. */
export function CombatScreen() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const closeCombat = useGameStore((s) => s.closeCombat);
  const [picked, setPicked] = useState<string | null>(null);
  const [items, setItems] = useState(false);
  const c = game.combat!;
  const names = namesOf(game);
  const me = actingNow(game);
  const myTurn = Boolean(me && me.side === 'player' && !c.result && !game.dead);
  const abilities = me && me.side === 'player' ? abilitiesOf(game, me, content) : [];
  const ability: Ability | undefined = abilities.find((a) => a.id === picked && myTurn && !abilityBlocked(game, me!, a, content));
  const targets = new Set(ability && me ? validTargets(game, me, ability).map((t) => t.uid) : []);
  const usable = game.inventory.stacks.flatMap((s, i) => {
    const it = content.items[s.itemId]!;
    return !it.recharges && (it.effects || it.curesInjury) ? [{ i, s, it }] : [];
  });
  const send = (command: Parameters<typeof act>[0]) => { setPicked(null); setItems(false); act(command); };
  const choose = (a: Ability) => {
    // Abilities on yourself or on everyone in their ranks need no target: they go at once.
    if (a.target.side === 'self' || a.target.mode === 'all') return send({ type: 'combat.act', action: 'ability', abilityId: a.id });
    setPicked(picked === a.id ? null : a.id);
  };
  const playerRanks = sideOf(c, 'player').reduce((n, x) => n + x.size, 0);
  const w = weaponProfile(game, content);

  return (
    <div className="combat" data-testid="combat">
      <div className="combat-head">
        <strong>Round {c.round}</strong>
        <ol className="turn-queue" aria-label="Turn order">
          {c.queue.map((uid, i) => <li key={`${uid}-${i}`} className={i === 0 ? 'now' : ''}>{names[uid] ?? uid}</li>)}
        </ol>
      </div>

      <div className="battlefield" role="group" aria-label="Battlefield">
        {[4, 3, 2, 1].map((r) => <span key={`p${r}`} className="rank-slot" style={{ gridColumn: 5 - r }}>Rank {r}</span>)}
        {[1, 2, 3, 4].map((r) => <span key={`e${r}`} className="rank-slot enemy" style={{ gridColumn: 5 + r }}>Rank {r}</span>)}
        <span className="front-line" aria-hidden="true" />
        {c.combatants.map((f) => (
          <Figure key={f.uid} game={game} c={f} name={names[f.uid]!} acting={me?.uid === f.uid} picking={Boolean(ability)}
            targetable={targets.has(f.uid)} onPick={() => send({ type: 'combat.act', action: 'ability', abilityId: ability!.id, target: f.uid })} />
        ))}
      </div>

      {me && me.side === 'player' && (
        <div className="combat-prabu">
          <div className="row">
            <strong>{names[me.uid]} · Rank {me.rank}</strong>
            <span>Health {Math.round(hpOf(game, me))}{me.deathsDoor ? " · Death's Door" : ''}</span>
            <span className="muted">{me.protagonist && game.inventory.weapon ? itemName(game.inventory.weapon) : 'Bare hands'}
              {w.ammo && ` · ${game.inventory.stacks.filter((s) => s.itemId === w.ammo).reduce((n, s) => n + s.count, 0)} ${itemName(w.ammo).toLowerCase()}s`}</span>
          </div>
          <StatsBlock stats={statsOf(game, me, content)} damage={damageRangeOf(game, me, content)} ammo={w.ammo} />
        </div>
      )}

      {!c.result && me && (
        <>
          <div className="ability-bar" role="toolbar" aria-label="Abilities">
            {abilities.map((a) => {
              const why = myTurn ? abilityBlocked(game, me, a, content) : 'Not his turn';
              const shown = a.target.mode === 'single' && a.target.side === 'enemy' && !why ? validTargets(game, me, a).find((t) => !t.corpse) : undefined;
              const o = shown ? odds(game, me, a, shown, content) : null;
              const reach = a.target.side === 'self' ? 'himself' : `${a.target.side === 'ally' ? 'ally ' : ''}rank ${a.target.ranks.join(', ')}${a.target.mode === 'all' ? ' (all)' : ''}`;
              return (
                <div key={a.id} className="ability">
                  <button aria-pressed={picked === a.id} disabled={Boolean(why)} title={`${a.description}${why ? ` (${why})` : ''}`} onClick={() => choose(a)}>
                    {a.name}{o ? ` ${Math.round(o.hit)}%` : ''}
                  </button>
                  <span className="tiny muted">{why ?? `From rank ${a.usableFrom.join(', ')} → ${reach}`}</span>
                </div>
              );
            })}
          </div>
          {ability && <p className="muted tiny">Pick a highlighted target for {ability.name}.</p>}
          <div className="combat-actions">
            <button disabled={!myTurn || me.rank === 1} title={me.rank === 1 ? 'Already in front' : undefined} onClick={() => send({ type: 'combat.act', action: 'move', steps: 1 })}>Move forward</button>
            <button disabled={!myTurn || me.rank + me.size > playerRanks} title="Swap places with the one behind" onClick={() => send({ type: 'combat.act', action: 'move', steps: -1 })}>Move back</button>
            <button disabled={!myTurn} onClick={() => send({ type: 'combat.act', action: 'pass' })}>Pass</button>
            <button disabled={!myTurn || !usable.length} title={usable.length ? undefined : 'Nothing usable'} aria-expanded={items} onClick={() => setItems(!items)}>Use item</button>
            <button disabled={!myTurn} onClick={() => send({ type: 'combat.act', action: 'flee' })}>Flee ({Math.round(fleeChance(game, content))}%)</button>
          </div>
          {items && (
            <div className="combat-items">
              {usable.map(({ i, s, it }) => (
                <button key={i} className="small" onClick={() => send({ type: 'combat.act', action: 'use_item', index: i })}>{it.name}{s.count > 1 ? ` ×${s.count}` : ''}</button>
              ))}
            </div>
          )}
        </>
      )}

      <ul className="combat-log" aria-live="polite">
        {c.log.map((l, i) => <li key={i} className={l.kind}>{logLine(l, names)}</li>)}
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
