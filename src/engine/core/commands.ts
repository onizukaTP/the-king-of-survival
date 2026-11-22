import type { Content } from '../../content/loader';
import { dropItem, equipItem, unequipItem, applyItem } from '../systems/inventory/inventory';
import { drinkHere, fillBottles, hunt, search, takeFromGround, type Find } from '../systems/scavenging/scavenging';
import { rest } from '../systems/survival/survival';
import { cook, feedFire, makeFire } from '../systems/fire/fire';
import { enterTown, leaveTown, walkTo } from '../systems/town/town';
import { advanceTravel, startTravel, stopTravel, type TravelTarget } from '../systems/travel/travel';
import type { GameState, Meter } from './state';

export type Command =
  | { type: 'travel.start'; target: TravelTarget }
  | { type: 'travel.advance' }
  | { type: 'travel.stop' }
  | { type: 'rest'; minutes: number | 'until_rested' }
  // `index` points into inventory.stacks.
  | { type: 'item.use'; index: number }
  | { type: 'item.drop'; index: number; count: number }
  | { type: 'item.equip'; index: number }
  | { type: 'item.unequip' }
  | { type: 'scavenge.search'; torch: boolean }
  | { type: 'scavenge.hunt' }
  | { type: 'water.fill' }
  | { type: 'water.drink' }
  // `indexes` point into state.ground.
  | { type: 'ground.take'; indexes: number[] }
  | { type: 'town.enter' }
  | { type: 'town.leave' }
  // `spotId`: 'edge', a building or a water point of the town he's in.
  | { type: 'town.walk'; spotId: string }
  // Fire and cooking (D-056): `method` and `recipeId` come from fire.json.
  | { type: 'fire.make'; method: string }
  | { type: 'fire.feed' }
  | { type: 'fire.cook'; recipeId: string };

export type DeathCause = 'hunger' | 'thirst' | 'hunger_and_thirst' | 'radiation';

export type GameEvent =
  | { type: 'travel_started'; legs: number }
  | { type: 'leg_completed'; leg: number; of: number }
  | { type: 'site_discovered'; siteId: string }
  | { type: 'arrived'; siteId: string | null }
  // `meter`: the trip stopped by itself because a meter fell to the warning level or to 0 (D-035).
  | { type: 'travel_stopped'; reason: 'player' | 'meter' }
  | { type: 'rested'; minutes: number }
  | { type: 'meter_low'; meter: Meter; empty: boolean }
  | { type: 'fell_ill' }
  | { type: 'recovered' }
  | { type: 'injury_cured' }
  | { type: 'item_used'; itemId: string }
  | { type: 'item_spoiled'; itemId: string; count: number }
  | { type: 'died'; cause: DeathCause }
  | { type: 'searched'; finds: Find[]; torch: boolean }
  | { type: 'hunted'; finds: Find[] }
  | { type: 'bottles_filled'; count: number; clean: boolean }
  | { type: 'drank'; clean: boolean }
  | { type: 'items_taken'; count: number }
  | { type: 'irradiated'; amount: number }
  | { type: 'town_entered'; siteId: string }
  | { type: 'town_left' }
  | { type: 'walked'; spotId: string }
  | { type: 'fire_lit'; method: string }
  | { type: 'fire_fed' }
  | { type: 'cooked'; recipeId: string; count: number };

export type CommandError = {
  code:
    | 'unknown_command'
    | 'internal_error'
    | 'travel_in_progress'
    | 'not_travelling'
    | 'unknown_site'
    | 'outside_world'
    | 'already_there'
    | 'no_route'
    | 'dead'
    | 'bad_item'
    | 'cannot_use'
    | 'injured'
    | 'nothing_to_recharge'
    | 'not_a_weapon'
    | 'no_weapon'
    | 'bad_duration'
    | 'already_rested'
    | 'too_heavy'
    | 'not_at_site'
    | 'nothing_to_search'
    | 'no_torch_charge'
    | 'cannot_hunt_here'
    | 'no_water'
    | 'no_empty_bottles'
    | 'in_town'
    | 'not_in_town'
    | 'not_at_edge'
    | 'no_town_here'
    | 'unknown_spot'
    | 'needs_item'
    | 'no_firewood'
    | 'no_fire'
    | 'fire_burning'
    | 'fire_too_low'
    | 'unknown_recipe'
    | 'missing_item';
  message: string;
};

export type CommandResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: CommandError };

function run(state: GameState, command: Command, content: Content): CommandResult {
  if (state.dead) return { ok: false, error: { code: 'dead', message: 'Prabu is dead. This run is over.' } };
  switch (command.type) {
    case 'travel.start':
      return startTravel(state, command.target, content);
    case 'travel.advance':
      return advanceTravel(state, content);
    case 'travel.stop':
      return stopTravel(state);
    case 'rest':
      return rest(state, command.minutes, content);
    case 'item.use':
      return applyItem(state, command.index, content);
    case 'item.drop':
      return dropItem(state, command.index, command.count, content);
    case 'item.equip':
      return equipItem(state, command.index, content);
    case 'item.unequip':
      return unequipItem(state);
    case 'scavenge.search':
      return search(state, command.torch, content);
    case 'scavenge.hunt':
      return hunt(state, content);
    case 'water.fill':
      return fillBottles(state, content);
    case 'water.drink':
      return drinkHere(state, content);
    case 'ground.take':
      return takeFromGround(state, command.indexes, content);
    case 'town.enter':
      return enterTown(state, content);
    case 'town.leave':
      return leaveTown(state, content);
    case 'town.walk':
      return walkTo(state, command.spotId, content);
    case 'fire.make':
      return makeFire(state, command.method, content);
    case 'fire.feed':
      return feedFire(state, content);
    case 'fire.cook':
      return cook(state, command.recipeId, content);
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
