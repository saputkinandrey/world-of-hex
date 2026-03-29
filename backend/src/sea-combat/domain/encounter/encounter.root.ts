import { AggregateRoot, AggregateRootName } from '@event-nest/core';
import { WindroseEntity } from './entities/windrose.entity';
import { bindChildActions } from '../../../utils/child-action.decorator';
import { Action } from '../../../utils/event-action.decorator';
import {
    EncounterCenterMovedEvent,
    EncounterRadiusAdjustedEvent,
    EncounterTurnEndedEvent,
    EncounterTurnAdvancedEvent,
    EncounterTurnStartedEvent,
} from './events/encounter.events';
import { ShipEntity } from '../../__entities/ship.entity';
import { ShipToEncounterEntity } from './entities/ship-to-encounter.entity';
import { ShipSpawnedEvent } from './events/ship.events';
import { getActionEvent } from '../../../utils/action-event';
import { randomChoice } from '../../../rps/utils/roll';
import { AllDirections, Direction, DirectionTurnLeft, DirectionTurnRight } from '../../types/direction.type';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';
import { roll3d6UnderWithCrit } from '../../../rps/utils/roll';
import type { AxialPoint } from '../../utils/hex-coordinate.util';
import {
    distanceBetweenAxialPoints,
    moveAxialPosition,
    sameAxialPoint,
    stepAxialPosition,
} from '../../utils/hex-coordinate.util';

type SpawnTacticsOutcome = 'critSuccess' | 'success' | 'failure' | 'critFailure';
type ShipTurnPath = {
    ship: ShipToEncounterEntity;
    path: AxialPoint[];
    currentStep: number;
    hasCollided: boolean;
};

@AggregateRootName(EncounterAggregate.name)
export class EncounterAggregate extends AggregateRoot {
    readonly windrose: WindroseEntity = new WindroseEntity();
    readonly ships: ShipToEncounterEntity[] = [];
    radius: number = 0;
    name: string | null = null;
    center: AxialPoint = { q: 0, r: 0 };

    constructor(id: string) {
        super(id);
        this.windrose.setStreamId(`windrose:${id}`);
        bindChildActions(this, this.windrose, 'windrose');
    }

    @Action(EncounterTurnStartedEvent)
    startTurn() {
        const action = getActionEvent(this, EncounterTurnStartedEvent);
        action.setNamedArgs({});
        this.ships.forEach((ship) => ship.startTurn());
        return this;
    }

    @Action(EncounterTurnEndedEvent)
    endTurn() {
        const action = getActionEvent(this, EncounterTurnEndedEvent);
        action.setNamedArgs({});
        this.ships.forEach((ship) => ship.endTurn());
        return this;
    }

    @Action(EncounterTurnAdvancedEvent)
    advanceTurn() {
        const action = getActionEvent(this, EncounterTurnAdvancedEvent);
        action.setNamedArgs({});
        this.startTurn();
        this.resolveShipMovements();
        this.endTurn();
        return this;
    }

    setRadius(radius: number) {
        this.radius = radius;
        return this;
    }

    setName(name: string | null) {
        this.name = name;
        return this;
    }

    setCenter(center: AxialPoint) {
        this.center = center;
        return this;
    }

    @Action(EncounterRadiusAdjustedEvent)
    adjustRadius(radius: number) {
        const action = getActionEvent(this, EncounterRadiusAdjustedEvent);
        const { radius: nextRadius } = action.setNamedArgs({ radius });
        return this.setRadius(nextRadius);
    }

    @Action(EncounterCenterMovedEvent)
    moveCenter(center: AxialPoint) {
        const action = getActionEvent(this, EncounterCenterMovedEvent);
        const { center: nextCenter } = action.setNamedArgs({ center });
        return this.setCenter(nextCenter);
    }

    reRollWindDirection(direction?: Direction) {
        this.windrose.reRollWindDirection(direction);
        return this;
    }

    @Action(ShipSpawnedEvent)
    spawnShip(inputShip: ShipEntity, inputIntent?: ShipEncounterIntent | null) {
        const action = getActionEvent(this, ShipSpawnedEvent);
        const normalizedIntent = inputIntent ?? null;

        const { ship, intent } = action.setNamedArgs({
            ship: inputShip,
            intent: normalizedIntent,
        });
        const { seamanshipRoll, tacticsRoll } = action.setNamedArgs({
            seamanshipRoll: ship.rollSkill('seamanship'),
            tacticsRoll: ship.rollSkill('tactics'),
        });
        const { speed } = action.setNamedArgs({
            speed: ship.resolveStartSpeed(seamanshipRoll),
        });
        const spawn = this.spawnShipAtEncounter({
            intent,
            tacticsRoll,
            speed,
        });
        const { position, direction } = action.setNamedArgs({
            position: spawn.position,
            direction: spawn.direction,
        });

        const shipEntity = Object.assign(new ShipToEncounterEntity(), {
            ship,
            shipId: ship.id,
            position,
            intent,
        });
        shipEntity.setActualSpeed(speed).setActualDirection(direction);
        bindChildActions(this, shipEntity, `ship_${shipEntity.shipId ?? this.ships.length}`);
        this.ships.push(shipEntity);
        return this;
    }

    private resolveTacticsOutcome(tacticsRoll: ReturnType<typeof roll3d6UnderWithCrit>): SpawnTacticsOutcome {
        if (tacticsRoll.isCritSuccess) {
            return 'critSuccess';
        }
        if (tacticsRoll.isCritFailure) {
            return 'critFailure';
        }
        return tacticsRoll.mos >= 0 ? 'success' : 'failure';
    }

    private spawnShipAtEncounter(options: {
        intent: ShipEncounterIntent | null;
        tacticsRoll?: ReturnType<typeof roll3d6UnderWithCrit>;
        speed: number;
    }) {
        const center = this.center;
        const distance = this.resolveSpawnDistance(options.speed);
        const windFrom = this.windrose.direction;
        const tacticsOutcome = options.tacticsRoll ? this.resolveTacticsOutcome(options.tacticsRoll) : undefined;

        if (!options.intent || !windFrom || !tacticsOutcome) {
            return this.spawnFallback(center, distance);
        }

        if (options.intent === ShipEncounterIntent.FLEE) {
            const heading = this.resolveHeadingFromWind(windFrom, tacticsOutcome);
            const position = moveAxialPosition(center, heading, distance);
            return { position, direction: heading };
        }

        if (options.intent === ShipEncounterIntent.PURSUE) {
            const heading = this.resolveHeadingFromWind(windFrom, tacticsOutcome);
            const position = moveAxialPosition(center, this.oppositeDirection(heading), distance);
            return { position, direction: heading };
        }

        if (options.intent === ShipEncounterIntent.CIRCLE) {
            const radial = this.resolveHeadingFromWind(windFrom, tacticsOutcome);
            const position = moveAxialPosition(center, radial, distance);
            const left = this.turnLeft(radial);
            const right = this.turnRight(radial);

            const leftRank = this.windRelationRank(left, windFrom);
            const rightRank = this.windRelationRank(right, windFrom);
            const isPositive = tacticsOutcome === 'critSuccess' || tacticsOutcome === 'success';
            const direction = isPositive
                ? leftRank >= rightRank
                    ? left
                    : right
                : leftRank <= rightRank
                  ? left
                  : right;

            return { position, direction };
        }

        return this.spawnFallback(center, distance);
    }

    private resolveSpawnDistance(speed: number) {
        const safeDistance = Math.max(0, this.radius - speed);
        const cappedDistance = this.radius > 0 ? Math.max(1, Math.floor(this.radius * 0.75)) : 0;

        return Math.min(safeDistance, cappedDistance);
    }

    private spawnFallback(center: AxialPoint, distance: number) {
        const direction = randomChoice(AllDirections);
        const position = moveAxialPosition(center, direction, distance);
        return { position, direction };
    }

    private turnLeft(direction: Direction, times: number = 1) {
        let current = direction;
        for (let i = 0; i < times; i++) {
            current = DirectionTurnLeft[current];
        }
        return current;
    }

    private turnRight(direction: Direction, times: number = 1) {
        let current = direction;
        for (let i = 0; i < times; i++) {
            current = DirectionTurnRight[current];
        }
        return current;
    }

    private oppositeDirection(direction: Direction) {
        return this.turnLeft(direction, 3);
    }

    private chooseSide(direction: Direction) {
        return randomChoice([this.turnLeft(direction), this.turnRight(direction)]);
    }

    private windRelationRank(heading: Direction, windFrom: Direction) {
        const tailwind = this.oppositeDirection(windFrom);
        if (heading === tailwind) return 3;
        if (heading === this.turnLeft(tailwind) || heading === this.turnRight(tailwind)) return 2;
        if (heading === this.turnLeft(windFrom) || heading === this.turnRight(windFrom)) return 1;
        return 0;
    }

    private resolveHeadingFromWind(windFrom: Direction, outcome: SpawnTacticsOutcome) {
        const tailwind = this.oppositeDirection(windFrom);
        const headwind = windFrom;
        const sideBehind = this.chooseSide(tailwind);
        const sideAhead = this.chooseSide(headwind);

        switch (outcome) {
            case 'critSuccess':
                return tailwind;
            case 'success':
                return sideBehind;
            case 'critFailure':
                return headwind;
            case 'failure':
            default:
                return sideAhead;
        }
    }

    hasShipAtPosition(position: AxialPoint): boolean {
        return this.ships.some((ship) => sameAxialPoint(ship.position, position));
    }

    private resolveShipMovements() {
        if (this.ships.length === 0) {
            return;
        }

        const paths = this.ships.map((ship) => this.buildShipTurnPath(ship));
        this.applyCollisionStops(paths);

        paths.forEach((path) => {
            const finalPosition = path.path[path.currentStep] ?? path.path[path.path.length - 1];
            path.ship.moveTo(finalPosition);
        });
    }

    private buildShipTurnPath(ship: ShipToEncounterEntity): ShipTurnPath {
        const path: AxialPoint[] = [{ ...ship.position }];
        let currentPosition = { ...ship.position };
        const speed = Math.max(0, ship.actualSpeed ?? 0);

        for (let i = 0; i < speed; i += 1) {
            const nextPosition = stepAxialPosition(currentPosition, ship.actualDirection);
            if (distanceBetweenAxialPoints(nextPosition, this.center) > this.radius) {
                break;
            }
            path.push(nextPosition);
            currentPosition = nextPosition;
        }

        return {
            ship,
            path,
            currentStep: 0,
            hasCollided: false,
        };
    }

    private applyCollisionStops(paths: ShipTurnPath[]) {
        if (paths.length === 0) {
            return;
        }

        const longestPath = Math.max(...paths.map((path) => path.path.length));
        let elapsedTime = 0;

        for (let i = 0; i < longestPath; i += 1) {
            elapsedTime += 1 / longestPath;
            const currentPositions = new Map<string, { shipIds: string[]; position: AxialPoint }>();

            paths.forEach((path) => {
                if (path.hasCollided) {
                    return;
                }

                const shipStepTime = 1 / path.path.length;
                const currentStep = Math.min(path.path.length - 1, Math.floor(elapsedTime / shipStepTime));
                const position = path.path[currentStep];
                const hash = `${position.q},${position.r}`;
                const entry = currentPositions.get(hash);
                path.currentStep = currentStep;

                if (entry) {
                    entry.shipIds.push(path.ship.shipId);
                    return;
                }

                currentPositions.set(hash, {
                    shipIds: [path.ship.shipId],
                    position,
                });
            });

            currentPositions.forEach(({ shipIds }) => {
                if (shipIds.length < 2) {
                    return;
                }

                paths.forEach((path) => {
                    if (shipIds.includes(path.ship.shipId)) {
                        path.hasCollided = true;
                    }
                });
            });
        }
    }
}
