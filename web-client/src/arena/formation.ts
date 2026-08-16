import { ARENA_CELL_BY_KEY, NEIGHBOR_OFFSETS, SQRT_3, areAdjacent, distanceBetween, getDistanceMeters, getNeighbors, toKey, toMeters } from "./arena";
import { getSkillPoints } from "./fighter-generation";
import { HUMAN_BASE_ATTRIBUTES } from "./fighter-catalog";
import { getObviousWoundState } from "./combat-observation";
import { CartesianPoint, Combatant, CommandKind, CommandScore, FormationContext, FormationRoleAssignment, HexCoord, HoldPositionAssessment } from "./model";
import { CALM_COMMUNICATION_HEARING_PENALTY, PENETRATING_VOICE_HEARING_BONUS, SHOUT_HEARING_BONUS, getHearingDistanceModifier } from "./perception";
import { getSoldierSpecialization, hasAdvantage } from "./scenario";

export const FORMATION_CONTACT_DISTANCE_HEXES = 3;

export const BASIC_SOLDIER_TRAINING_POINTS = 1;

export const SIMPLE_FORMATION_RADIUS_HEXES = 2;

export const UNTUNED_FORMATION_RADIUS_HEXES = 3;

export const getFormationContext = (
    actor: Combatant,
    combatants: Combatant[],
): FormationContext | null => {
    if (
        getSkillPoints(actor.profile, "soldier") < BASIC_SOLDIER_TRAINING_POINTS
    ) {
        return null;
    }

    const squadMembers = combatants.filter(
        (member) =>
            member.health > 0 &&
            member.team === actor.team &&
            member.profile.lens.id === actor.profile.lens.id,
    );
    const sergeant = squadMembers.find((member) => member.profile.commandLens);
    if (!sergeant) {
        return null;
    }

    return {
        sergeant,
        squadMembers,
    };
};

export const getFormationRadius = (actor: Combatant): number => {
    const specializationMatches = actor.receivedOrderSpecialization
        ? getSkillPoints(
              actor.profile,
              "soldier",
              actor.receivedOrderSpecialization,
          ) >= BASIC_SOLDIER_TRAINING_POINTS
        : getSoldierSpecialization(actor) !== null;

    return specializationMatches
        ? SIMPLE_FORMATION_RADIUS_HEXES
        : UNTUNED_FORMATION_RADIUS_HEXES;
};

export const getCohesionOutliers = (context: FormationContext): Combatant[] =>
    context.squadMembers
        .filter(
            (member) =>
                member.id !== context.sergeant.id &&
                distanceBetween(member.position, context.sergeant.position) >
                    SIMPLE_FORMATION_RADIUS_HEXES,
        )
        .sort(
            (left, right) =>
                distanceBetween(context.sergeant.position, right.position) -
                    distanceBetween(context.sergeant.position, left.position) ||
                left.id.localeCompare(right.id),
        );

export const getCalmCommandHearingTarget = (
    sergeant: Combatant,
    recipient: Combatant,
): number =>
    HUMAN_BASE_ATTRIBUTES.IQ +
    SHOUT_HEARING_BONUS +
    (hasAdvantage(sergeant, "penetrating_voice")
        ? PENETRATING_VOICE_HEARING_BONUS
        : 0) +
    CALM_COMMUNICATION_HEARING_PENALTY +
    getHearingDistanceModifier(
        getDistanceMeters(sergeant.position, recipient.position),
    );

export const getFormationRoleAssignment = (
    actor: Combatant,
    localContactFacing: CartesianPoint | null = null,
): FormationRoleAssignment => {
    return {
        role: actor.formationRole,
        facing:
            localContactFacing ??
            actor.orderedFormationFacing ??
            actor.observedFormationFacing,
    };
};

const getCombatantCenter = (combatants: Combatant[]): CartesianPoint => {
    const positions = combatants.map((combatant) =>
        toMeters(combatant.position),
    );
    return {
        x:
            positions.reduce((total, position) => total + position.x, 0) /
            positions.length,
        y:
            positions.reduce((total, position) => total + position.y, 0) /
            positions.length,
    };
};

export const getLocalFormationContactFacing = (
    context: FormationContext,
    enemies: Combatant[],
): CartesianPoint | null => {
    const contactEnemies = enemies.filter((enemy) =>
        context.squadMembers.some(
            (member) =>
                distanceBetween(member.position, enemy.position) <=
                Math.max(member.weaponReach, enemy.weaponReach),
        ),
    );
    if (contactEnemies.length === 0) {
        return null;
    }

    const squadCenter = getCombatantCenter(context.squadMembers);
    const enemyCenter = getCombatantCenter(contactEnemies);
    const facing = {
        x: enemyCenter.x - squadCenter.x,
        y: enemyCenter.y - squadCenter.y,
    };
    return facing.x === 0 && facing.y === 0 ? null : facing;
};

export const sergeantHasEnemyContact = (
    context: FormationContext,
    enemies: Combatant[],
): boolean =>
    enemies.some(
        (enemy) =>
            distanceBetween(context.sergeant.position, enemy.position) <=
            FORMATION_CONTACT_DISTANCE_HEXES,
    );

export const getForwardHexOffset = (facing: CartesianPoint): HexCoord =>
    [...NEIGHBOR_OFFSETS].sort((left, right) => {
        const leftDirection = toMeters(left);
        const rightDirection = toMeters(right);
        const leftAlignment =
            facing.x * leftDirection.x + facing.y * leftDirection.y;
        const rightAlignment =
            facing.x * rightDirection.x + facing.y * rightDirection.y;
        return rightAlignment - leftAlignment;
    })[0];

export const countAlliesDirectlyAhead = (
    position: HexCoord,
    allies: Combatant[],
    facing: CartesianPoint | null,
): number => {
    if (!facing) {
        return 0;
    }
    const forwardOffset = getForwardHexOffset(facing);
    return allies.filter((ally) => {
        const deltaQ = ally.position.q - position.q;
        const deltaR = ally.position.r - position.r;
        const forwardDistance =
            forwardOffset.q !== 0
                ? deltaQ / forwardOffset.q
                : deltaR / forwardOffset.r;
        return (
            Number.isInteger(forwardDistance) &&
            forwardDistance > 0 &&
            deltaQ === forwardOffset.q * forwardDistance &&
            deltaR === forwardOffset.r * forwardDistance
        );
    }).length;
};

export const assessHoldPosition = (
    actor: Combatant,
    position: HexCoord,
    formationAllies: Combatant[],
    teamAllies: Combatant[],
    enemies: Combatant[],
    assignment: FormationRoleAssignment,
): HoldPositionAssessment => {
    const adjacentAllies = formationAllies.filter((ally) =>
        areAdjacent(position, ally.position),
    );
    const attackableEnemies = enemies.filter(
        (enemy) => distanceBetween(position, enemy.position) <= actor.weaponReach,
    );
    const threateningEnemies = enemies.filter(
        (enemy) => distanceBetween(position, enemy.position) <= enemy.weaponReach,
    );
    const supportedThreatenedAllies = adjacentAllies.filter((ally) => {
        const allyThreats = enemies.filter(
            (enemy) =>
                distanceBetween(ally.position, enemy.position) <=
                enemy.weaponReach,
        );
        return allyThreats.some(
            (enemy) =>
                distanceBetween(position, enemy.position) <= actor.weaponReach,
        );
    });
    const getSideCrossProduct = (neighbor: Combatant): number => {
        if (!assignment.facing) {
            return 0;
        }
        const positionMeters = toMeters(position);
        const neighborMeters = toMeters(neighbor.position);
        const neighborDirection = {
            x: neighborMeters.x - positionMeters.x,
            y: neighborMeters.y - positionMeters.y,
        };
        return (
            assignment.facing.x * neighborDirection.y -
            assignment.facing.y * neighborDirection.x
        );
    };
    const isLateralConnection = (neighbor: Combatant): boolean => {
        if (!assignment.facing) {
            return true;
        }
        const positionMeters = toMeters(position);
        const neighborMeters = toMeters(neighbor.position);
        const neighborDirection = {
            x: neighborMeters.x - positionMeters.x,
            y: neighborMeters.y - positionMeters.y,
        };
        const forwardAlignment =
            assignment.facing.x * neighborDirection.x +
            assignment.facing.y * neighborDirection.y;
        return (
            Math.abs(getSideCrossProduct(neighbor)) >=
            Math.abs(forwardAlignment) * SQRT_3
        );
    };
    const leftConnections = adjacentAllies.filter(
        (ally) =>
            isLateralConnection(ally) &&
            (!assignment.facing || getSideCrossProduct(ally) < 0),
    );
    const rightConnections = adjacentAllies.filter(
        (ally) =>
            isLateralConnection(ally) &&
            (!assignment.facing || getSideCrossProduct(ally) >= 0),
    );
    const innerConnections =
        assignment.role === "left_flanker"
            ? rightConnections
            : assignment.role === "right_flanker"
              ? leftConnections
              : [];
    const usesTwoSidedConnections =
        assignment.role === "frontliner" ||
        assignment.role === "line_fighter";
    const roleConnections =
        !assignment.facing
            ? Math.min(
                  usesTwoSidedConnections ? 2 : 1,
                  adjacentAllies.length,
              )
            : usesTwoSidedConnections
            ? Number(leftConnections.length > 0) +
              Number(rightConnections.length > 0)
            : Number(innerConnections.length > 0);
    const preferredRoleConnections = innerConnections.filter(
        (ally) => ally.formationRole === "line_fighter",
    ).length;
    const alliesDirectlyAhead =
        assignment.role === "frontliner"
            ? countAlliesDirectlyAhead(
                  position,
                  teamAllies,
                  assignment.facing,
              )
            : 0;

    return {
        position,
        alliesDirectlyAhead,
        roleConnections,
        preferredRoleConnections,
        supportedSurroundedAllies: supportedThreatenedAllies.filter((ally) => {
            const allyThreatCount = enemies.filter(
                (enemy) =>
                    distanceBetween(ally.position, enemy.position) <=
                    enemy.weaponReach,
            ).length;
            return allyThreatCount >= 2;
        }).length,
        supportedThreatenedAllies: supportedThreatenedAllies.length,
        adjacentAllies: Math.min(2, adjacentAllies.length),
        attackableEnemies: attackableEnemies.length,
        threateningEnemies: threateningEnemies.length,
        distanceToClosestEnemy:
            enemies.length > 0
                ? Math.min(
                      ...enemies.map((enemy) =>
                          distanceBetween(position, enemy.position),
                      ),
                  )
                : 0,
        distanceToClosestAlly:
            formationAllies.length > 0
                ? Math.min(
                      ...formationAllies.map((ally) =>
                          distanceBetween(position, ally.position),
                      ),
                  )
                : 0,
        movementDistance: distanceBetween(actor.position, position),
    };
};

export const compareHoldPositions = (
    left: HoldPositionAssessment,
    right: HoldPositionAssessment,
): number =>
    left.alliesDirectlyAhead - right.alliesDirectlyAhead ||
    right.roleConnections - left.roleConnections ||
    right.preferredRoleConnections - left.preferredRoleConnections ||
    Number(right.attackableEnemies > 0) -
        Number(left.attackableEnemies > 0) ||
    right.supportedSurroundedAllies - left.supportedSurroundedAllies ||
    right.supportedThreatenedAllies - left.supportedThreatenedAllies ||
    right.adjacentAllies - left.adjacentAllies ||
    left.threateningEnemies - right.threateningEnemies ||
    left.distanceToClosestEnemy - right.distanceToClosestEnemy ||
    left.distanceToClosestAlly - right.distanceToClosestAlly ||
    left.movementDistance - right.movementDistance ||
    toKey(left.position).localeCompare(toKey(right.position));

export const chooseHoldFormationPosition = (
    actor: Combatant,
    context: FormationContext,
    teamAllies: Combatant[],
    enemies: Combatant[],
    blocked: Set<string>,
): HexCoord => {
    const allies = context.squadMembers.filter((ally) => ally.id !== actor.id);
    const assignment = getFormationRoleAssignment(
        actor,
        getLocalFormationContactFacing(context, enemies),
    );
    const candidates = [actor.position, ...getNeighbors(actor.position)].filter(
        (candidate) => {
            const key = toKey(candidate);
            return (
                ARENA_CELL_BY_KEY.has(key) &&
                (key === toKey(actor.position) || !blocked.has(key))
            );
        },
    );
    const assessments = candidates.map((candidate) =>
        assessHoldPosition(
            actor,
            candidate,
            allies,
            teamAllies,
            enemies,
            assignment,
        ),
    );

    return [...assessments].sort(compareHoldPositions)[0]?.position ?? actor.position;
};

export const chooseCommand = (
    sergeant: Combatant,
    squad: Combatant[],
    enemies: Combatant[],
    invertCriteria = false,
): CommandKind => {
    const visiblyWounded = squad.filter(
        (member) => getObviousWoundState(member) !== "unhurt",
    ).length;
    const visiblyBadlyWounded = squad.filter(
        (member) => getObviousWoundState(member) === "badly_wounded",
    ).length;
    const engagedCount = squad.filter((member) =>
        enemies.some((enemy) => areAdjacent(member.position, enemy.position)),
    ).length;
    const closestEnemyDistance = Math.min(
        ...enemies.map((enemy) => distanceBetween(sergeant.position, enemy.position)),
    );
    const healthEmergency =
        visiblyBadlyWounded > 0 &&
        visiblyWounded >= Math.ceil(squad.length / 2);
    const isEngaged = engagedCount > 0;
    const enemyIsClose = closestEnemyDistance <= 3;
    const scores: CommandScore[] = [
        {
            command: "advance",
            score: healthEmergency
                ? -60
                : !isEngaged && !enemyIsClose
                  ? 100
                  : -50,
        },
        {
            command: "press",
            score: healthEmergency
                ? -100
                : isEngaged && visiblyWounded < Math.ceil(squad.length / 3)
                  ? 100
                  : -40,
        },
        {
            command: "hold",
            score: healthEmergency
                ? -20
                : (isEngaged &&
                      visiblyWounded >= Math.ceil(squad.length / 3)) ||
                    (!isEngaged && enemyIsClose)
                  ? 100
                  : 0,
        },
        {
            command: "withdraw",
            score: healthEmergency ? 100 : -100,
        },
    ];

    return scores.reduce((selected, candidate) => {
        const candidateIsBetter = invertCriteria
            ? candidate.score < selected.score
            : candidate.score > selected.score;
        return candidateIsBetter ? candidate : selected;
    }).command;
};
