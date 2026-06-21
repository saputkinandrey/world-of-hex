import actionModuleDataJson from "../data/actions/actions-by-need/food.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const FORAGE = actionModuleData.exports.FORAGE as ActionDefinition;
export const HUNT = actionModuleData.exports.HUNT as ActionDefinition;
export const STEAL_FOOD = actionModuleData.exports
    .STEAL_FOOD as ActionDefinition;
export const EAT_ACCEPTABLE = actionModuleData.exports
    .EAT_ACCEPTABLE as ActionDefinition;
export const EAT_POOR = actionModuleData.exports.EAT_POOR as ActionDefinition;
export const EAT_ANYTHING = actionModuleData.exports
    .EAT_ANYTHING as ActionDefinition;
export const FoodActions = actionModuleData.exports
    .FoodActions as ActionDefinition[];
