import type { Combatant, CommunicationPlan } from "../model";
import type { AcceptedCommunication } from "./communication-reaction.types";
import type { IssuedOrder } from "./issued-order.types";

export interface CommunicationEmissionInput {
    readonly actor: Combatant;
    readonly plan: CommunicationPlan;
    readonly seed: number;
    readonly round: number;
}

export interface CommunicationEmission {
    readonly issuedOrder?: IssuedOrder;
    readonly issuedOrderChanged: boolean;
    readonly leadershipModifier: number;
    readonly penetratingVoiceBonus: number;
    readonly identificationBonus: number;
    readonly recipientIds: readonly string[];
    readonly selfCommitment?: AcceptedCommunication;
}
