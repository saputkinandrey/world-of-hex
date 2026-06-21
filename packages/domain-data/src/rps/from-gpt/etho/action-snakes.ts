import actionModuleDataJson from "../data/actions/etho/action-snakes.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const VENOM_STRIKE = actionModuleData.exports
    .VENOM_STRIKE as ActionDefinition;
export const CONSTRICT_PREY = actionModuleData.exports
    .CONSTRICT_PREY as ActionDefinition;
export const SWALLOW_WHOLE_FEEDING = actionModuleData.exports
    .SWALLOW_WHOLE_FEEDING as ActionDefinition;
export const EthoActions_Snakes = actionModuleData.exports
    .EthoActions_Snakes as ActionDefinition[];
