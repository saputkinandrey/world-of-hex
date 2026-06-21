import actionModuleDataJson from "../data/actions/actions-by-need/loyalty.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const LoyaltyActions = actionModuleData.exports
    .LoyaltyActions as ActionDefinition[];
