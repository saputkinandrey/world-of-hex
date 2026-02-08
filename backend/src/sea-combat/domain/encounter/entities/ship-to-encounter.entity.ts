import { Direction, DirectionTurnLeft, DirectionTurnRight } from '../../../types/direction.type';
import { ShipEntity } from '../../../__domain/ship.entity';
import { StreamAwareEntity } from '../../../../utils/stream-aware-entity';
import { ModifierBucketEntity } from '../../../__domain/modifier-bucket.entity';
import { roll3d6Under } from '../../../../rps/utils/roll';
import { ChildAction } from '../../../../utils/child-action.decorator';
import { getOwnActionEvent } from '../../../../utils/action-event';
import Vector from 'vector2js';
import {
    ShipAcceleratedEvent,
    ShipDeceleratedEvent,
    ShipTurnEndedEvent,
    ShipTurnStartedEvent,
    ShipTurnedLeftEvent,
    ShipTurnedRightEvent,
} from '../events/ship.events';
import { ShipEncounterIntent } from '../../../types/ship-encounter-intent.type';

export class ShipToEncounterEntity extends StreamAwareEntity {
    constructor() {
        super();
        this.setOwnerKey('shipId');
    }
    modifierBucket: ModifierBucketEntity = new ModifierBucketEntity();

    id: string;

    shipId: string;

    ship: ShipEntity;

    position: Vector;

    intent: ShipEncounterIntent | null = null;

    encounterId: string;

    actualSpeed: number = 0;

    actualDirection: Direction = Direction.N;

    @ChildAction(ShipTurnStartedEvent)
    startTurn() {
        getOwnActionEvent(this, ShipTurnStartedEvent);
        this.modifierBucket.startTurn();
        return this;
    }

    @ChildAction(ShipTurnEndedEvent)
    endTurn() {
        getOwnActionEvent(this, ShipTurnEndedEvent);
        return this;
    }

    setActualSpeed(speed: number) {
        if (speed < 0) {
            return this;
            // throw new Error('Speed must be greater than 0');
        }

        if (speed > this.ship.speed) {
            return this;
            // throw new Error(`Can't set speed greater than ${this.ship.speed}`);
        }

        this.actualSpeed = speed;
        return this;
    }

    @ChildAction(ShipAcceleratedEvent)
    accelerate() {
        const action = getOwnActionEvent(this, ShipAcceleratedEvent);
        const { speed, seamanshipMoS } = action.setNamedArgs({
            speed: this.actualSpeed,
            seamanshipMoS: roll3d6Under(
                this.ship.skills.seamanship +
                    this.modifierBucket.total('seamanship'),
            ),
        });
        const nextSpeed = seamanshipMoS >= 0 ? speed + 1 : speed;
        return this.setActualSpeed(nextSpeed);
    }

    @ChildAction(ShipDeceleratedEvent)
    decelerate() {
        const nextSpeed = this.actualSpeed - 1;
        const success = nextSpeed >= 0;
        const appliedSpeed = success ? nextSpeed : this.actualSpeed;
        const action = getOwnActionEvent(this, ShipDeceleratedEvent);
        const { speed } = action.setNamedArgs({
            speed: appliedSpeed,
            success,
        });
        return this.setActualSpeed(speed);
    }

    @ChildAction(ShipTurnedRightEvent)
    turnRight() {
        const nextDirection = DirectionTurnRight[this.actualDirection];
        const nextSpeed = this.actualSpeed - 1;
        const appliedSpeed = nextSpeed >= 0 ? nextSpeed : this.actualSpeed;
        const action = getOwnActionEvent(this, ShipTurnedRightEvent);
        const { direction, speed } = action.setNamedArgs({
            direction: nextDirection,
            speed: appliedSpeed,
        });
        return this.setActualSpeed(speed).setActualDirection(direction);
    }

    @ChildAction(ShipTurnedLeftEvent)
    turnLeft() {
        const nextDirection = DirectionTurnLeft[this.actualDirection];
        const nextSpeed = this.actualSpeed - 1;
        const appliedSpeed = nextSpeed >= 0 ? nextSpeed : this.actualSpeed;
        const action = getOwnActionEvent(this, ShipTurnedLeftEvent);
        const { direction, speed } = action.setNamedArgs({
            direction: nextDirection,
            speed: appliedSpeed,
        });
        return this.setActualSpeed(speed).setActualDirection(direction);
    }

    setActualDirection(direction: Direction) {
        this.actualDirection = direction;
        return this;
    }

    // guard/dispatch is handled by getOwnActionEvent()
}
