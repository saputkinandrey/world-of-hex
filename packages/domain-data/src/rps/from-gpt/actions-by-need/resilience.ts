import actionModuleDataJson from "../data/actions/actions-by-need/resilience.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const ResilienceActions = actionModuleData.exports
    .ResilienceActions as ActionDefinition[];
