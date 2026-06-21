import actionModuleDataJson from "../data/actions/actions-by-need/competition.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const CompetitionActions = actionModuleData.exports
    .CompetitionActions as ActionDefinition[];
