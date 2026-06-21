import actionModuleDataJson from "../data/actions/actions-by-need/health.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const HealthActions = actionModuleData.exports
    .HealthActions as ActionDefinition[];
