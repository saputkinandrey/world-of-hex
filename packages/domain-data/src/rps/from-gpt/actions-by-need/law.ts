import actionModuleDataJson from "../data/actions/actions-by-need/law.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const LawActions = actionModuleData.exports
    .LawActions as ActionDefinition[];
