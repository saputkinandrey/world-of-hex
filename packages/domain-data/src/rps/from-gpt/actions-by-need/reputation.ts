import actionModuleDataJson from "../data/actions/actions-by-need/reputation.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const ReputationActions = actionModuleData.exports
    .ReputationActions as ActionDefinition[];
