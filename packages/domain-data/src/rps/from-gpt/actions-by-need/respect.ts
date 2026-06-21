import actionModuleDataJson from "../data/actions/actions-by-need/respect.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const RespectActions = actionModuleData.exports
    .RespectActions as ActionDefinition[];
