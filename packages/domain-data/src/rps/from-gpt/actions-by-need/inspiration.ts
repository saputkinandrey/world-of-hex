import actionModuleDataJson from "../data/actions/actions-by-need/inspiration.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const InspirationActions = actionModuleData.exports
    .InspirationActions as ActionDefinition[];
