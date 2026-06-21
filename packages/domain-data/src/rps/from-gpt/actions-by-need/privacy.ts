import actionModuleDataJson from "../data/actions/actions-by-need/privacy.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const PrivacyActions = actionModuleData.exports
    .PrivacyActions as ActionDefinition[];
