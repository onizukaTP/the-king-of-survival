import { recipeStatus } from '../../engine/systems/crafting/crafting';
import { content, useGameStore } from '../../store/gameStore';
import { formatDuration } from '../format';

/** The Craft panel (M5, P-017): every recipe with what he has against what it needs; ready ones first. */
export function CraftPanel() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const openPanel = useGameStore((s) => s.openPanel);
  const inv = game.inventory;
  const have = (itemId: string) => inv.stacks.reduce((n, s) => n + (s.itemId === itemId ? s.count : 0), 0);
  const name = (itemId: string) => content.items[itemId]!.name;
  const recipes = Object.values(content.recipes)
    .map((r) => ({ r, missing: recipeStatus(game, r, content).missing }))
    // Ready to make first; otherwise the order in recipes.json.
    .sort((a, b) => Number(Boolean(a.missing)) - Number(Boolean(b.missing)));

  return (
    <div className="panel-body" data-testid="craft-panel">
      <div className="panel-head">
        <h2>Craft</h2>
        <button className="icon" aria-label="Close" onClick={() => openPanel(null)}>×</button>
      </div>
      <p className="muted">Cooking, boiling and sterilizing are done at a fire, in the Here panel.</p>
      {recipes.map(({ r, missing }) => (
        <div key={r.id} className="item-card recipe-card" data-testid="recipe-card">
          <div className="row">
            <strong>{r.name}</strong>
            <span className="muted">{formatDuration(r.minutes)}</span>
          </div>
          <span className="muted">
            {r.inputs.map((i) => `${name(i.itemId)} ${Math.min(have(i.itemId), i.count)}/${i.count}`).join(' · ')}
          </span>
          {r.tool && <span className="muted">Tool: {name(r.tool).toLowerCase()} {missing?.includes(name(r.tool).toLowerCase()) ? '✗' : '✓'}</span>}
          <div className="row">
            <span>→ {name(r.output.itemId)}{r.output.count > 1 && ` ×${r.output.count}`}</span>
            <button className="small" disabled={Boolean(missing)} onClick={() => act({ type: 'craft', recipeId: r.id })}>Craft</button>
          </div>
          {missing && <span className="warn-text tiny">{missing}</span>}
        </div>
      ))}
    </div>
  );
}
