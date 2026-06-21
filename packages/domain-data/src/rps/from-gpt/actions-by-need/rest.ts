import actionModuleDataJson from "../data/actions/actions-by-need/rest.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const RestActions = actionModuleData.exports
    .RestActions as ActionDefinition[];
