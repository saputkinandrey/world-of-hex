import actionModuleDataJson from "../data/actions/actions-by-need/order.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const OrderActions = actionModuleData.exports
    .OrderActions as ActionDefinition[];
