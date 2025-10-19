import { ShipToEncounterEntity } from '../../__entities/ship-to-encounter.entity';
import Vector from 'vector2js';

import { AggregateRoot, AggregateRootName, ApplyEvent } from '@event-nest/core';
import {
  ShipSpawnedEvent,
  WindroseReRollDirectionEvent,
  WindroseSetDirectionEvent,
  WindroseTurnLeftEvent,
  WindroseTurnRightEvent,
} from './events/events';
import { randomChoice } from '../../../rps/utils/roll';
import { AllDirections } from '../../types/direction.type';
import { ShipEntity } from '../../__entities/ship.entity';
import { WindroseEntity } from './entities/windrose.model';

@AggregateRootName(EncounterRoot.name)
export class EncounterRoot extends AggregateRoot {
  ships: ShipToEncounterEntity[] = [];

  windrose: WindroseEntity = new WindroseEntity();

  createdAt: Date = new Date();

  updatedAt: Date;

  deletedAt: Date;

  hasShipAtPosition(position: Vector): boolean {
    return this.ships.some((ship) => ship.position.equals(position));
  }

  spawnShipAtPosition(ship: ShipEntity, position: Vector) {
    const event = new ShipSpawnedEvent(ship, position);
    this.applyShipSpawnedEvent(event);
    this.append(event);
    return this;
  }

  @ApplyEvent(ShipSpawnedEvent)
  applyShipSpawnedEvent(event: ShipSpawnedEvent) {
    if (this.hasShipAtPosition(event.position)) {
      throw new Error(
        `Cannot spawn ship at position ${event.position.toString()}`,
      );
    }
    this.ships.push(
      Object.assign(new ShipToEncounterEntity(), {
        ship: event.ship,
        position: event.position,
      }),
    );
    return this;
  }
}

export class EncounterWithWindrose extends EncounterRoot {
  @ApplyEvent(WindroseTurnRightEvent)
  windroseTurnRight() {
    this.windrose.turnRight();
    return this;
  }

  @ApplyEvent(WindroseTurnLeftEvent)
  windroseTurnLeft() {
    this.windrose.turnRight();
    return this;
  }

  @ApplyEvent(WindroseSetDirectionEvent)
  windroseSetDirectionEvent(event: WindroseSetDirectionEvent) {
    this.windrose.setDirection(event.direction);
    return this;
  }

  @ApplyEvent(WindroseReRollDirectionEvent)
  windroseReRollDirection() {
    const event = new WindroseSetDirectionEvent(randomChoice(AllDirections));
    this.append(event);
    return this.windroseSetDirectionEvent(event);
  }
}

export class EncounterWithShips extends EncounterWithWindrose {}

export class EncounterAggregate extends EncounterWithShips {
  async methodA() {
    this.append(new ShipSpawnedEvent(new ShipEntity(), new Vector(1, 1)));
    this.append(new WindroseReRollDirectionEvent());
    await this.commit();
  }
}
