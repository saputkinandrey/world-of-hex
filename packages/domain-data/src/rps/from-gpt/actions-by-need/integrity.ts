import actionModuleDataJson from "../data/actions/actions-by-need/integrity.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const IntegrityActions = actionModuleData.exports
    .IntegrityActions as ActionDefinition[];
