import actionModuleDataJson from "../data/actions/actions-by-need/energy.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const EnergyActions = actionModuleData.exports
    .EnergyActions as ActionDefinition[];
