import actionModuleDataJson from "../data/actions/actions-by-need/joy.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const JoyActions = actionModuleData.exports
    .JoyActions as ActionDefinition[];
