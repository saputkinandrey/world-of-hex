import actionModuleDataJson from "../data/actions/actions-by-need/waste.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const WasteActions = actionModuleData.exports
    .WasteActions as ActionDefinition[];
