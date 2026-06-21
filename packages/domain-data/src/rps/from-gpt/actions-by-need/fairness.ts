import actionModuleDataJson from "../data/actions/actions-by-need/fairness.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const FairnessActions = actionModuleData.exports
    .FairnessActions as ActionDefinition[];
