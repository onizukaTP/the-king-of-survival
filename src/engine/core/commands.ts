import type { Content } from '../../content/loader';
import { advanceTravel, startTravel, stopTravel, type TravelTarget } from '../systems/travel/travel';
import type { GameState } from './state';

export type Command =
  | { type: 'travel.start'; target: TravelTarget }
  | { type: 'travel.advance' }
  | { type: 'travel.stop' };

export type GameEvent =
  | { type: 'travel_started'; legs: number }
  | { type: 'leg_completed'; leg: number; of: number }
  | { type: 'site_discovered'; siteId: string }
  | { type: 'arrived'; siteId: string | null }
  | { type: 'travel_stopped' };

export type CommandError = {
  code:
    | 'unknown_command'
    | 'internal_error'
    | 'travel_in_progress'
    | 'not_travelling'
    | 'unknown_site'
    | 'outside_world'
    | 'already_there'
    | 'no_route';
  message: string;
};

export type CommandResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: CommandError };

function run(state: GameState, command: Command, content: Content): CommandResult {
  switch (command.type) {
    case 'travel.start':
      return startTravel(state, command.target, content);
    case 'travel.advance':
      return advanceTravel(state, content);
    case 'travel.stop':
      return stopTravel(state);
    default:
      return { ok: false, error: { code: 'unknown_command', message: `Unknown command: ${(command as { type: string }).type}` } };
  }
}

/** The only way game state changes. Never mutates `state`, never throws. */
export function applyCommand(state: GameState, command: Command, content: Content): CommandResult {
  try {
    // Handlers get a copy, so a handler that fails halfway can't leave the caller's state half-changed.
    return run(structuredClone(state), command, content);
  } catch (err) {
    return { ok: false, error: { code: 'internal_error', message: String(err) } };
  }
}
