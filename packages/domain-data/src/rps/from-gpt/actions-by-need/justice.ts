import actionModuleDataJson from "../data/actions/actions-by-need/justice.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const JusticeActions = actionModuleData.exports
    .JusticeActions as ActionDefinition[];
