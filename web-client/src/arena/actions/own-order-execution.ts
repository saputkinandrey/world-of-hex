import type { ObservedCombatant } from "../actors/observation.types";
import { distanceBetween } from "../arena";
import { hasObservedOwnOrderExecutionStarted } from "../command-assessment";
import type { Combatant, FormationContext, HexCoord } from "../model";
import { findStepTowardSquadCenter } from "../navigation";
import { hasMilitaryCommandAuthority } from "../scenario";

export interface OwnOrderExecutionInput {
    actor: Combatant;
    attackTarget: ObservedCombatant | undefined;
    formationContext: FormationContext | null;
    blocked: Set<string>;
    arenaCellKeys: ReadonlySet<string>;
    round: number;
}

export interface OwnOrderExecutionAssessment {
    delayIndependentMovement: boolean;
    attackTargetId?: string;
    facingTarget?: HexCoord;
    cohesionStep?: HexCoord;
}

export const assessOwnOrderExecution = ({
    actor,
    attackTarget,
    formationContext,
    blocked,
    arenaCellKeys,
    round,
}: OwnOrderExecutionInput): OwnOrderExecutionAssessment => {
    const observedSubordinates =
        formationContext?.squadMembers.filter(
            (member) => member.id !== actor.id,
        ) ?? [];
    const delayIndependentMovement =
        hasMilitaryCommandAuthority(actor) &&
        !hasObservedOwnOrderExecutionStarted(
            actor,
            observedSubordinates,
            round,
        );
    const canAttackNow =
        attackTarget !== undefined &&
        distanceBetween(actor.position, attackTarget.position) <=
            actor.weaponReach;

    return {
        delayIndependentMovement,
        attackTargetId: canAttackNow ? attackTarget?.id : undefined,
        facingTarget: attackTarget?.position,
        cohesionStep:
            delayIndependentMovement && observedSubordinates.length > 0
                ? findStepTowardSquadCenter(
                      actor,
                      [actor, ...observedSubordinates],
                      blocked,
                      arenaCellKeys,
                  )
                : undefined,
    };
};
