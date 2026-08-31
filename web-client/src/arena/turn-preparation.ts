import { toKey } from "./arena";
import type {
    BattleIntent,
    Combatant,
    CommunicationPlan,
    HexCoord,
} from "./model";
import { findPathToDestination } from "./navigation";
import { hasFormationFacingChanged } from "./perception";
import { getFacingToward } from "./facing";
import { createRandom, shuffle } from "./random";

export interface MovementResolutionInput {
    combatants: Combatant[];
    intents: BattleIntent[];
    obstacleKeys: Set<string>;
    seed: number;
    turn: number;
}

export const prepareCombatantsForTurn = (
    combatants: Combatant[],
    turn: number,
): Combatant[] =>
    combatants.map((combatant) => ({
        ...combatant,
        receivedOrder:
            combatant.orderExpiresAfterTurn >= turn
                ? combatant.receivedOrder
                : null,
        receivedOrderSenderId:
            combatant.orderExpiresAfterTurn >= turn
                ? combatant.receivedOrderSenderId
                : null,
        receivedOrderSpecialization:
            combatant.orderExpiresAfterTurn >= turn
                ? combatant.receivedOrderSpecialization
                : null,
        receivedDirective:
            combatant.directiveExpiresAfterTurn >= turn
                ? combatant.receivedDirective
                : null,
        focusTargetId:
            combatant.focusExpiresAfterTurn >= turn
                ? combatant.focusTargetId
                : null,
        orderedFormationFacing:
            combatant.orderedFormationFacingExpiresAfterTurn >= turn
                ? combatant.orderedFormationFacing
                : null,
    }));

export const resolveMovement = ({
    combatants,
    intents,
    obstacleKeys,
    seed,
    turn,
}: MovementResolutionInput): Combatant[] => {
    const intentByActorId = new Map(
        intents.map((intent) => [intent.actorId, intent]),
    );
    const claimedMoveKeys = new Set<string>();
    const movingActorIds = new Set(
        intents
            .filter((intent) => intent.moveTarget)
            .map((intent) => intent.actorId),
    );
    const stationaryKeys = new Set(
        combatants
            .filter(
                (combatant) =>
                    combatant.health > 0 &&
                    !movingActorIds.has(combatant.id),
            )
            .map((combatant) => toKey(combatant.position)),
    );
    const moveByActorId = new Map<string, HexCoord>();

    shuffle(
        intents.filter((intent) => intent.moveTarget),
        createRandom(seed + turn * 31),
    ).forEach((intent) => {
        if (!intent.moveTarget) return;
        const targetKey = toKey(intent.moveTarget);
        if (!claimedMoveKeys.has(targetKey) && !stationaryKeys.has(targetKey)) {
            claimedMoveKeys.add(targetKey);
            moveByActorId.set(intent.actorId, intent.moveTarget);
        }
    });

    return combatants.map((combatant) => {
        const intent = intentByActorId.get(combatant.id);
        const moveTarget = moveByActorId.get(combatant.id);
        const movementBlockers = new Set([
            ...obstacleKeys,
            ...combatants
                .filter(
                    (other) =>
                        other.health > 0 && other.id !== combatant.id,
                )
                .map((other) => toKey(other.position)),
        ]);
        const movementPath = moveTarget
            ? findPathToDestination(combatant, moveTarget, movementBlockers)
            : [];
        const previousMovementPosition =
            movementPath.length > 1
                ? movementPath[movementPath.length - 2]
                : combatant.position;
        const bodyFacing =
            intent?.facingTarget
                ? getFacingToward(
                      moveTarget ?? combatant.position,
                      intent.facingTarget,
                      combatant.bodyFacing,
                  )
                : moveTarget && intent?.movementMode !== "backward"
                ? getFacingToward(
                      previousMovementPosition,
                      moveTarget,
                      combatant.bodyFacing,
                  )
                : combatant.bodyFacing;

        return {
            ...combatant,
            lastMovementPath: [combatant.position, ...movementPath],
            maneuver: intent?.maneuver ?? combatant.maneuver,
            actionState: intent?.actionState ?? combatant.actionState,
            position: moveTarget ?? combatant.position,
            bodyFacing,
        };
    });
};

export const findOrderChangeSenders = (
    combatants: Combatant[],
    plans: CommunicationPlan[],
): Set<string> => {
    const combatantById = new Map(
        combatants.map((combatant) => [combatant.id, combatant]),
    );

    return new Set(
        plans
            .filter(
                (plan) =>
                    plan.kind === "vertical_order" &&
                    (combatantById.get(plan.senderId)?.receivedOrder !==
                        plan.command ||
                        hasFormationFacingChanged(
                            combatantById.get(plan.senderId)
                                ?.orderedFormationFacing ?? null,
                            plan.formationFacing ?? null,
                        )),
            )
            .map((plan) => plan.senderId),
    );
};
