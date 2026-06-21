import actionModuleDataJson from "../data/actions/actions-by-need/faith.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const FaithActions = actionModuleData.exports
    .FaithActions as ActionDefinition[];
