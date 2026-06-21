import actionModuleDataJson from "../data/actions/actions-by-need/network.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const NetworkActions = actionModuleData.exports
    .NetworkActions as ActionDefinition[];
