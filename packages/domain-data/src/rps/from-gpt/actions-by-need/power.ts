import actionModuleDataJson from "../data/actions/actions-by-need/power.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const PowerActions = actionModuleData.exports
    .PowerActions as ActionDefinition[];
