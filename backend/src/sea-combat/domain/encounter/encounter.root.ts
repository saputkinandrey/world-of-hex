import { AggregateRoot, AggregateRootName } from '@event-nest/core';
import { WindroseEntity } from './entities/windrose.entity';
import { bindChildActions } from '../../../utils/child-action.decorator';
import { Action } from '../../../utils/event-action.decorator';
import { EncounterTurnEndedEvent, EncounterTurnStartedEvent } from './events/encounter.events';
import Vector from 'vector2js';
import { ShipEntity } from '../../__entities/ship.entity';
import { ShipToEncounterEntity } from './entities/ship-to-encounter.entity';
import { ShipSpawnedEvent } from './events/ship.events';

@AggregateRootName(EncounterAggregate.name)
export class EncounterAggregate extends AggregateRoot {
    readonly windrose: WindroseEntity = new WindroseEntity();
    readonly ships: ShipToEncounterEntity[] = [];

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

    @Action(ShipSpawnedEvent)
    spawnShipAtPosition(ship: ShipEntity, position: Vector) {
        const shipEntity = Object.assign(new ShipToEncounterEntity(), {
            ship,
            shipId: ship.id,
            position,
        });
        bindChildActions(this, shipEntity, `ship_${shipEntity.shipId ?? this.ships.length}`);
        this.ships.push(shipEntity);
        return this;
    }

    hasShipAtPosition(position: Vector): boolean {
        return this.ships.some((ship) => ship.position.equals(position));
    }
}
