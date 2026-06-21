import actionModuleDataJson from "../data/actions/actions-by-need/dominance.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const DominanceActions = actionModuleData.exports
    .DominanceActions as ActionDefinition[];
