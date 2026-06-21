import actionModuleDataJson from "../data/actions/actions-by-need/identity.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const IdentityActions = actionModuleData.exports
    .IdentityActions as ActionDefinition[];
