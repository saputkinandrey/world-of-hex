import type {
    Combatant,
    CommunicationKind,
    CommandKind,
    IndividualDirectiveKind,
    CartesianPoint,
} from "../model";
import type { SkillSpecializationId } from "../fighter-generation";

export type AcceptedCommunication =
    | {
          readonly kind: "order";
          readonly command: CommandKind;
          readonly senderId: string;
          readonly formationFacing?: CartesianPoint;
          readonly specialization?: SkillSpecializationId;
      }
    | {
          readonly kind: "directive";
          readonly directive: IndividualDirectiveKind;
      }
    | { readonly kind: "focus"; readonly targetId: string };

export interface DeliveredCommunication {
    readonly senderId: string;
    readonly kind: CommunicationKind;
    readonly command?: CommandKind;
    readonly directive?: IndividualDirectiveKind;
    readonly focusTargetId?: string;
    readonly formationFacing?: CartesianPoint;
    readonly soldierSpecialization?: SkillSpecializationId;
    readonly recipientIds: readonly string[];
    readonly penetratingVoiceBonus: number;
    readonly identificationBonus: number;
    readonly leadershipModifier: number;
    readonly hearingDistanceModifier: number;
    readonly visionDistanceModifier: number;
    readonly hearingInterference: number;
    readonly visionInterference: number;
}

export interface CommunicationReactionInput {
    readonly actor: Combatant;
    readonly signal: DeliveredCommunication;
    readonly seed: number;
    readonly round: number;
}

export interface CommunicationCheck {
    readonly target: number;
    readonly roll: number;
    readonly successful: boolean;
    readonly automatic: boolean;
}

export interface CommunicationReaction {
    readonly addressed: boolean;
    readonly expectedOrderBonus: number;
    readonly hearing: CommunicationCheck;
    readonly identification?: CommunicationCheck;
    readonly understanding?: CommunicationCheck;
    readonly acceptance?: CommunicationCheck;
    readonly acceptedMessage?: AcceptedCommunication;
}
