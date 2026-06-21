import actionModuleDataJson from "../data/actions/actions-by-need/legacy.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const LegacyActions = actionModuleData.exports
    .LegacyActions as ActionDefinition[];
