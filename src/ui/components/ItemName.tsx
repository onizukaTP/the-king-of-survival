import type { ItemCategory } from '../../content/schemas';
import { content } from '../../store/gameStore';
import { formatDuration, formatGains, formatKg } from '../format';

const SLOT_NAMES = { necklace: 'necklace', earrings: 'earrings', waist: 'waist cord', ring: 'ring', bangle: 'bangle' } as const;

/** What an item does, from its data: "Food +20 · May make you ill". */
export function effectText(itemId: string) {
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
  const c = item.charm;
  if (c) {
    const pct = (m: number) => `${Math.round((1 - m) * 100)}%`;
    if (c.stats) parts.push(formatGains(c.stats));
    if (c.threatMultiplier) parts.push(`Threats ${pct(c.threatMultiplier)} less likely`);
    if (c.darkRiskMultiplier) parts.push(`In the dark, injury and ambush ${pct(c.darkRiskMultiplier)} less likely`);
    if (c.restDrainMultiplier) parts.push(`Rest drains ${pct(c.restDrainMultiplier)} slower`);
    if (c.illnessMultiplier) parts.push(`Unsafe water's illness chance ${pct(c.illnessMultiplier)} lower`);
    if (c.searchTimeMultiplier) parts.push(`Searches ${pct(c.searchTimeMultiplier)} faster`);
    if (c.freeCarryKg) parts.push(`Carry ${c.freeCarryKg} kg more without penalty`);
    for (const [id, m] of Object.entries(c.conditionTime ?? {})) parts.push(`${content.conditions[id]?.name ?? id} lasts ${pct(m)} less`);
  }
  const fuelFor = Object.values(content.vehicles.byId).find((v) => v.fuel?.itemId === itemId);
  if (fuelFor?.fuel) parts.push(`Fuel for the ${fuelFor.name.toLowerCase()} (+${fuelFor.fuel.litresPerItem} L)`);
  const fallback = { food: 'Cooking ingredient', weapon: 'Ammunition', tool: 'Tool' } as Partial<Record<ItemCategory, string>>;
  if (!parts.length) parts.push(fallback[item.category] ?? 'Crafting material');
  return parts.join(' · ');
}

/** The tooltip for an item, built only from its data (no invented descriptions). */
export function itemTip(itemId: string): string {
  const item = content.items[itemId];
  if (!item) return itemId;
  const lines = [item.name, effectText(itemId)];
  const w = item.combat;
  if (w) {
    lines.push([`Damage ${w.damage[0]}–${w.damage[1]}`, w.bonus && formatGains(w.bonus), w.ammo && `Uses ${content.items[w.ammo]?.name.toLowerCase()}s`].filter(Boolean).join(' · '));
    lines.push(`Abilities: ${w.abilities.map((a) => content.abilities[a]?.name ?? a).join(', ')}`);
  }
  if (item.charge) lines.push(item.charge.unit === 'percent' ? 'Runs down with use' : `Up to ${item.charge.max} uses`);
  if (item.needsItem) lines.push(`Needs a ${content.items[item.needsItem]?.name.toLowerCase()}`);
  if (item.spoilsAfterMinutes) lines.push(`Spoils after ${formatDuration(item.spoilsAfterMinutes)}`);
  if (item.charm) lines.push(`Charm · ${SLOT_NAMES[item.charm.slot]} · ${item.charm.rarity.replace('_', ' ')}`);
  lines.push(`${formatKg(item.weightKg)} each`);
  return lines.join('\n');
}

/** An item's name with its tooltip. `lower` for names inside a sentence. */
export function ItemName({ id, count = 1, lower = false }: { id: string; count?: number; lower?: boolean }) {
  const name = content.items[id]?.name ?? id;
  return <span className="item-name" title={itemTip(id)}>{lower ? name.toLowerCase() : name}{count > 1 && ` ×${count}`}</span>;
}
