import actionModuleDataJson from "../data/actions/actions-by-need/mastery.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const MasteryActions = actionModuleData.exports
    .MasteryActions as ActionDefinition[];
