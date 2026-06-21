import actionModuleDataJson from "../data/actions/actions-by-need/trust.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const TrustActions = actionModuleData.exports
    .TrustActions as ActionDefinition[];
