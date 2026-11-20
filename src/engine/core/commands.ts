import type { GameState } from './state';

// shortcut: commands are untyped until the first gameplay commands land (M3); then this becomes a discriminated union.
export interface Command {
  type: string;
}

export interface GameEvent {
  type: string;
}

export type CommandError = { code: 'unknown_command' | 'internal_error'; message: string };

export type CommandResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: CommandError };

type Handler = (state: GameState, command: Command) => CommandResult;

const handlers: Record<string, Handler | undefined> = {};

/** The only way game state changes. Never mutates `state`, never throws. */
export function applyCommand(state: GameState, command: Command): CommandResult {
  const handler = handlers[command.type];
  if (!handler) return { ok: false, error: { code: 'unknown_command', message: `Unknown command: ${command.type}` } };
  try {
    // Handlers get a copy, so a handler that fails halfway can't leave the caller's state half-changed.
    return handler(structuredClone(state), command);
  } catch (err) {
    return { ok: false, error: { code: 'internal_error', message: String(err) } };
  }
}
