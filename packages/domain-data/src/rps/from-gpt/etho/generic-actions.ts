import actionModuleDataJson from "../data/actions/etho/generic-actions.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const GO_LONG_TRAVEL = actionModuleData.exports
    .GO_LONG_TRAVEL as ActionDefinition;
export const SLEEP_REST = actionModuleData.exports
    .SLEEP_REST as ActionDefinition;
