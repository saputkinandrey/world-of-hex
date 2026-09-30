import { ARENA_CELL_BY_KEY } from "./arena";
import type { BattleIntent, Combatant } from "./model";
import { resolveMovementPaths } from "./movement-resolution";
import { getFacingToward } from "./facing";
import { createRandom } from "./random";

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
        issuedOrder:
            combatant.issuedOrder &&
            combatant.issuedOrder.expiresAfterTurn >= turn
                ? combatant.issuedOrder
                : null,
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
    const paths = resolveMovementPaths({
        combatants,
        intents,
        obstacleKeys,
        cellKeys: new Set(ARENA_CELL_BY_KEY.keys()),
        random: createRandom(seed + turn * 31),
    });
    return combatants.map((combatant) => {
        const intent = intentByActorId.get(combatant.id);
        const movementPath = paths.get(combatant.id) ?? [];
        const moveTarget = movementPath[movementPath.length - 1];
        const previousMovementPosition =
            movementPath.length > 1
                ? movementPath[movementPath.length - 2]
                : combatant.position;
        const bodyFacing = intent?.facingTarget
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
            visualSearchActive: intent?.visualSearchActive ?? false,
            position: moveTarget ?? combatant.position,
            bodyFacing,
        };
    });
};
