import type { Combatant, CommandKind, OrderAssessment } from "../model";

export interface ObservationNeed {
    combatantId: string;
    aspect: "position" | "behavior";
}

export interface OrderInformationInput {
    actor: Combatant;
    order: CommandKind;
    round: number;
    maxEvidenceAge: number;
    complianceThreshold: number;
    supportDistance: number;
}

export interface OrderInformation {
    needs: ObservationNeed[];
    following: number;
    unknown: number;
    squadSize: number;
    conclusion: OrderAssessment;
    hasNewEvidence: boolean;
}
