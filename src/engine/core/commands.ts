import type { Content } from '../../content/loader';
import { dropItem, equipItem, unequipItem, applyItem } from '../systems/inventory/inventory';
import { drinkHere, fillBottles, hunt, search, takeFromGround, type Find } from '../systems/scavenging/scavenging';
import { rest } from '../systems/survival/survival';
import { craft } from '../systems/crafting/crafting';
import { cook, feedFire, makeFire } from '../systems/fire/fire';
import { enterTown, leaveTown, walkTo } from '../systems/town/town';
import { chooseEvent, closeEvent } from '../systems/events/events';
import { closeCombat, combatAct, type CombatAction } from '../systems/combat/combat';
import { debugEvent, debugFight, debugItem, debugNight, debugVehicle, debugVehicleState } from '../systems/debug/debug';
import { finishIntro, progress } from '../systems/progression/progression';
import { removeCharm, wearCharm } from '../systems/charms/charms';
import { boardVehicle, buildVehicle, leaveVehicle, loadCargo, refuelVehicle, repairVehicle, unloadCargo } from '../systems/vehicles/vehicles';
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
  // `indexes` point into state.ground; `toCargo` puts them in the ridden vehicle instead of the pack (P-021).
  | { type: 'ground.take'; indexes: number[]; toCargo?: boolean }
  // Charms (D-086): wear one from the pack (`index` into stacks), or take a worn one off.
  | { type: 'charm.wear'; index: number }
  | { type: 'charm.remove'; itemId: string }
  // Vehicles (M10, P-021). `uid` from state.vehicles; cargo `index` points into the ridden vehicle's cargo.
  | { type: 'vehicle.board'; uid: string }
  | { type: 'vehicle.leave' }
  | { type: 'vehicle.repair'; count: number }
  | { type: 'vehicle.refuel' }
  | { type: 'vehicle.build'; vehicleId: string }
  | { type: 'cargo.load'; index: number; count: number }
  | { type: 'cargo.unload'; index: number; count: number }
  | { type: 'town.enter' }
  | { type: 'town.leave' }
  // `spotId`: 'edge', a building or a water point of the town he's in.
  | { type: 'town.walk'; spotId: string }
  // Fire and cooking (D-056): `method` and `recipeId` come from fire.json.
  | { type: 'fire.make'; method: string }
  | { type: 'fire.feed' }
  | { type: 'fire.cook'; recipeId: string }
  // Crafting anywhere (M5): `recipeId` from recipes.json.
  | { type: 'craft'; recipeId: string }
  // Events (D-059): pick a choice on the open card, then close it.
  | { type: 'event.choose'; choiceId: string }
  | { type: 'event.close' }
  // Combat (M7): Prabu's action on his turn, then closing the result.
  | { type: 'combat.act'; action: CombatAction; abilityId?: string; target?: string; index?: number; steps?: number }
  | { type: 'combat.close' }
  // The intro has been read or skipped (D-076).
  | { type: 'intro.done' }
  // Testing tools (D-068), offered by the UI only with ?debug=1.
  | { type: 'debug.event'; eventId: string }
  | { type: 'debug.fight'; enemies: { enemyId: string; count: number }[]; ambush: boolean }
  | { type: 'debug.night' }
  | { type: 'debug.item'; itemId: string; count: number }
  | { type: 'debug.vehicle'; vehicleId: string }
  | { type: 'debug.vehicleState'; durability: number | null; fuel: number | null };

export type DeathCause = 'hunger' | 'thirst' | 'hunger_and_thirst' | 'radiation' | 'injury' | 'killed';

export type GameEvent =
  | { type: 'travel_started'; legs: number }
  | { type: 'leg_completed'; leg: number; of: number }
  | { type: 'site_discovered'; siteId: string }
  | { type: 'arrived'; siteId: string | null }
  // `meter`: the trip stopped by itself because a meter fell to the warning level or to 0 (D-035).
  | { type: 'travel_stopped'; reason: 'player' | 'meter' | 'event' | 'vehicle' }
  | { type: 'rested'; minutes: number }
  | { type: 'meter_low'; meter: Meter; empty: boolean }
  | { type: 'fell_ill' }
  | { type: 'recovered' }
  | { type: 'injury_cured' }
  | { type: 'item_used'; itemId: string }
  | { type: 'item_spoiled'; itemId: string; count: number }
  | { type: 'died'; cause: DeathCause }
  | { type: 'searched'; finds: Find[]; torch: boolean }
  | { type: 'hunted'; finds: Find[]; success: boolean }
  | { type: 'bottles_filled'; count: number; clean: boolean }
  | { type: 'drank'; clean: boolean }
  | { type: 'items_taken'; count: number }
  | { type: 'irradiated'; amount: number }
  | { type: 'town_entered'; siteId: string }
  | { type: 'town_left' }
  | { type: 'walked'; spotId: string }
  | { type: 'fire_lit'; method: string }
  | { type: 'fire_fed' }
  | { type: 'cooked'; recipeId: string; count: number }
  | { type: 'crafted'; recipeId: string; itemId: string; count: number }
  | { type: 'torch_flat' }
  | { type: 'condition_added'; conditionId: string }
  | { type: 'condition_ended'; conditionId: string }
  | { type: 'condition_cured'; conditionId: string }
  | { type: 'event_started'; eventId: string }
  | { type: 'event_resolved'; eventId: string; choiceId: string; outcome: number }
  | { type: 'event_closed' }
  | { type: 'combat_started'; enemies: number }
  | { type: 'combat_ended'; outcome: 'won' | 'fled' }
  | { type: 'combat_closed' }
  | { type: 'intro_done' }
  | { type: 'xp_gained'; amount: number }
  | { type: 'level_up'; level: number }
  | { type: 'charm_worn'; itemId: string }
  | { type: 'charm_removed'; itemId: string }
  | { type: 'vehicle_found'; vehicleId: string; uid: string }
  | { type: 'vehicle_boarded'; vehicleId: string }
  | { type: 'vehicle_left'; vehicleId: string }
  | { type: 'vehicle_worn'; vehicleId: string }
  | { type: 'vehicle_broken'; vehicleId: string }
  | { type: 'out_of_fuel'; vehicleId: string }
  | { type: 'vehicle_repaired'; vehicleId: string; durability: number }
  | { type: 'refuelled'; vehicleId: string; litres: number }
  | { type: 'vehicle_built'; vehicleId: string }
  | { type: 'cargo_moved'; loaded: boolean };

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
    | 'missing_item'
    | 'event_open'
    | 'no_event'
    | 'bad_choice'
    | 'in_combat'
    | 'not_in_combat'
    | 'out_of_reach'
    | 'wrong_rank'
    | 'no_arrows'
    | 'bad_target'
    | 'not_a_charm'
    | 'already_worn'
    | 'slot_full'
    | 'no_vehicle'
    | 'not_here'
    | 'cannot_repair'
    | 'no_fuel_tank'
    | 'tank_full'
    | 'cargo_full'
    | 'cannot_move';
  message: string;
};

export type CommandResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: CommandError };

function run(state: GameState, command: Command, content: Content): CommandResult {
  if (state.dead) return { ok: false, error: { code: 'dead', message: 'Prabu is dead. This run is over.' } };
  // An open event card must be answered before anything else (D-059).
  // A fight must be finished first (M7).
  if (state.combat && command.type !== 'combat.act' && command.type !== 'combat.close') {
    return { ok: false, error: { code: 'in_combat', message: 'Prabu is fighting.' } };
  }
  if (state.event && command.type !== 'event.choose' && command.type !== 'event.close') {
    return { ok: false, error: { code: 'event_open', message: 'Deal with what\'s in front of him first.' } };
  }
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
      return takeFromGround(state, command.indexes, content, command.toCargo ?? false);
    case 'charm.wear':
      return wearCharm(state, command.index, content);
    case 'charm.remove':
      return removeCharm(state, command.itemId);
    case 'vehicle.board':
      return boardVehicle(state, command.uid, content);
    case 'vehicle.leave':
      return leaveVehicle(state);
    case 'vehicle.repair':
      return repairVehicle(state, command.count, content);
    case 'vehicle.refuel':
      return refuelVehicle(state, content);
    case 'vehicle.build':
      return buildVehicle(state, command.vehicleId, content);
    case 'cargo.load':
      return loadCargo(state, command.index, command.count, content);
    case 'cargo.unload':
      return unloadCargo(state, command.index, command.count, content);
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
    case 'craft':
      return craft(state, command.recipeId, content);
    case 'event.choose':
      return chooseEvent(state, command.choiceId, content);
    case 'event.close':
      return closeEvent(state);
    case 'combat.act':
      return combatAct(state, command.action, command, content);
    case 'combat.close':
      return closeCombat(state);
    case 'intro.done':
      return finishIntro(state);
    case 'debug.event':
      return debugEvent(state, command.eventId, content);
    case 'debug.fight':
      return debugFight(state, command.enemies, command.ambush, content);
    case 'debug.night':
      return debugNight(state);
    case 'debug.item':
      return debugItem(state, command.itemId, command.count, content);
    case 'debug.vehicle':
      return debugVehicle(state, command.vehicleId, content);
    case 'debug.vehicleState':
      return debugVehicleState(state, command.durability, command.fuel, content);
    default:
      return { ok: false, error: { code: 'unknown_command', message: `Unknown command: ${(command as { type: string }).type}` } };
  }
}

/** The only way game state changes. Never mutates `state`, never throws. */
export function applyCommand(state: GameState, command: Command, content: Content): CommandResult {
  try {
    // Handlers get a copy, so a handler that fails halfway can't leave the caller's state half-changed.
    const result = run(structuredClone(state), command, content);
    // XP and journal notes follow from what happened (D-076), so every system earns them the same way.
    if (result.ok) result.events.push(...progress(result.state, result.events, content));
    return result;
  } catch (err) {
    return { ok: false, error: { code: 'internal_error', message: String(err) } };
  }
}
