import actionModuleDataJson from "../data/actions/actions-by-need/hope.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const HopeActions = actionModuleData.exports
    .HopeActions as ActionDefinition[];
