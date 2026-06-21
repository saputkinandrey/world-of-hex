import actionModuleDataJson from "../data/actions/etho/actions-reptile.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const SHED_SKIN_ECDYSIS = actionModuleData.exports
    .SHED_SKIN_ECDYSIS as ActionDefinition;
