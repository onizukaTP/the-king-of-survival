import type { CharmSlot } from '../../content/schemas';
import { maxHealth, type Stack } from '../../engine/core/state';
import { carryLimits } from '../../engine/systems/charms/charms';
import { playerStats, weaponProfile } from '../../engine/systems/combat/stats';
import { carriedKg, type ItemSource } from '../../engine/systems/inventory/inventory';
import { nextLevel } from '../../engine/systems/progression/progression';
import { ridden } from '../../engine/systems/vehicles/ridden';
import { content, useGameStore } from '../../store/gameStore';
import { ItemName } from '../components/ItemName';
import { StatsBlock } from '../components/StatsBlock';
import { formatDuration, formatKg } from '../format';

const SLOT_LABELS: Record<CharmSlot, string> = { necklace: 'Necklace', earrings: 'Earrings', waist: 'Waist cord', ring: 'Ring', bangle: 'Bangle' };

/** The Player panel (owner, 2026-11-26): who he is, what he has equipped and worn, and every stat. */
export function PlayerPanel() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const openPanel = useGameStore((s) => s.openPanel);
  const character = content.characters[game.player.characterId]!;
  const { weapon, charms } = game.inventory;
  const s = game.survival;
  const next = nextLevel(game, content);
  const carry = carryLimits(game, content);
  const profile = weaponProfile(game, content);
  // Each charm slot in charms.json order, filled with what he wears there (D-086).
  const slots = (Object.entries(content.charms.slots) as [CharmSlot, number][]).flatMap(([slot, n]) => {
    const worn = charms.filter((id) => content.items[id]?.charm?.slot === slot);
    return Array.from({ length: n }, (_, i) => ({ slot, itemId: worn[i] }));
  });
  // Weapons and charms he could put on, from the pack and the cargo of the vehicle he rides.
  const equippable = (stacks: Stack[], from: ItemSource) => stacks.flatMap((st, index) => {
    const item = content.items[st.itemId]!;
    return item.weapon || item.charm ? [{ st, index, from, item }] : [];
  });
  const vehicle = ridden(game);
  const options = [...equippable(game.inventory.stacks, 'pack'), ...(vehicle ? equippable(vehicle.cargo, 'cargo') : [])];

  return (
    <div className="panel-body" data-testid="player-panel">
      <div className="panel-head">
        <h2>{character.name}</h2>
        <button className="icon" aria-label="Close" onClick={() => openPanel(null)}>×</button>
      </div>
      <p className="muted" data-testid="player-level">
        Age {character.age} · Level {game.progression.level} · {next ? `${game.progression.xp} / ${next.xp} XP` : `${game.progression.xp} XP (highest level)`}
      </p>

      <h3>Condition</h3>
      <div className="stats-block player-condition">
        <dl>
          <div><dt>Health</dt><dd>{Math.round(s.health)} / {maxHealth(s, content)}</dd></div>
          <div><dt>Food</dt><dd>{Math.round(s.food)}</dd></div>
          <div><dt>Water</dt><dd>{Math.round(s.water)}</dd></div>
          <div><dt>Rest</dt><dd>{Math.round(s.rest)}</dd></div>
          <div><dt>Radiation</dt><dd>{s.radiation}</dd></div>
        </dl>
      </div>
      <div className="row tiny"><span className="muted">Carrying</span><span>{formatKg(carriedKg(game.inventory, content))} of {carry.freeKg} kg free, {carry.maxKg} kg at most</span></div>
      {(s.injured || s.illUntil !== null || s.conditions.length > 0) && (
        <ul className="journal-list">
          {s.injured && <li className="warn-text">Injured</li>}
          {s.illUntil !== null && <li className="warn-text">Ill ({formatDuration(s.illUntil - game.clockMinutes)} left)</li>}
          {s.conditions.map((c) => {
            const def = content.conditions[c.id];
            return def ? <li key={c.id} className={def.good ? '' : 'warn-text'}>{def.name}: {def.description}{c.until !== null ? ` (${formatDuration(c.until - game.clockMinutes)} left)` : ''}</li> : null;
          })}
        </ul>
      )}

      <h3>Equipped</h3>
      <ul className="items charm-slots" data-testid="equipped">
        <li className="item-line">
          <span className="item-row static"><span className="muted">Weapon</span><span>{weapon ? <ItemName id={weapon} /> : <span className="muted">Bare hands</span>}</span></span>
          {weapon && <button className="small row-use" onClick={() => act({ type: 'item.unequip' })}>Unequip</button>}
        </li>
        {slots.map(({ slot, itemId }, i) => (
          <li key={`${slot}${i}`} className="item-line">
            <span className="item-row static">
              <span className="muted">{SLOT_LABELS[slot]}</span>
              <span>{itemId ? <ItemName id={itemId} /> : <span className="muted">—</span>}</span>
            </span>
            {itemId && <button className="small row-use" aria-label={`Take off ${content.items[itemId]!.name}`} onClick={() => act({ type: 'charm.remove', itemId })}>Take off</button>}
          </li>
        ))}
      </ul>

      <h3>Stats</h3>
      <StatsBlock stats={playerStats(game, content)} damage={profile.damage} ammo={profile.ammo} />

      {options.length > 0 && (
        <>
          <h3>To equip</h3>
          <ul className="items" data-testid="equippable">
            {options.map(({ st, index, from, item }) => (
              <li key={`${from}${index}`} className="item-line">
                <span className="item-row static">
                  <span><ItemName id={st.itemId} count={st.count} /></span>
                  <span className="muted">{from === 'cargo' ? 'in the vehicle' : 'in the pack'}</span>
                </span>
                <button className="small row-use" aria-label={`${item.weapon ? 'Equip' : 'Wear'} ${item.name}`}
                  onClick={() => act(item.weapon ? { type: 'item.equip', index, from } : { type: 'charm.wear', index, from })}>
                  {item.weapon ? 'Equip' : 'Wear'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
