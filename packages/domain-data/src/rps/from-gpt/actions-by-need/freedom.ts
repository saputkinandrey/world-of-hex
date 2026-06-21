import actionModuleDataJson from "../data/actions/actions-by-need/freedom.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const FreedomActions = actionModuleData.exports
    .FreedomActions as ActionDefinition[];
