import actionModuleDataJson from "../data/actions/actions-by-need/morale.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const MoraleActions = actionModuleData.exports
    .MoraleActions as ActionDefinition[];
