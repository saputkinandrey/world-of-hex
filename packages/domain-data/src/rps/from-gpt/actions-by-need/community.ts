import actionModuleDataJson from "../data/actions/actions-by-need/community.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const CommunityActions = actionModuleData.exports
    .CommunityActions as ActionDefinition[];
