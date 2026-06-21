import actionModuleDataJson from "../data/actions/actions-by-need/courage.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const CourageActions = actionModuleData.exports
    .CourageActions as ActionDefinition[];
