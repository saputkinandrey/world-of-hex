import actionModuleDataJson from "../data/actions/actions-by-need/tradition.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const TraditionActions = actionModuleData.exports
    .TraditionActions as ActionDefinition[];
