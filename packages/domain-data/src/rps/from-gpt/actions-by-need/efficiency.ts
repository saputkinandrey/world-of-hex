import actionModuleDataJson from "../data/actions/actions-by-need/efficiency.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const EfficiencyActions = actionModuleData.exports
    .EfficiencyActions as ActionDefinition[];
