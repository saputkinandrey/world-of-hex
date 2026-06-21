import actionModuleDataJson from "../data/actions/actions-by-need/control.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const ControlActions = actionModuleData.exports
    .ControlActions as ActionDefinition[];
