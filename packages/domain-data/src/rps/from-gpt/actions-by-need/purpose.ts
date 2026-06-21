import actionModuleDataJson from "../data/actions/actions-by-need/purpose.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const PurposeActions = actionModuleData.exports
    .PurposeActions as ActionDefinition[];
