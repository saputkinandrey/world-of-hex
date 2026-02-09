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
    EncounterWindDirectionReRolledEvent,
} from './events/encounter.events';
import Vector from 'vector2js';
import { ShipEntity } from '../../__entities/ship.entity';
import { ShipToEncounterEntity } from './entities/ship-to-encounter.entity';
import { ShipSpawnedEvent } from './events/ship.events';
import { getActionEvent } from '../../../utils/action-event';
import { randomChoice } from '../../../rps/utils/roll';
import {
    AllDirections,
    Direction,
    DirectionToVectorOdd,
    DirectionTurnLeft,
    DirectionTurnRight,
} from '../../types/direction.type';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';
import { roll3d6UnderWithCrit } from '../../../rps/utils/roll';

type SpawnTacticsOutcome = 'critSuccess' | 'success' | 'failure' | 'critFailure';

@AggregateRootName(EncounterAggregate.name)
export class EncounterAggregate extends AggregateRoot {
    readonly windrose: WindroseEntity = new WindroseEntity();
    readonly ships: ShipToEncounterEntity[] = [];
    radius: number = 0;
    name: string | null = null;
    center: Vector = new Vector(0, 0);

    constructor(id: string) {
        super(id);
        this.windrose.setStreamId(`windrose:${id}`);
        bindChildActions(this, this.windrose, 'windrose');
    }

    @Action(EncounterTurnStartedEvent)
    startTurn() {
        this.ships.forEach((ship) => ship.startTurn());
        return this;
    }

    @Action(EncounterTurnEndedEvent)
    endTurn() {
        this.ships.forEach((ship) => ship.endTurn());
        return this;
    }

    @Action(EncounterTurnAdvancedEvent)
    advanceTurn() {
        this.startTurn();
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

    setCenter(center: Vector) {
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
    moveCenter(center: Vector) {
        const action = getActionEvent(this, EncounterCenterMovedEvent);
        const { center: nextCenter } = action.setNamedArgs({ center });
        return this.setCenter(nextCenter);
    }

    @Action(EncounterWindDirectionReRolledEvent)
    reRollWindDirection(direction?: Direction) {
        const action = getActionEvent(this, EncounterWindDirectionReRolledEvent);
        const { direction: nextDirection } = action.resolveNamedArgs(() => ({
            direction: direction ?? randomChoice(AllDirections),
        }));
        this.windrose.setDirection(nextDirection);
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
        const distance = Math.max(0, this.radius - options.speed);
        const windFrom = this.windrose.direction;
        const tacticsOutcome = options.tacticsRoll ? this.resolveTacticsOutcome(options.tacticsRoll) : undefined;

        if (!options.intent || !windFrom || !tacticsOutcome) {
            return this.spawnFallback(center, distance);
        }

        if (options.intent === ShipEncounterIntent.FLEE) {
            const heading = this.resolveHeadingFromWind(windFrom, tacticsOutcome);
            const position = center.add(DirectionToVectorOdd[heading].mulScalar(distance));
            return { position, direction: heading };
        }

        if (options.intent === ShipEncounterIntent.PURSUE) {
            const heading = this.resolveHeadingFromWind(windFrom, tacticsOutcome);
            const position = center.add(DirectionToVectorOdd[this.oppositeDirection(heading)].mulScalar(distance));
            return { position, direction: heading };
        }

        if (options.intent === ShipEncounterIntent.CIRCLE) {
            const radial = this.resolveHeadingFromWind(windFrom, tacticsOutcome);
            const position = center.add(DirectionToVectorOdd[radial].mulScalar(distance));
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

    private spawnFallback(center: Vector, distance: number) {
        const direction = randomChoice(AllDirections);
        const position = center.add(DirectionToVectorOdd[direction].mulScalar(distance));
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

    hasShipAtPosition(position: Vector): boolean {
        return this.ships.some((ship) => ship.position.equals(position));
    }
}
