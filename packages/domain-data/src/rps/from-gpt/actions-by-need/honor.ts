import actionModuleDataJson from "../data/actions/actions-by-need/honor.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const HonorActions = actionModuleData.exports
    .HonorActions as ActionDefinition[];
