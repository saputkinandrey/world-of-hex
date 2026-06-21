import actionModuleDataJson from "../data/actions/actions-by-need/family.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const FamilyActions = actionModuleData.exports
    .FamilyActions as ActionDefinition[];
