import actionModuleDataJson from "../data/actions/actions-by-need/food-hunt.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const HUNT_WAIT_IN_AMBUSH = actionModuleData.exports
    .HUNT_WAIT_IN_AMBUSH as ActionDefinition;
export const HUNT_ACTIVE_FORAGE = actionModuleData.exports
    .HUNT_ACTIVE_FORAGE as ActionDefinition;
