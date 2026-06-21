import actionModuleDataJson from "../data/actions/actions-by-need/belonging.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const BelongingActions = actionModuleData.exports
    .BelongingActions as ActionDefinition[];
