import actionModuleDataJson from "../data/actions/actions-by-need/stability.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const StabilityActions = actionModuleData.exports
    .StabilityActions as ActionDefinition[];
