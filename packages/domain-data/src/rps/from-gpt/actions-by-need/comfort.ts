import actionModuleDataJson from "../data/actions/actions-by-need/comfort.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const ComfortActions = actionModuleData.exports
    .ComfortActions as ActionDefinition[];
