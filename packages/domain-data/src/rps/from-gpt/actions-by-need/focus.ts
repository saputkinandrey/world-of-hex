import actionModuleDataJson from "../data/actions/actions-by-need/focus.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const FocusActions = actionModuleData.exports
    .FocusActions as ActionDefinition[];
