import { useState } from 'react';
import type { ItemCategory } from '../../content/schemas';
import type { Stack } from '../../engine/core/state';
import { carriedKg, loadMultiplier } from '../../engine/systems/inventory/inventory';
import { content, useGameStore, type PackSort } from '../../store/gameStore';
import { formatDuration, formatKg } from '../format';
import { StatsBlock } from '../components/StatsBlock';
import { playerStats, weaponProfile } from '../../engine/systems/combat/stats';

const GROUPS: [ItemCategory, string][] = [
  ['food', 'Food'], ['water', 'Water'], ['medical', 'Medical'], ['weapon', 'Weapons'], ['tool', 'Tools'], ['material', 'Materials'],
];

function chargeText(stack: Stack) {
  const charge = content.items[stack.itemId]!.charge;
  if (!charge || stack.charge === undefined) return null;
  return charge.unit === 'percent' ? `${stack.charge}%` : `${stack.charge}/${charge.max}`;
}

function effectText(itemId: string) {
  const item = content.items[itemId]!;
  const parts: string[] = [];
  const fx = item.effects ?? {};
  if (fx.food) parts.push(`Food +${fx.food}`);
  if (fx.water) parts.push(`Water +${fx.water}`);
  if (fx.health) parts.push(`Health +${fx.health}`);
  if (item.curesInjury) parts.push('Treats injuries');
  if (item.illnessChance) parts.push('May make you ill');
  if (item.recharges) {
    const target = content.items[item.recharges.itemId]!.name.toLowerCase();
    parts.push(item.recharges.consumed ? `Refills the ${target}` : `Charges the ${target} +${item.recharges.amount}% (${item.recharges.minutes} min)`);
  }
  if (item.weapon) parts.push('Weapon');
  const fallback = { food: 'Cooking ingredient', weapon: 'Ammunition', tool: 'Tool' } as Partial<Record<ItemCategory, string>>;
  if (!parts.length) parts.push(fallback[item.category] ?? 'Crafting material');
  return parts.join(' · ');
}

const verb = { food: 'Eat', water: 'Drink' } as Partial<Record<ItemCategory, string>>;
const verbFor = (itemId: string) => verb[content.items[itemId]!.category] ?? 'Use';
/** Items with something to do on their own: eat, drink, apply or recharge. */
const usable = (itemId: string) => {
  const item = content.items[itemId]!;
  return Boolean(item.effects || item.curesInjury || item.recharges);
};

/** Why the item can't be used now (a missing can opener, D-056), or null. */
function blocker(itemId: string, stacks: Stack[]) {
  const needs = content.items[itemId]!.needsItem;
  return needs && !stacks.some((s) => s.itemId === needs) ? `Needs a ${content.items[needs]!.name.toLowerCase()}` : null;
}

type Row = readonly [Stack, number];
const sorters: Record<Exclude<PackSort, 'type'>, (a: Row, b: Row) => number> = {
  name: ([a], [b]) => content.items[a.itemId]!.name.localeCompare(content.items[b.itemId]!.name),
  // Heaviest first: what to drop when overloaded.
  weight: ([a], [b]) => content.items[b.itemId]!.weightKg * b.count - content.items[a.itemId]!.weightKg * a.count,
};

/** The Pack panel (approved layout): weight against the 25/50 kg limits, weapon slot, grouped items, actions. */
export function PackPanel() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const openPanel = useGameStore((s) => s.openPanel);
  const [selected, setSelected] = useState<number | null>(null);
  const sort = useGameStore((s) => s.packSort);
  const setSort = useGameStore((s) => s.setPackSort);
  const { stacks, weapon } = game.inventory;
  const { freeKg, maxKg } = content.survival.carry;
  const kg = carriedKg(game.inventory, content);
  const mult = loadMultiplier(kg, content.survival.carry);
  const stack = selected !== null ? stacks[selected] : undefined;
  const item = stack && content.items[stack.itemId];

  // After an action the stack may move or vanish; keep pointing at the same item if it's still there.
  const run = (command: Parameters<typeof act>[0]) => {
    const itemId = stack?.itemId;
    if (!act(command)) return;
    const next = useGameStore.getState().game!.inventory.stacks.findIndex((s) => s.itemId === itemId);
    setSelected(next >= 0 ? next : null);
  };

  const indexed = stacks.map((s, i) => [s, i] as const);
  const row = ([s, i]: readonly [Stack, number]) => {
    const def = content.items[s.itemId]!;
    const extra = chargeText(s) ?? (s.spoilsAt !== undefined ? formatDuration(Math.max(0, s.spoilsAt - game.clockMinutes)) : null);
    const use = () => act({ type: 'item.use', index: i }) && setSelected(null);
    const why = blocker(def.id, stacks);
    return (
      <li key={i} className="item-line">
        <button
          className={`item-row ${selected === i ? 'selected' : ''}`}
          aria-pressed={selected === i}
          onClick={() => setSelected(selected === i ? null : i)}
          // Double-click uses a consumable straight away.
          onDoubleClick={() => usable(def.id) && !why && use()}
        >
          <span>{def.name}{s.count > 1 && ` ×${s.count}`}{extra && <span className="muted"> · {extra}</span>}</span>
          <span className="muted">{formatKg(def.weightKg * s.count)}</span>
        </button>
        {usable(def.id) && (
          <button className="small row-use" aria-label={`${verbFor(def.id)} ${def.name}`} disabled={Boolean(why)} title={why ?? undefined} onClick={use}>
            {verbFor(def.id)}
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="panel-body">
      <div className="panel-head">
        <h2>Pack</h2>
        <button className="icon" aria-label="Close" onClick={() => openPanel(null)}>×</button>
      </div>
      <div className="row">
        <span className="muted">{formatKg(kg)} of {freeKg} kg</span>
        {mult > 1 && <span className="warn-text">Heavy: drains ×{mult.toFixed(1)} on the road</span>}
      </div>
      <div className={`weight-bar ${mult > 1 ? 'heavy' : ''}`} aria-hidden="true">
        <div style={{ width: `${Math.min(100, (kg / maxKg) * 100)}%` }} />
        <span className="weight-mark" style={{ left: `${(freeKg / maxKg) * 100}%` }} />
      </div>
      <div className="row tiny muted"><span>0</span><span>{freeKg} kg</span><span>{maxKg} kg</span></div>

      <h3>Weapon</h3>
      {weapon ? (
        <div className="slot">
          <span>{content.items[weapon]!.name}</span>
          <span className="muted">{formatKg(content.items[weapon]!.weightKg)}</span>
          <button className="small" onClick={() => run({ type: 'item.unequip' })}>Unequip</button>
        </div>
      ) : <p className="muted">Nothing equipped.</p>}
      <h3>Stats</h3>
      <StatsBlock stats={playerStats(game, content)} damage={weaponProfile(game, content).damage} ammo={weaponProfile(game, content).ammo} />

      {stacks.length > 0 && (
        <label className="pack-sort">
          <span className="muted">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as PackSort)}>
            <option value="type">By kind</option>
            <option value="name">By name</option>
            <option value="weight">By weight</option>
          </select>
        </label>
      )}
      {sort === 'type'
        ? GROUPS.map(([category, label]) => {
            const rows = indexed.filter(([s]) => content.items[s.itemId]!.category === category);
            if (!rows.length) return null;
            return (
              <section key={category}>
                <h3>{label}</h3>
                <ul className="items">{rows.map(row)}</ul>
              </section>
            );
          })
        : <ul className="items">{[...indexed].sort(sorters[sort]).map(row)}</ul>}
      {!stacks.length && <p className="muted">The pack is empty.</p>}

      {stack && item && selected !== null && (
        <div className="item-card" data-testid="item-card">
          <strong>{item.name}</strong>
          <p className="muted">{effectText(item.id)} · {formatKg(item.weightKg)} each</p>
          {blocker(item.id, stacks) && <p className="warn-text">{blocker(item.id, stacks)}.</p>}
          {stack.spoilsAt !== undefined && <p className="muted">Spoils in {formatDuration(Math.max(0, stack.spoilsAt - game.clockMinutes))}</p>}
          <div className="card-actions">
            {usable(item.id) && (
              <button className="small" disabled={Boolean(blocker(item.id, stacks))} onClick={() => run({ type: 'item.use', index: selected })}>{verbFor(item.id)}</button>
            )}
            {item.weapon && <button className="small" onClick={() => run({ type: 'item.equip', index: selected })}>Equip</button>}
            <button className="small" onClick={() => run({ type: 'item.drop', index: selected, count: 1 })}>Drop 1</button>
            {stack.count > 1 && <button className="small" onClick={() => run({ type: 'item.drop', index: selected, count: stack.count })}>Drop all</button>}
          </div>
        </div>
      )}
    </div>
  );
}
