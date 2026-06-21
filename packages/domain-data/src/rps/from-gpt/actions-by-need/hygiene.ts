import actionModuleDataJson from "../data/actions/actions-by-need/hygiene.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const HygieneActions = actionModuleData.exports
    .HygieneActions as ActionDefinition[];
