import { DomainEvent } from '@event-nest/core';
import { ShipEntity } from '../../../__entities/ship.entity';
import Vector from 'vector2js';
import { Direction } from '../../../types/direction.type';

@DomainEvent(ShipSpawnedEvent.name)
export class ShipSpawnedEvent {
  constructor(
    public readonly ship: ShipEntity,
    public readonly position: Vector,
  ) {}
}

@DomainEvent(WindroseTurnLeftEvent.name)
export class WindroseTurnLeftEvent {}

@DomainEvent(WindroseTurnRightEvent.name)
export class WindroseTurnRightEvent {}

@DomainEvent(WindroseSetDirectionEvent.name)
export class WindroseSetDirectionEvent {
  constructor(readonly direction: Direction) {}
}

@DomainEvent(WindroseReRollDirectionEvent.name)
export class WindroseReRollDirectionEvent {}
