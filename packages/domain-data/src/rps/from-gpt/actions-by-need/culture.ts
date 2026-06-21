import actionModuleDataJson from "../data/actions/actions-by-need/culture.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const CultureActions = actionModuleData.exports
    .CultureActions as ActionDefinition[];
