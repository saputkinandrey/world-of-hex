import actionModuleDataJson from "../data/actions/actions-by-need/knowledge.json";
import type { ActionDefinition } from "../action-definition";

interface ActionModuleData {
    exports: Record<string, unknown>;
}

const actionModuleData = actionModuleDataJson as ActionModuleData;

export const KnowledgeActions = actionModuleData.exports
    .KnowledgeActions as ActionDefinition[];
