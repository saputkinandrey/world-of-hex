import actionModuleDataJson from "../data/actions/actions-by-need/discipline.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const DisciplineActions = actionModuleData.exports
    .DisciplineActions as ActionDefinition[];
