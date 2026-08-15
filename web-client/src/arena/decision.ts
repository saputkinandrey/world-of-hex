import { distanceBetween, toKey } from "./arena";
import { chooseHoldFormationPosition, getCohesionOutliers, getFormationContext, sergeantHasEnemyContact } from "./formation";
import { BattleIntent, Combatant, CommunicationPlan, ManeuverOption, ObviousWoundState } from "./model";
import { canReachWithAttackThisRound, findConcentrationStep, findPathNearCombatant, findPathToAttackPosition, findPathToDestination, findStepTowardSquadCenter, findWithdrawalDestination } from "./navigation";
import { createRandom, hashText } from "./random";
import { getBehaviorFactors } from "./scenario";

export const MAX_EVALUATE_BONUS = 3;

export const OBVIOUS_WOUND_RANK: Record<ObviousWoundState, number> = {
    unhurt: 0,
    wounded: 1,
    badly_wounded: 2,
};

export const isSafeForAllOutAttack = (
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

export const getObviousWoundState = (combatant: Combatant): ObviousWoundState => {
    const visibleInjury = combatant.maxHealth - combatant.health;
    if (visibleInjury >= combatant.maxHealth / 2) {
        return "badly_wounded";
    }
    return visibleInjury > 0 ? "wounded" : "unhurt";
};

export const chooseAttackTarget = (
    actor: Combatant,
    enemies: Combatant[],
): Combatant | undefined => {
    const reachableEnemies = enemies.filter(
        (enemy) =>
            distanceBetween(actor.position, enemy.position) <= actor.weaponReach,
    );
    const coordinatedTarget = reachableEnemies.find(
        (enemy) => enemy.id === actor.focusTargetId,
    );
    return (
        coordinatedTarget ??
        reachableEnemies.sort(
            (left, right) =>
                OBVIOUS_WOUND_RANK[getObviousWoundState(right)] -
                    OBVIOUS_WOUND_RANK[getObviousWoundState(left)] ||
                hashText(`${actor.id}:${left.id}`) -
                    hashText(`${actor.id}:${right.id}`),
        )[0]
    );
};

export const createBattleIntents = (
    combatants: Combatant[],
    communicationPlans: CommunicationPlan[],
    obstacleKeys: Set<string>,
    seed: number,
    round: number,
): BattleIntent[] => {
    const living = combatants.filter((combatant) => combatant.health > 0);
    const occupied = new Set(living.map((combatant) => toKey(combatant.position)));
    const blocked = new Set([...obstacleKeys, ...occupied]);
    const communicationSenders = new Set(
        communicationPlans.map((plan) => plan.senderId),
    );
    const communicationPlanBySenderId = new Map(
        communicationPlans.map((plan) => [plan.senderId, plan]),
    );

    return living.map((actor) => {
        if (actor.stunnedRounds > 0) {
            return { actorId: actor.id, maneuver: "do_nothing" };
        }
        const enemies = living.filter((enemy) => enemy.team !== actor.team);
        const teamAllies = living.filter(
            (ally) => ally.team === actor.team && ally.id !== actor.id,
        );
        const formationContext = getFormationContext(actor, living);
        const attackTarget = chooseAttackTarget(actor, enemies);
        if (communicationSenders.has(actor.id)) {
            blocked.delete(toKey(actor.position));
            const communicationPlan = communicationPlanBySenderId.get(actor.id);
            const addressedRecipient = communicationPlan?.recipientIds
                .map((recipientId) =>
                    living.find((combatant) => combatant.id === recipientId),
                )
                .find(Boolean);
            const addressedPath = addressedRecipient
                ? findPathNearCombatant(actor, addressedRecipient, blocked)
                : [];
            const squadCenterStep =
                communicationPlan?.kind === "vertical_order" && formationContext
                    ? findStepTowardSquadCenter(
                          actor,
                          formationContext.squadMembers,
                          blocked,
                      )
                    : undefined;
            const moveTarget =
                communicationPlan?.kind === "addressed_order"
                    ? addressedPath[0]
                    : communicationPlan?.kind === "vertical_order"
                      ? squadCenterStep
                      : findConcentrationStep(actor, enemies, blocked);
            blocked.add(toKey(actor.position));
            return {
                actorId: actor.id,
                maneuver: "concentrate",
                moveTarget,
            };
        }

        const behavior = getBehaviorFactors(actor);
        const healthRatio = actor.health / actor.maxHealth;
        const random = createRandom(
            seed + round * 811 + actor.number * (actor.team === "blue" ? 47 : 83),
        );
        blocked.delete(toKey(actor.position));

        if (
            formationContext &&
            actor.hasReceivedInitialOrder &&
            actor.receivedOrder !== "withdraw" &&
            actor.receivedDirective !== "regroup"
        ) {
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
                    blocked.add(toKey(actor.position));
                    return {
                        actorId: actor.id,
                        maneuver: reachesCombatContact
                            ? "attack"
                            : "all_out_defense",
                        moveTarget: formationStep,
                    };
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
                blocked.add(toKey(actor.position));
                return {
                    actorId: actor.id,
                    maneuver: reachesCombatContact
                        ? "attack"
                        : "all_out_defense",
                    moveTarget: rolePosition,
                };
            }
            if (!attackTarget) {
                blocked.add(toKey(actor.position));
                return { actorId: actor.id, maneuver: "wait" };
            }
        }

        if (
            !attackTarget &&
            formationContext &&
            actor.id === formationContext.sergeant.id
        ) {
            const closestOutlier = getCohesionOutliers(formationContext).sort(
                (left, right) =>
                    distanceBetween(actor.position, left.position) -
                        distanceBetween(actor.position, right.position) ||
                    left.id.localeCompare(right.id),
            )[0];
            if (closestOutlier) {
                const cohesionPath = findPathNearCombatant(
                    actor,
                    closestOutlier,
                    blocked,
                );
                blocked.add(toKey(actor.position));
                return cohesionPath.length === 0
                    ? { actorId: actor.id, maneuver: "wait" }
                    : {
                          actorId: actor.id,
                          maneuver: "move",
                          moveTarget:
                              cohesionPath[
                                  Math.min(actor.basicMove, cohesionPath.length) - 1
                              ],
                      };
            }
        }

        if (
            !attackTarget &&
            formationContext &&
            !actor.hasReceivedInitialOrder
        ) {
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
            blocked.add(toKey(actor.position));
            return formationPath.length === 0
                ? { actorId: actor.id, maneuver: "wait" }
                : {
                      actorId: actor.id,
                      maneuver: "move",
                      moveTarget: formationPath[0],
                  };
        }

        if (
            !attackTarget &&
            actor.receivedDirective === "regroup" &&
            formationContext
        ) {
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
            blocked.add(toKey(actor.position));
            return formationPath.length === 0
                ? { actorId: actor.id, maneuver: "wait" }
                : {
                      actorId: actor.id,
                      maneuver: "move",
                      moveTarget:
                          formationPath[
                              Math.min(actor.basicMove, formationPath.length) - 1
                          ],
                  };
        }

        if (
            !attackTarget &&
            actor.receivedOrder === "hold" &&
            formationContext
        ) {
            if (
                actor.id === formationContext.sergeant.id &&
                !sergeantHasEnemyContact(formationContext, enemies)
            ) {
                const approachPath = findPathToAttackPosition(
                    actor,
                    enemies,
                    blocked,
                );
                blocked.add(toKey(actor.position));
                return approachPath.length === 0
                    ? { actorId: actor.id, maneuver: "wait" }
                    : {
                          actorId: actor.id,
                          maneuver: "move",
                          moveTarget: approachPath[0],
                      };
            }
            blocked.add(toKey(actor.position));
            return { actorId: actor.id, maneuver: "wait" };
        }

        if (actor.receivedOrder === "withdraw") {
            const moveTarget = findWithdrawalDestination(actor, enemies, blocked);
            blocked.add(toKey(actor.position));
            return {
                actorId: actor.id,
                maneuver: "all_out_defense",
                moveTarget,
            };
        }

        if (attackTarget) {
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
            if (
                isSafeForAllOutAttack(
                    actor,
                    enemies,
                    living,
                    obstacleKeys,
                )
            ) {
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

            if (chosen.maneuver === "all_out_defense") {
                blocked.add(toKey(actor.position));
                return {
                    actorId: actor.id,
                    maneuver: "all_out_defense",
                };
            }

            blocked.add(toKey(actor.position));
            return { actorId: actor.id, maneuver: chosen.maneuver };
        }

        const path = findPathToAttackPosition(actor, enemies, blocked);
        blocked.add(toKey(actor.position));

        if (path.length === 0) {
            return { actorId: actor.id, maneuver: "wait" };
        }
        if (path.length === 1) {
            return {
                actorId: actor.id,
                maneuver: "attack",
                moveTarget: path[0],
            };
        }
        if (
            path.length <= 2 &&
            behavior.caution - behavior.aggression > 3 + random() &&
            round % 3 !== actor.number % 3
        ) {
            return { actorId: actor.id, maneuver: "wait" };
        }
        const defensiveMoveLimit = Math.max(1, Math.ceil(actor.basicMove / 2));
        if (path.length <= defensiveMoveLimit) {
            return {
                actorId: actor.id,
                maneuver: "all_out_defense",
                moveTarget: path[path.length - 1],
            };
        }
        if (path.length <= actor.basicMove) {
            const urgentCoordinatedAttack =
                actor.receivedOrder === "press" && actor.focusTargetId !== null;
            return {
                actorId: actor.id,
                maneuver: urgentCoordinatedAttack
                    ? "move_and_attack"
                    : "move",
                moveTarget: path[path.length - 1],
            };
        }

        return {
            actorId: actor.id,
            maneuver: "move",
            moveTarget: path[Math.min(actor.basicMove, path.length) - 1],
        };
    });
};
