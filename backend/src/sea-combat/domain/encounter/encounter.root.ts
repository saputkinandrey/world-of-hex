import { AggregateRoot, AggregateRootName } from '@event-nest/core';
import { WindroseEntity } from './entities/windrose.entity';
import { bindChildActions } from '../../../utils/child-action.decorator';
import { Action } from '../../../utils/event-action.decorator';
import {
    EncounterCenterMovedEvent,
    EncounterRadiusAdjustedEvent,
    EncounterTurnEndedEvent,
    EncounterTurnStartedEvent,
    EncounterWindDirectionReRolledEvent,
} from './events/encounter.events';
import Vector from 'vector2js';
import { ShipEntity } from '../../__entities/ship.entity';
import { ShipToEncounterEntity } from './entities/ship-to-encounter.entity';
import { ShipSpawnedEvent } from './events/ship.events';
import { getActionEvent } from '../../../utils/action-event';
import { randomChoice } from '../../../rps/utils/roll';
import { AllDirections, Direction } from '../../types/direction.type';
import {
    SpawnTacticsOutcome,
    spawnShipAtEncounter,
} from '../../utils/spawn-ship-at-encounter.util';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';
import { roll3d6UnderWithCrit } from '../../../rps/utils/roll';

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
        const { direction: nextDirection } = action.setNamedArgs({
            direction: direction ?? randomChoice(AllDirections),
        });
        this.windrose.setDirection(nextDirection);
        return this;
    }

    @Action(ShipSpawnedEvent)
    spawnShip(ship: ShipEntity, intent?: ShipEncounterIntent | null) {
        const action = getActionEvent(this, ShipSpawnedEvent);
        const tacticsRoll = roll3d6UnderWithCrit(ship.skills.tactics);
        const seamanshipRoll = roll3d6UnderWithCrit(ship.skills.seamanship);
        const tacticsOutcome: SpawnTacticsOutcome = tacticsRoll.isCritSuccess
            ? 'critSuccess'
            : tacticsRoll.isCritFailure
              ? 'critFailure'
              : tacticsRoll.mos >= 0
                ? 'success'
                : 'failure';

        const averageSpeed = ship.speed / 2;
        const startSpeed = seamanshipRoll.isCritSuccess
            ? ship.speed
            : seamanshipRoll.isCritFailure
              ? 0
              : Math.min(
                    ship.speed,
                    Math.max(
                        0,
                        Math.floor(
                            averageSpeed * (1 + seamanshipRoll.mos * 0.1),
                        ),
                    ),
                );

        const { position, direction } = spawnShipAtEncounter({
            radius: this.radius,
            center: this.center,
            intent: intent ?? null,
            windDirection: this.windrose.direction,
            tacticsOutcome,
            speed: startSpeed,
        });

        const {
            position: nextPosition,
            direction: nextDirection,
            speed: nextSpeed,
            intent: nextIntent,
        } = action.setNamedArgs({
            ship,
            position,
            direction,
            speed: startSpeed,
            intent: intent ?? null,
        });
        return this.spawnShipAtPosition(
            ship,
            nextPosition,
            nextDirection,
            nextSpeed,
            nextIntent ?? null,
        );
    }

    spawnShipAtPosition(
        ship: ShipEntity,
        position: Vector,
        direction: Direction,
        speed: number,
        intent?: ShipEncounterIntent | null,
    ) {
        const shipEntity = Object.assign(new ShipToEncounterEntity(), {
            ship,
            shipId: ship.id,
            position,
            intent: intent ?? null,
        });
        shipEntity.setActualSpeed(speed).setActualDirection(direction);
        bindChildActions(
            this,
            shipEntity,
            `ship_${shipEntity.shipId ?? this.ships.length}`,
        );
        this.ships.push(shipEntity);
        return this;
    }

    hasShipAtPosition(position: Vector): boolean {
        return this.ships.some((ship) => ship.position.equals(position));
    }
}
