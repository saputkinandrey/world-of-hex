import actionModuleDataJson from "../data/actions/actions-by-need/social.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const SocialNeedActions = actionModuleData.exports
    .SocialNeedActions as ActionDefinition[];
