import actionModuleDataJson from "../data/actions/actions-by-need/clarity.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const ClarityActions = actionModuleData.exports
    .ClarityActions as ActionDefinition[];
