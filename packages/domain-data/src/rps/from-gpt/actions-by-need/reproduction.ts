import actionModuleDataJson from "../data/actions/actions-by-need/reproduction.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const ReproductionActions = actionModuleData.exports
    .ReproductionActions as ActionDefinition[];
