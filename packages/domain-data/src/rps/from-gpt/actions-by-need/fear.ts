import actionModuleDataJson from "../data/actions/actions-by-need/fear.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const FearActions = actionModuleData.exports
    .FearActions as ActionDefinition[];
