import actionModuleDataJson from "../data/actions/actions-by-need/status.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const StatusActions = actionModuleData.exports
    .StatusActions as ActionDefinition[];
