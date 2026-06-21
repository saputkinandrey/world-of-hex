import actionModuleDataJson from "../data/actions/actions-by-need/wealth.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const WealthActions = actionModuleData.exports
    .WealthActions as ActionDefinition[];
