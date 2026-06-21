import actionModuleDataJson from "../data/actions/etho/actions-cold-blooded.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const SEEK_THERMAL_REFUGE = actionModuleData.exports
    .SEEK_THERMAL_REFUGE as ActionDefinition;
