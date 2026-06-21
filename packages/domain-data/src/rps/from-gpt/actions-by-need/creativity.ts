import actionModuleDataJson from "../data/actions/actions-by-need/creativity.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const CreativityActions = actionModuleData.exports
    .CreativityActions as ActionDefinition[];
