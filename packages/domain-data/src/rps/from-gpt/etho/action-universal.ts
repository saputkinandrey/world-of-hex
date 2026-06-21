import actionModuleDataJson from "../data/actions/etho/action-universal.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const AMBUSH_FROM_COVER = actionModuleData.exports
    .AMBUSH_FROM_COVER as ActionDefinition;
export const SCENT_TRAIL_TRACK = actionModuleData.exports
    .SCENT_TRAIL_TRACK as ActionDefinition;
export const VIBRATION_ALERT_HIDE = actionModuleData.exports
    .VIBRATION_ALERT_HIDE as ActionDefinition;
export const BASK_SUN_THERMOREGULATE = actionModuleData.exports
    .BASK_SUN_THERMOREGULATE as ActionDefinition;
export const SEEK_COOL_SHELTER = actionModuleData.exports
    .SEEK_COOL_SHELTER as ActionDefinition;
export const NOCTURNAL_FORAGE = actionModuleData.exports
    .NOCTURNAL_FORAGE as ActionDefinition;
export const SEASONAL_TORPOR = actionModuleData.exports
    .SEASONAL_TORPOR as ActionDefinition;
export const COURTSHIP_DISPLAY = actionModuleData.exports
    .COURTSHIP_DISPLAY as ActionDefinition;
export const TERRITORY_MICROHABIT_EXPLORE = actionModuleData.exports
    .TERRITORY_MICROHABIT_EXPLORE as ActionDefinition;
export const DEFENSIVE_WARNING_DISPLAY = actionModuleData.exports
    .DEFENSIVE_WARNING_DISPLAY as ActionDefinition;
export const BURROW_HIDE_OR_AMBUSH = actionModuleData.exports
    .BURROW_HIDE_OR_AMBUSH as ActionDefinition;
export const UniversalEthoActions = actionModuleData.exports
    .UniversalEthoActions as ActionDefinition[];
