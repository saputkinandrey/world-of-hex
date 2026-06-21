import actionModuleDataJson from "../data/actions/actions-by-need/innovation-rep.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const InnovationRepActions = actionModuleData.exports
    .InnovationRepActions as ActionDefinition[];
