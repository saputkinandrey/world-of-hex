import actionModuleDataJson from "../data/actions/actions-by-need/stress.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const StressActions = actionModuleData.exports
    .StressActions as ActionDefinition[];
