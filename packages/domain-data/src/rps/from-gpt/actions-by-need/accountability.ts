import actionModuleDataJson from "../data/actions/actions-by-need/accountability.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const AccountabilityActions = actionModuleData.exports
    .AccountabilityActions as ActionDefinition[];
