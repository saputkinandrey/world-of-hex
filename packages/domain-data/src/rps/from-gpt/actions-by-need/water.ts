import actionModuleDataJson from "../data/actions/actions-by-need/water.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const COLLECT_WATER = actionModuleData.exports
    .COLLECT_WATER as ActionDefinition;
export const FETCH_WATER = actionModuleData.exports
    .FETCH_WATER as ActionDefinition;
export const FILTER_WATER = actionModuleData.exports
    .FILTER_WATER as ActionDefinition;
export const BOIL_WATER = actionModuleData.exports
    .BOIL_WATER as ActionDefinition;
export const DRINK_WATER = actionModuleData.exports
    .DRINK_WATER as ActionDefinition;
export const DRINK_DIRTY_WATER = actionModuleData.exports
    .DRINK_DIRTY_WATER as ActionDefinition;
export const SHARE_WATER = actionModuleData.exports
    .SHARE_WATER as ActionDefinition;
export const TRADE_FOR_WATER = actionModuleData.exports
    .TRADE_FOR_WATER as ActionDefinition;
export const WORK_FOR_WATER = actionModuleData.exports
    .WORK_FOR_WATER as ActionDefinition;
export const STEAL_WATER = actionModuleData.exports
    .STEAL_WATER as ActionDefinition;
export const RATION_WATER = actionModuleData.exports
    .RATION_WATER as ActionDefinition;
export const GUARD_WATER_SOURCE = actionModuleData.exports
    .GUARD_WATER_SOURCE as ActionDefinition;
export const BUILD_WELL = actionModuleData.exports
    .BUILD_WELL as ActionDefinition;
export const MAINTAIN_WELL = actionModuleData.exports
    .MAINTAIN_WELL as ActionDefinition;
export const DISCOVER_WATER_SOURCE = actionModuleData.exports
    .DISCOVER_WATER_SOURCE as ActionDefinition;
export const BLESS_WATER = actionModuleData.exports
    .BLESS_WATER as ActionDefinition;
export const WaterActions = actionModuleData.exports
    .WaterActions as ActionDefinition[];
