import actionModuleDataJson from "../data/actions/actions-by-need/love.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const LoveActions = actionModuleData.exports
    .LoveActions as ActionDefinition[];
