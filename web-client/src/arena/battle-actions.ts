import type {
    ActionCandidate,
    ActionDefinition,
    ActionRuntimeState,
} from "./action-system";
import { distanceBetween, toKey } from "./arena";
import { canReachWithAttackThisRound, findConcentrationStep, findPathNearCombatant, findPathToAttackPosition, findPathToDestination, findStepTowardSquadCenter, findWithdrawalDestination } from "./navigation";
import { chooseHoldFormationPosition, getCohesionOutliers, sergeantHasEnemyContact } from "./formation";
import type {
    BattleIntent,
    BehaviorFactors,
    Combatant,
    CommunicationPlan,
    FormationContext,
    ManeuverOption,
} from "./model";

export interface BattleActionContext {
    actor: Combatant;
    living: Combatant[];
    enemies: Combatant[];
    teamAllies: Combatant[];
    formationContext: FormationContext | null;
    attackTarget: Combatant | undefined;
    communicationPlan: CommunicationPlan | undefined;
    obstacleKeys: Set<string>;
    blocked: Set<string>;
    behavior: BehaviorFactors;
    healthRatio: number;
    random: () => number;
    round: number;
}

type BattleIntentDraft = Omit<BattleIntent, "actionState">;

type BattleActionDefinition = ActionDefinition<
    BattleActionContext,
    BattleIntentDraft,
    ActionRuntimeState
>;

const createCandidate = (
    definitionId: string,
    context: BattleActionContext,
    result: BattleIntentDraft,
): ActionCandidate<BattleIntentDraft, ActionRuntimeState> => ({
    result,
    nextState: {
        definitionId,
        startedAt:
            context.actor.actionState.definitionId === definitionId
                ? context.actor.actionState.startedAt
                : context.round,
        updatedAt: context.round,
    },
});

const isSafeForAllOutAttack = (
    actor: Combatant,
    enemies: Combatant[],
    combatants: Combatant[],
    obstacleKeys: Set<string>,
): boolean =>
    enemies.every(
        (enemy) =>
            !canReachWithAttackThisRound(
                enemy,
                actor,
                combatants,
                obstacleKeys,
            ),
    );

const incapacitatedAction: BattleActionDefinition = {
    id: "arena.incapacitated",
    priority: 1000,
    createCandidate: (context) =>
        context.actor.stunnedRounds > 0
            ? createCandidate("arena.incapacitated", context, {
                  actorId: context.actor.id,
                  maneuver: "do_nothing",
              })
            : null,
};

const communicateAction: BattleActionDefinition = {
    id: "arena.communicate",
    priority: 900,
    createCandidate: (context) => {
        const { actor, blocked, communicationPlan, enemies, formationContext, living } = context;
        if (!communicationPlan) return null;

        const addressedRecipient = communicationPlan.recipientIds
            .map((recipientId) =>
                living.find((combatant) => combatant.id === recipientId),
            )
            .find(Boolean);
        const addressedPath = addressedRecipient
            ? findPathNearCombatant(actor, addressedRecipient, blocked)
            : [];
        const squadCenterStep =
            communicationPlan.kind === "vertical_order" && formationContext
                ? findStepTowardSquadCenter(
                      actor,
                      formationContext.squadMembers,
                      blocked,
                  )
                : undefined;
        const moveTarget =
            communicationPlan.kind === "addressed_order"
                ? addressedPath[0]
                : communicationPlan.kind === "vertical_order"
                  ? squadCenterStep
                  : findConcentrationStep(actor, enemies, blocked);

        return createCandidate("arena.communicate", context, {
            actorId: actor.id,
            maneuver: "concentrate",
            moveTarget,
        });
    },
};

const maintainOrderedFormationAction: BattleActionDefinition = {
    id: "arena.maintain-ordered-formation",
    priority: 800,
    createCandidate: (context) => {
        const { actor, attackTarget, blocked, enemies, formationContext, teamAllies } = context;
        if (
            !formationContext ||
            !actor.hasReceivedInitialOrder ||
            actor.receivedOrder === "withdraw" ||
            actor.receivedDirective === "regroup"
        ) {
            return null;
        }

        const squadHasCombatContact = formationContext.squadMembers.some(
            (member) =>
                enemies.some(
                    (enemy) =>
                        distanceBetween(member.position, enemy.position) <=
                        member.weaponReach,
                ),
        );
        if (!squadHasCombatContact) {
            const formationSlot = chooseHoldFormationPosition(
                actor,
                formationContext,
                teamAllies,
                enemies,
                blocked,
            );
            const formationPath = findPathToDestination(
                actor,
                formationSlot,
                blocked,
            );
            if (formationPath.length > 0) {
                const formationStep = formationPath[0];
                const reachesCombatContact = enemies.some(
                    (enemy) =>
                        distanceBetween(formationStep, enemy.position) <=
                        actor.weaponReach,
                );
                return createCandidate("arena.maintain-ordered-formation", context, {
                    actorId: actor.id,
                    maneuver: reachesCombatContact
                        ? "attack"
                        : "all_out_defense",
                    moveTarget: formationStep,
                });
            }
        }

        const rolePosition = chooseHoldFormationPosition(
            actor,
            formationContext,
            teamAllies,
            enemies,
            blocked,
        );
        if (toKey(rolePosition) !== toKey(actor.position)) {
            const reachesCombatContact = enemies.some(
                (enemy) =>
                    distanceBetween(rolePosition, enemy.position) <=
                    actor.weaponReach,
            );
            return createCandidate("arena.maintain-ordered-formation", context, {
                actorId: actor.id,
                maneuver: reachesCombatContact ? "attack" : "all_out_defense",
                moveTarget: rolePosition,
            });
        }
        if (!attackTarget) {
            return createCandidate("arena.maintain-ordered-formation", context, {
                actorId: actor.id,
                maneuver: "wait",
            });
        }

        return null;
    },
};

const restoreSergeantCohesionAction: BattleActionDefinition = {
    id: "arena.restore-sergeant-cohesion",
    priority: 700,
    createCandidate: (context) => {
        const { actor, attackTarget, blocked, formationContext } = context;
        if (
            attackTarget ||
            !formationContext ||
            actor.id !== formationContext.sergeant.id
        ) {
            return null;
        }
        const closestOutlier = getCohesionOutliers(formationContext).sort(
            (left, right) =>
                distanceBetween(actor.position, left.position) -
                    distanceBetween(actor.position, right.position) ||
                left.id.localeCompare(right.id),
        )[0];
        if (!closestOutlier) return null;

        const cohesionPath = findPathNearCombatant(
            actor,
            closestOutlier,
            blocked,
        );
        return createCandidate("arena.restore-sergeant-cohesion", context, {
            actorId: actor.id,
            maneuver: cohesionPath.length === 0 ? "wait" : "move",
            moveTarget:
                cohesionPath.length === 0
                    ? undefined
                    : cohesionPath[
                          Math.min(actor.basicMove, cohesionPath.length) - 1
                      ],
        });
    },
};

const awaitInitialOrderAction: BattleActionDefinition = {
    id: "arena.await-initial-order",
    priority: 600,
    createCandidate: (context) => {
        const { actor, attackTarget, blocked, enemies, formationContext, teamAllies } = context;
        if (attackTarget || !formationContext || actor.hasReceivedInitialOrder) {
            return null;
        }
        const formationSlot = chooseHoldFormationPosition(
            actor,
            formationContext,
            teamAllies,
            enemies,
            blocked,
        );
        const formationPath = findPathToDestination(
            actor,
            formationSlot,
            blocked,
        );
        return createCandidate("arena.await-initial-order", context, {
            actorId: actor.id,
            maneuver: formationPath.length === 0 ? "wait" : "move",
            moveTarget: formationPath.length === 0 ? undefined : formationPath[0],
        });
    },
};

const regroupAction: BattleActionDefinition = {
    id: "arena.regroup",
    priority: 550,
    createCandidate: (context) => {
        const { actor, attackTarget, blocked, enemies, formationContext, teamAllies } = context;
        if (
            attackTarget ||
            actor.receivedDirective !== "regroup" ||
            !formationContext
        ) {
            return null;
        }
        const formationSlot = chooseHoldFormationPosition(
            actor,
            formationContext,
            teamAllies,
            enemies,
            blocked,
        );
        const formationPath = findPathToDestination(
            actor,
            formationSlot,
            blocked,
        );
        return createCandidate("arena.regroup", context, {
            actorId: actor.id,
            maneuver: formationPath.length === 0 ? "wait" : "move",
            moveTarget:
                formationPath.length === 0
                    ? undefined
                    : formationPath[
                          Math.min(actor.basicMove, formationPath.length) - 1
                      ],
        });
    },
};

const holdPositionAction: BattleActionDefinition = {
    id: "arena.hold-position",
    priority: 500,
    createCandidate: (context) => {
        const { actor, attackTarget, blocked, enemies, formationContext } = context;
        if (
            attackTarget ||
            actor.receivedOrder !== "hold" ||
            !formationContext
        ) {
            return null;
        }
        if (
            actor.id === formationContext.sergeant.id &&
            !sergeantHasEnemyContact(formationContext, enemies)
        ) {
            const approachPath = findPathToAttackPosition(
                actor,
                enemies,
                blocked,
            );
            return createCandidate("arena.hold-position", context, {
                actorId: actor.id,
                maneuver: approachPath.length === 0 ? "wait" : "move",
                moveTarget: approachPath.length === 0 ? undefined : approachPath[0],
            });
        }

        return createCandidate("arena.hold-position", context, {
            actorId: actor.id,
            maneuver: "wait",
        });
    },
};

const withdrawAction: BattleActionDefinition = {
    id: "arena.withdraw",
    priority: 450,
    createCandidate: (context) => {
        const { actor, blocked, enemies } = context;
        if (actor.receivedOrder !== "withdraw") return null;

        return createCandidate("arena.withdraw", context, {
            actorId: actor.id,
            maneuver: "all_out_defense",
            moveTarget: findWithdrawalDestination(actor, enemies, blocked),
        });
    },
};

const engageEnemyAction: BattleActionDefinition = {
    id: "arena.engage-enemy",
    priority: 400,
    createCandidate: (context) => {
        const { actor, attackTarget, behavior, enemies, healthRatio, living, obstacleKeys, random } = context;
        if (!attackTarget) return null;

        const options: ManeuverOption[] = [
            {
                maneuver: "attack",
                score: 6 + (actor.meleeSkill - 10) * 0.3 + random(),
            },
            {
                maneuver: "all_out_defense",
                score:
                    2 +
                    behavior.caution +
                    (1 - healthRatio) * 9 +
                    (actor.maneuver === "all_out_defense" ? -12 : 0) +
                    random(),
            },
            {
                maneuver: "evaluate",
                score:
                    2.5 +
                    behavior.discipline +
                    Math.max(0, 13 - actor.meleeSkill) * 0.5 -
                    actor.evaluateBonus * 2 +
                    random(),
            },
        ];
        if (isSafeForAllOutAttack(actor, enemies, living, obstacleKeys)) {
            options.push({
                maneuver: "all_out_attack",
                score:
                    3 +
                    behavior.aggression +
                    (1 - healthRatio) * 5 +
                    (actor.receivedOrder === "press" ? 2 : 0) +
                    random(),
            });
        }
        const chosen = options.sort((left, right) => right.score - left.score)[0];

        return createCandidate("arena.engage-enemy", context, {
            actorId: actor.id,
            maneuver: chosen.maneuver,
        });
    },
};

const approachEnemyAction: BattleActionDefinition = {
    id: "arena.approach-enemy",
    priority: 100,
    createCandidate: (context) => {
        const { actor, behavior, blocked, enemies, random, round } = context;
        const path = findPathToAttackPosition(actor, enemies, blocked);

        if (path.length === 0) {
            return createCandidate("arena.approach-enemy", context, {
                actorId: actor.id,
                maneuver: "wait",
            });
        }
        if (path.length === 1) {
            return createCandidate("arena.approach-enemy", context, {
                actorId: actor.id,
                maneuver: "attack",
                moveTarget: path[0],
            });
        }
        if (
            path.length <= 2 &&
            behavior.caution - behavior.aggression > 3 + random() &&
            round % 3 !== actor.number % 3
        ) {
            return createCandidate("arena.approach-enemy", context, {
                actorId: actor.id,
                maneuver: "wait",
            });
        }
        const defensiveMoveLimit = Math.max(1, Math.ceil(actor.basicMove / 2));
        if (path.length <= defensiveMoveLimit) {
            return createCandidate("arena.approach-enemy", context, {
                actorId: actor.id,
                maneuver: "all_out_defense",
                moveTarget: path[path.length - 1],
            });
        }
        if (path.length <= actor.basicMove) {
            const urgentCoordinatedAttack =
                actor.receivedOrder === "press" && actor.focusTargetId !== null;
            return createCandidate("arena.approach-enemy", context, {
                actorId: actor.id,
                maneuver: urgentCoordinatedAttack
                    ? "move_and_attack"
                    : "move",
                moveTarget: path[path.length - 1],
            });
        }

        return createCandidate("arena.approach-enemy", context, {
            actorId: actor.id,
            maneuver: "move",
            moveTarget: path[Math.min(actor.basicMove, path.length) - 1],
        });
    },
};

export const BATTLE_ACTION_DEFINITIONS: ReadonlyArray<BattleActionDefinition> = [
    incapacitatedAction,
    communicateAction,
    maintainOrderedFormationAction,
    restoreSergeantCohesionAction,
    awaitInitialOrderAction,
    regroupAction,
    holdPositionAction,
    withdrawAction,
    engageEnemyAction,
    approachEnemyAction,
];
