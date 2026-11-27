import type { Content } from '../../../content/loader';
import type { Stats } from '../../../content/schemas';
import type { CommandResult, GameEvent } from '../../core/commands';
import type { GameState, JournalNote } from '../../core/state';

/** Everything the levels up to `level` add to Prabu's stats (D-076): fixed gains, no choice. */
export function levelGains(level: number, content: Content): Partial<Stats> {
  const total: Partial<Stats> = {};
  for (const l of content.progression.levels) {
    if (l.level > level) break;
    for (const key of Object.keys(l.gains) as (keyof Stats)[]) total[key] = (total[key] ?? 0) + (l.gains[key] ?? 0);
  }
  return total;
}

/** The next level and the XP it needs, or undefined at the top level. */
export function nextLevel(state: GameState, content: Content) {
  return content.progression.levels.find((l) => l.level === state.progression.level + 1);
}

export function addNote(state: GameState, note: Omit<JournalNote, 'at'>, content: Content) {
  const notes = state.journal.notes;
  notes.push({ at: state.clockMinutes, ...note });
  notes.splice(0, Math.max(0, notes.length - content.progression.notesKept));
}

function gainXp(state: GameState, base: number, content: Content, out: GameEvent[]) {
  // The Test panel's multiplier (1 in a normal run).
  const amount = Math.round(base * state.progression.xpMultiplier);
  if (amount <= 0) return;
  state.progression.xp += amount;
  out.push({ type: 'xp_gained', amount });
  for (let next = nextLevel(state, content); next && state.progression.xp >= next.xp; next = nextLevel(state, content)) {
    state.progression.level = next.level;
    out.push({ type: 'level_up', level: next.level });
    addNote(state, { kind: 'level', level: next.level }, content);
  }
}

/**
 * XP and journal notes from what a command just did (D-070, D-076). Called once per accepted command
 * with its events; returns the events it adds. A dead man earns nothing.
 */
export function progress(state: GameState, events: GameEvent[], content: Content): GameEvent[] {
  if (state.dead) return [];
  const xp = content.progression.xp;
  const out: GameEvent[] = [];
  let amount = 0;
  for (const e of events) {
    if (e.type === 'site_visited') {
      amount += xp.firstVisit;
      addNote(state, { kind: 'visited', siteId: e.siteId }, content);
    }
    if (e.type === 'searched' && e.finds.length) amount += xp.searchWithFinds;
    if (e.type === 'hunted' && e.success) amount += xp.huntSuccess;
    if (e.type === 'crafted' && !state.progression.crafted.includes(e.recipeId)) {
      state.progression.crafted.push(e.recipeId);
      amount += xp.firstCraft;
    }
    if (e.type === 'event_resolved') {
      const def = content.events.events.find((d) => d.id === e.eventId);
      amount += def?.choices.find((c) => c.id === e.choiceId)?.outcomes[e.outcome]?.xp ?? 0;
    }
    if (e.type === 'combat_ended' && e.outcome === 'won' && state.combat) {
      const defeated = state.combat.defeated;
      amount += defeated.reduce((sum, id) => sum + (content.enemies[id]?.xp ?? 0), 0);
      addNote(state, { kind: 'won', enemies: [...defeated] }, content);
    }
  }
  gainXp(state, amount, content, out);
  return out;
}

/** The intro has been read or skipped (D-076); it doesn't show again in this run. */
export function finishIntro(state: GameState): CommandResult {
  state.introSeen = true;
  return { ok: true, state, events: [{ type: 'intro_done' }] };
}
