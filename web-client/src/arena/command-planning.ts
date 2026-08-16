import { areAdjacent } from "./arena";
import { OBVIOUS_WOUND_RANK, getObviousWoundState } from "./combat-observation";
import { AMRITAR_SOLDIER_SPECIALIZATION_ID, getSkillLevel, getSkillPoints } from "./fighter-generation";
import { BASIC_SOLDIER_TRAINING_POINTS, chooseCommand, getCalmCommandHearingTarget, getCohesionOutliers } from "./formation";
import type { Combatant, CommunicationPlan, FormationContext } from "./model";
import { MIN_USEFUL_COMMAND_HEARING_TARGET, hasFormationFacingChanged } from "./perception";
import { rollDice } from "./random";
import { ORDER_ASSESSMENT_VALID_ROUNDS, getCommandPlanningDelay } from "./command-config";

export const createCommunicationPlans = (
    combatants: Combatant[],
    seed: number,
    round: number,
): CommunicationPlan[] => {
    const living = combatants.filter((combatant) => combatant.health > 0);
    const plans: CommunicationPlan[] = [];
    const occupiedSenders = new Set<string>();
    const sergeants = living.filter(
        (combatant) =>
            combatant.profile.commandLens && combatant.stunnedRounds === 0,
    );

    sergeants.forEach((sergeant) => {
        const squad = living.filter(
            (combatant) =>
                combatant.team === sergeant.team &&
                combatant.profile.lens.id === sergeant.profile.lens.id,
        );
        const enemies = living.filter((combatant) => combatant.team !== sergeant.team);
        if (squad.length <= 1 || enemies.length === 0) {
            return;
        }
        const formationContext: FormationContext = {
            sergeant,
            squadMembers: squad,
        };
        const sergeantIsEngaged = enemies.some((enemy) =>
            areAdjacent(sergeant.position, enemy.position),
        );
        if (sergeantIsEngaged) {
            return;
        }
        const tacticsSkill = getSkillLevel(sergeant.profile, "tactics") ?? 6;
        const planningDelayRounds = getCommandPlanningDelay(tacticsSkill);
        const canUpdateFormationFront =
            round - sergeant.lastOrderChangeTurn >= planningDelayRounds &&
            hasFormationFacingChanged(
                sergeant.orderedFormationFacing,
                sergeant.observedFormationFacing,
            );
        const cohesionOutliers = getCohesionOutliers(formationContext);
        if (
            sergeant.hasReceivedInitialOrder &&
            cohesionOutliers.length > 0 &&
            !canUpdateFormationFront
        ) {
            const addressedRecipient = cohesionOutliers.find(
                (member) =>
                    member.receivedDirective !== "regroup" &&
                    getCalmCommandHearingTarget(sergeant, member) >=
                        MIN_USEFUL_COMMAND_HEARING_TARGET,
            );
            if (addressedRecipient) {
                plans.push({
                    kind: "addressed_order",
                    senderId: sergeant.id,
                    audienceIds: living
                        .filter((member) => member.id !== sergeant.id)
                        .map((member) => member.id),
                    recipientIds: [addressedRecipient.id],
                    directive: "regroup",
                    soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
                });
                occupiedSenders.add(sergeant.id);
            }
            return;
        }
        const currentOrder = sergeant.receivedOrder;
        if (currentOrder === null) {
            if (sergeant.pendingInitialOrderAssessment === "none") {
                plans.push({
                    kind: "assess_tactics",
                    senderId: sergeant.id,
                    audienceIds: [],
                    recipientIds: [],
                    planningDelayRounds,
                });
                occupiedSenders.add(sergeant.id);
                return;
            }

            const initialOrder =
                sergeant.pendingInitialOrderAssessment === "inverted"
                    ? chooseCommand(sergeant, squad, enemies, true)
                    : sergeant.pendingInitialOrderAssessment === "accurate"
                      ? chooseCommand(sergeant, squad, enemies)
                      : "hold";
            plans.push({
                kind: "vertical_order",
                senderId: sergeant.id,
                audienceIds: living
                    .filter((member) => member.id !== sergeant.id)
                    .map((member) => member.id),
                recipientIds: squad
                    .filter((member) => member.id !== sergeant.id)
                    .map((member) => member.id),
                command: initialOrder,
                planningDelayRounds,
                isInvertedDecision:
                    sergeant.pendingInitialOrderAssessment === "inverted",
                soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
                formationFacing:
                    sergeant.observedFormationFacing ??
                    sergeant.orderedFormationFacing ??
                    undefined,
            });
            occupiedSenders.add(sergeant.id);
            return;
        }

        const roundsSinceOrderChange = round - sergeant.lastOrderChangeTurn;
        const canChangeOrder = roundsSinceOrderChange >= planningDelayRounds;
        const assessmentAge = round - sergeant.orderAssessmentTurn;
        const tacticsRoll = canChangeOrder && !sergeant.invertNextOrderChoice
            ? rollDice(
                  3,
                  6,
                  seed,
                  round,
                  `${sergeant.id}:choose-order:tactics`,
              )
            : null;
        const proposedOrder = canChangeOrder
            ? sergeant.invertNextOrderChoice
                ? chooseCommand(sergeant, squad, enemies, true)
                : tacticsRoll && tacticsRoll.total <= tacticsSkill
                  ? chooseCommand(sergeant, squad, enemies)
                : "hold"
            : currentOrder;
        if (!proposedOrder) {
            return;
        }
        if (
            canChangeOrder &&
            sergeant.invertNextOrderChoice &&
            proposedOrder === currentOrder
        ) {
            plans.push({
                kind: "choose_order",
                senderId: sergeant.id,
                audienceIds: [],
                recipientIds: [],
                command: currentOrder,
                planningDelayRounds,
                isInvertedDecision: true,
            });
            occupiedSenders.add(sergeant.id);
            return;
        }
        const orderNeedsRefresh =
            sergeant.orderExpiresAfterTurn - round <= 1;
        const tacticalPlanChanged = currentOrder !== proposedOrder;
        const frontNeedsUpdate =
            canChangeOrder &&
            hasFormationFacingChanged(
                sergeant.orderedFormationFacing,
                sergeant.observedFormationFacing,
            );
        const shouldRepeatOrder =
            !tacticalPlanChanged &&
            currentOrder !== null &&
            ((sergeant.orderAssessment === "poor" &&
                assessmentAge <= ORDER_ASSESSMENT_VALID_ROUNDS) ||
                frontNeedsUpdate);
        if (orderNeedsRefresh || tacticalPlanChanged || shouldRepeatOrder) {
            plans.push({
                kind: "vertical_order",
                senderId: sergeant.id,
                audienceIds: living
                    .filter((member) => member.id !== sergeant.id)
                    .map((member) => member.id),
                recipientIds: squad
                    .filter((member) => member.id !== sergeant.id)
                    .map((member) => member.id),
                command: proposedOrder,
                planningDelayRounds,
                isRepeatedOrder:
                    currentOrder !== null && currentOrder === proposedOrder,
                isInvertedDecision:
                    sergeant.invertNextOrderChoice && tacticalPlanChanged,
                soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
                formationFacing:
                    sergeant.observedFormationFacing ??
                    sergeant.orderedFormationFacing ??
                    undefined,
            });
            occupiedSenders.add(sergeant.id);
            return;
        }

        const assessmentIsDue =
            currentOrder !== null &&
            (sergeant.orderAssessment === "unknown" ||
                assessmentAge >= ORDER_ASSESSMENT_VALID_ROUNDS);
        if (assessmentIsDue) {
            plans.push({
                kind: "assess_order",
                senderId: sergeant.id,
                audienceIds: [],
                recipientIds: [],
                command: currentOrder,
                planningDelayRounds,
            });
            occupiedSenders.add(sergeant.id);
        }
    });

    if (round % 4 === 2) {
        const formationKeys = new Set(
            living.map((member) => `${member.team}:${member.profile.lens.id}`),
        );
        formationKeys.forEach((formationKey) => {
            const members = living.filter(
                (member) =>
                    `${member.team}:${member.profile.lens.id}` === formationKey,
            );
            const enemies = living.filter(
                (enemy) => enemy.team !== members[0]?.team,
            );
            const focusTarget = enemies
                .map((enemy) => ({
                    enemy,
                    supporters: members.filter((member) =>
                        areAdjacent(member.position, enemy.position),
                    ),
                }))
                .filter((candidate) => candidate.supporters.length >= 2)
                .sort(
                    (left, right) =>
                        right.supporters.length - left.supporters.length ||
                        OBVIOUS_WOUND_RANK[getObviousWoundState(right.enemy)] -
                            OBVIOUS_WOUND_RANK[getObviousWoundState(left.enemy)] ||
                        left.enemy.id.localeCompare(right.enemy.id),
                )[0];
            const coordinator = focusTarget?.supporters
                .filter(
                    (member) =>
                        !occupiedSenders.has(member.id) &&
                        member.stunnedRounds === 0 &&
                        getSkillPoints(member.profile, "soldier") >=
                            BASIC_SOLDIER_TRAINING_POINTS,
                )
                .sort(
                    (left, right) =>
                        (getSkillLevel(right.profile, "soldier") ?? 0) -
                            (getSkillLevel(left.profile, "soldier") ?? 0) ||
                        left.id.localeCompare(right.id),
                )[0];

            if (!coordinator || !focusTarget) {
                return;
            }
            plans.push({
                kind: "horizontal_focus",
                senderId: coordinator.id,
                audienceIds: living
                    .filter((member) => member.id !== coordinator.id)
                    .map((member) => member.id),
                recipientIds: members
                    .filter((member) => member.id !== coordinator.id)
                    .map((member) => member.id),
                focusTargetId: focusTarget.enemy.id,
                soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
            });
            occupiedSenders.add(coordinator.id);
        });
    }

    return plans;
};
