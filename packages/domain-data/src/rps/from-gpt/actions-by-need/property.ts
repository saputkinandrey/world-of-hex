import actionModuleDataJson from "../data/actions/actions-by-need/property.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const PropertyActions = actionModuleData.exports
    .PropertyActions as ActionDefinition[];
