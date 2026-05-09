import { Direction, DirectionTurnLeft, DirectionTurnRight } from '../types/direction.type';
import {
    PendingShipIntentType,
    type PendingShipBoatswainIntentType,
    type PendingShipHelmsmanIntentType,
} from '../types/pending-intent.type';
import { ShipCaptainTarget, ShipCaptainTargetType } from '../types/ship-captain-target.type';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { distanceBetweenAxialPoints, stepAxialPosition, type AxialPoint } from './hex-coordinate.util';

type CaptainIntentShipSnapshot = {
    shipId: string;
    position: AxialPoint;
    direction: Direction;
    speed: number;
};

type CaptainIntentCandidate = {
    helmsmanIntent: PendingShipHelmsmanIntentType;
    boatswainIntent: PendingShipBoatswainIntentType;
    nextDirection: Direction;
    nextPosition: AxialPoint;
};

const CIRCLE_TURN_PRIORITY_BONUS = 20;
const CIRCLE_SPEED_MATCH_PRIORITY_BONUS = 6;

type ResolvedCaptainTarget = {
    shipId: string | null;
    position: AxialPoint;
    speed: number | null;
};

export type DerivedCaptainShipOrders = {
    captainIntent: ShipEncounterIntent;
    helmsmanIntent: PendingShipHelmsmanIntentType;
    boatswainIntent: PendingShipBoatswainIntentType;
    targetShipId: string | null;
};

export type DeriveCaptainShipOrdersInput = {
    ship: CaptainIntentShipSnapshot;
    otherShips: CaptainIntentShipSnapshot[];
    captainIntent: ShipEncounterIntent;
    target: ShipCaptainTarget;
};

const CAPTAIN_INTENT_CANDIDATE_ORDER: CaptainIntentCandidate[] = [
    {
        helmsmanIntent: PendingShipIntentType.HELMSMAN_FORWARD,
        boatswainIntent: PendingShipIntentType.BOATSWAIN_ACCELERATE,
        nextDirection: Direction.N,
        nextPosition: { q: 0, r: 0 },
    },
    {
        helmsmanIntent: PendingShipIntentType.HELMSMAN_TURN_LEFT,
        boatswainIntent: PendingShipIntentType.BOATSWAIN_ACCELERATE,
        nextDirection: Direction.N,
        nextPosition: { q: 0, r: 0 },
    },
    {
        helmsmanIntent: PendingShipIntentType.HELMSMAN_TURN_RIGHT,
        boatswainIntent: PendingShipIntentType.BOATSWAIN_ACCELERATE,
        nextDirection: Direction.N,
        nextPosition: { q: 0, r: 0 },
    },
    {
        helmsmanIntent: PendingShipIntentType.HELMSMAN_FORWARD,
        boatswainIntent: PendingShipIntentType.BOATSWAIN_HOLD,
        nextDirection: Direction.N,
        nextPosition: { q: 0, r: 0 },
    },
    {
        helmsmanIntent: PendingShipIntentType.HELMSMAN_FORWARD,
        boatswainIntent: PendingShipIntentType.BOATSWAIN_DECELERATE,
        nextDirection: Direction.N,
        nextPosition: { q: 0, r: 0 },
    },
    {
        helmsmanIntent: PendingShipIntentType.HELMSMAN_TURN_LEFT,
        boatswainIntent: PendingShipIntentType.BOATSWAIN_HOLD,
        nextDirection: Direction.N,
        nextPosition: { q: 0, r: 0 },
    },
    {
        helmsmanIntent: PendingShipIntentType.HELMSMAN_TURN_RIGHT,
        boatswainIntent: PendingShipIntentType.BOATSWAIN_HOLD,
        nextDirection: Direction.N,
        nextPosition: { q: 0, r: 0 },
    },
];

const buildCaptainIntentCandidates = (ship: CaptainIntentShipSnapshot): CaptainIntentCandidate[] => {
    return CAPTAIN_INTENT_CANDIDATE_ORDER.filter((candidate) => {
        if (ship.speed < 1) {
            return candidate.helmsmanIntent === PendingShipIntentType.HELMSMAN_FORWARD;
        }

        return true;
    }).map((candidate) => {
        const nextDirection =
            candidate.helmsmanIntent === PendingShipIntentType.HELMSMAN_TURN_LEFT
                ? DirectionTurnLeft[ship.direction]
                : candidate.helmsmanIntent === PendingShipIntentType.HELMSMAN_TURN_RIGHT
                  ? DirectionTurnRight[ship.direction]
                  : ship.direction;

        return {
            ...candidate,
            nextDirection,
            nextPosition: stepAxialPosition(ship.position, nextDirection),
        };
    });
};

const compareCaptainIntentCandidatePriority = (left: CaptainIntentCandidate, right: CaptainIntentCandidate) => {
    const helmsmanOrder: PendingShipHelmsmanIntentType[] = [
        PendingShipIntentType.HELMSMAN_FORWARD,
        PendingShipIntentType.HELMSMAN_TURN_LEFT,
        PendingShipIntentType.HELMSMAN_TURN_RIGHT,
    ];
    const boatswainOrder: PendingShipBoatswainIntentType[] = [
        PendingShipIntentType.BOATSWAIN_ACCELERATE,
        PendingShipIntentType.BOATSWAIN_HOLD,
        PendingShipIntentType.BOATSWAIN_DECELERATE,
    ];

    return (
        helmsmanOrder.indexOf(left.helmsmanIntent) - helmsmanOrder.indexOf(right.helmsmanIntent) ||
        boatswainOrder.indexOf(left.boatswainIntent) - boatswainOrder.indexOf(right.boatswainIntent)
    );
};

const resolveNearestShipTarget = (
    ship: CaptainIntentShipSnapshot,
    otherShips: CaptainIntentShipSnapshot[],
): ResolvedCaptainTarget | null => {
    const nearestShip = otherShips
        .slice()
        .sort(
            (left, right) =>
                distanceBetweenAxialPoints(ship.position, left.position) -
                    distanceBetweenAxialPoints(ship.position, right.position) ||
                left.shipId.localeCompare(right.shipId),
        )[0];

    if (!nearestShip) {
        return null;
    }

    return {
        shipId: nearestShip.shipId,
        position: nearestShip.position,
        speed: nearestShip.speed,
    };
};

const resolveEnemyCenterOfMassTarget = (otherShips: CaptainIntentShipSnapshot[]): ResolvedCaptainTarget | null => {
    if (otherShips.length === 0) {
        return null;
    }

    const total = otherShips.reduce(
        (accumulator, ship) => ({
            q: accumulator.q + ship.position.q,
            r: accumulator.r + ship.position.r,
            speed: accumulator.speed + ship.speed,
        }),
        { q: 0, r: 0, speed: 0 },
    );

    return {
        shipId: null,
        position: {
            q: total.q / otherShips.length,
            r: total.r / otherShips.length,
        },
        speed: total.speed / otherShips.length,
    };
};

const resolveCaptainTarget = (input: DeriveCaptainShipOrdersInput): ResolvedCaptainTarget | null => {
    switch (input.target.type) {
        case ShipCaptainTargetType.SPECIFIC_SHIP: {
            const targetShip = input.otherShips.find((ship) => ship.shipId === input.target.shipId);
            if (targetShip) {
                return {
                    shipId: targetShip.shipId,
                    position: targetShip.position,
                    speed: targetShip.speed,
                };
            }

            return resolveNearestShipTarget(input.ship, input.otherShips);
        }
        case ShipCaptainTargetType.ENEMY_CENTER_OF_MASS:
            return (
                resolveEnemyCenterOfMassTarget(input.otherShips) ??
                resolveNearestShipTarget(input.ship, input.otherShips)
            );
        case ShipCaptainTargetType.NEAREST_ENEMY:
        default:
            return resolveNearestShipTarget(input.ship, input.otherShips);
    }
};

const scoreCaptainIntentCandidate = (
    candidate: CaptainIntentCandidate,
    shipSpeed: number,
    targetSpeed: number | null,
    currentDistance: number,
    targetPosition: AxialPoint,
    captainIntent: ShipEncounterIntent,
) => {
    const nextDistance = distanceBetweenAxialPoints(candidate.nextPosition, targetPosition);

    if (captainIntent === ShipEncounterIntent.FLEE) {
        return nextDistance * 100;
    }

    if (captainIntent === ShipEncounterIntent.PURSUE) {
        return -nextDistance * 100;
    }

    const distanceDrift = Math.abs(nextDistance - currentDistance);
    const turnBias =
        candidate.helmsmanIntent === PendingShipIntentType.HELMSMAN_FORWARD ? 0 : CIRCLE_TURN_PRIORITY_BONUS;
    const shouldGainSpeed = targetSpeed == null ? shipSpeed < 1 : shipSpeed < targetSpeed;
    const shouldLoseSpeed = targetSpeed != null && shipSpeed > targetSpeed;
    const speedBias = shouldGainSpeed
        ? candidate.boatswainIntent === PendingShipIntentType.BOATSWAIN_ACCELERATE
            ? CIRCLE_SPEED_MATCH_PRIORITY_BONUS
            : candidate.boatswainIntent === PendingShipIntentType.BOATSWAIN_HOLD
              ? 1
              : -4
        : shouldLoseSpeed
          ? candidate.boatswainIntent === PendingShipIntentType.BOATSWAIN_DECELERATE
              ? CIRCLE_SPEED_MATCH_PRIORITY_BONUS
              : candidate.boatswainIntent === PendingShipIntentType.BOATSWAIN_HOLD
                ? 2
                : -1
          : candidate.boatswainIntent === PendingShipIntentType.BOATSWAIN_HOLD
            ? 2
            : candidate.boatswainIntent === PendingShipIntentType.BOATSWAIN_ACCELERATE
              ? 1
              : 0;

    return -distanceDrift * 100 + turnBias + speedBias;
};

const resolveDefaultCaptainShipOrders = (
    captainIntent: ShipEncounterIntent,
    shipSpeed: number,
    targetSpeed: number | null,
): Pick<DerivedCaptainShipOrders, 'helmsmanIntent' | 'boatswainIntent'> => {
    switch (captainIntent) {
        case ShipEncounterIntent.FLEE:
        case ShipEncounterIntent.PURSUE:
            return {
                helmsmanIntent: PendingShipIntentType.HELMSMAN_FORWARD,
                boatswainIntent: PendingShipIntentType.BOATSWAIN_ACCELERATE,
            };
        case ShipEncounterIntent.CIRCLE:
            return {
                helmsmanIntent:
                    shipSpeed < 1 ? PendingShipIntentType.HELMSMAN_FORWARD : PendingShipIntentType.HELMSMAN_TURN_LEFT,
                boatswainIntent: (targetSpeed == null ? shipSpeed < 1 : shipSpeed < targetSpeed)
                    ? PendingShipIntentType.BOATSWAIN_ACCELERATE
                    : PendingShipIntentType.BOATSWAIN_HOLD,
            };
        default:
            throw new Error(`Unsupported captain intent ${captainIntent}`);
    }
};

export const deriveCaptainShipOrders = (input: DeriveCaptainShipOrdersInput): DerivedCaptainShipOrders => {
    const resolvedTarget = resolveCaptainTarget(input);

    if (!resolvedTarget) {
        return {
            captainIntent: input.captainIntent,
            targetShipId: null,
            ...resolveDefaultCaptainShipOrders(input.captainIntent, input.ship.speed, null),
        };
    }

    const currentDistance = distanceBetweenAxialPoints(input.ship.position, resolvedTarget.position);
    const candidate = buildCaptainIntentCandidates(input.ship)
        .slice()
        .sort(
            (left, right) =>
                scoreCaptainIntentCandidate(
                    right,
                    input.ship.speed,
                    resolvedTarget.speed,
                    currentDistance,
                    resolvedTarget.position,
                    input.captainIntent,
                ) -
                    scoreCaptainIntentCandidate(
                        left,
                        input.ship.speed,
                        resolvedTarget.speed,
                        currentDistance,
                        resolvedTarget.position,
                        input.captainIntent,
                    ) || compareCaptainIntentCandidatePriority(left, right),
        )[0];

    if (!candidate) {
        return {
            captainIntent: input.captainIntent,
            targetShipId: resolvedTarget.shipId,
            ...resolveDefaultCaptainShipOrders(input.captainIntent, input.ship.speed, resolvedTarget.speed),
        };
    }

    return {
        captainIntent: input.captainIntent,
        targetShipId: resolvedTarget.shipId,
        helmsmanIntent: candidate.helmsmanIntent,
        boatswainIntent: candidate.boatswainIntent,
    };
};
