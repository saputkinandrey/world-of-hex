import actionModuleDataJson from "../data/actions/etho/action-small-vertebrate.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const FLEE_TO_COVER = actionModuleData.exports
    .FLEE_TO_COVER as ActionDefinition;
export const FREEZE_IN_PLACE = actionModuleData.exports
    .FREEZE_IN_PLACE as ActionDefinition;
export const SHORT_DASH_ATTACK = actionModuleData.exports
    .SHORT_DASH_ATTACK as ActionDefinition;
export const OBSERVATION = actionModuleData.exports
    .OBSERVATION as ActionDefinition;
