import { Direction, DirectionTurnLeft, DirectionTurnRight } from '../../../types/direction.type';
import { ShipEntity } from '../../../__domain/ship.entity';
import { ShipSkillKey } from '../../../__domain/ship-skills.entity';
import { StreamAwareEntity } from '../../../../utils/stream-aware-entity';
import { ModifierBucketClearMode, ModifierBucketEntity } from '../../modifier-bucket.entity';
import { bindChildActions, ChildAction, OnBind } from '../../../../utils/child-action.decorator';
import { getOwnActionEvent } from '../../../../utils/action-event';
import {
    ShipAcceleratedEvent,
    ShipDeceleratedEvent,
    ShipMovedEvent,
    ShipTurnEndedEvent,
    ShipTurnStartedEvent,
    ShipTurnedLeftEvent,
    ShipTurnedRightEvent,
} from '../events/ship.events';
import { ShipEncounterIntent } from '../../../types/ship-encounter-intent.type';
import { Roll3d6UnderWithCritResult } from '../../../../rps/utils/roll';
import type { AxialPoint } from '../../../utils/hex-coordinate.util';

export class ShipToEncounterEntity extends StreamAwareEntity implements OnBind {
    constructor() {
        super();
        this.setOwnerKey('shipId');
    }
    modifierBucket: ModifierBucketEntity = new ModifierBucketEntity();

    id: string;

    shipId: string;

    ship: ShipEntity;

    position: AxialPoint;

    intent: ShipEncounterIntent | null = null;

    encounterId: string;

    actualSpeed: number = 0;

    actualDirection: Direction = Direction.N;

    setPosition(position: AxialPoint) {
        this.position = position;
        return this;
    }

    @ChildAction(ShipTurnStartedEvent)
    startTurn() {
        getOwnActionEvent(this, ShipTurnStartedEvent);
        this.modifierBucket.startTurn();
        return this;
    }

    @ChildAction(ShipTurnEndedEvent)
    endTurn() {
        getOwnActionEvent(this, ShipTurnEndedEvent);
        this.modifierBucket.clear(ModifierBucketClearMode.Expired);
        return this;
    }

    @ChildAction(ShipMovedEvent)
    moveTo(position: AxialPoint) {
        const action = getOwnActionEvent(this, ShipMovedEvent);
        const { position: nextPosition } = action.setNamedArgs({
            position,
        });
        return this.setPosition(nextPosition);
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
        const { seamanshipRoll } = action.setNamedArgs({
            seamanshipRoll: this.rollSkill('seamanship'),
        });
        const nextSpeed = seamanshipRoll.mos >= 0 ? this.actualSpeed + 1 : this.actualSpeed;
        const appliedSpeed = Math.min(nextSpeed, this.ship.speed);
        return this.setActualSpeed(appliedSpeed);
    }

    @ChildAction(ShipDeceleratedEvent)
    decelerate() {
        const action = getOwnActionEvent(this, ShipDeceleratedEvent);
        const nextSpeed = this.actualSpeed - 1;
        const success = nextSpeed >= 0;
        const appliedSpeed = success ? nextSpeed : this.actualSpeed;
        const { speed } = action.setNamedArgs({
            speed: appliedSpeed,
            success,
        });
        return this.setActualSpeed(speed);
    }

    @ChildAction(ShipTurnedRightEvent)
    turnRight() {
        const action = getOwnActionEvent(this, ShipTurnedRightEvent);
        const nextDirection = DirectionTurnRight[this.actualDirection];
        const nextSpeed = this.actualSpeed - 1;
        const appliedSpeed = nextSpeed >= 0 ? nextSpeed : this.actualSpeed;
        const { direction, speed } = action.setNamedArgs({
            direction: nextDirection,
            speed: appliedSpeed,
        });
        return this.setActualSpeed(speed).setActualDirection(direction);
    }

    @ChildAction(ShipTurnedLeftEvent)
    turnLeft() {
        const action = getOwnActionEvent(this, ShipTurnedLeftEvent);
        const nextDirection = DirectionTurnLeft[this.actualDirection];
        const nextSpeed = this.actualSpeed - 1;
        const appliedSpeed = nextSpeed >= 0 ? nextSpeed : this.actualSpeed;
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

    onBind(owner: object, childName: string) {
        if (this.shipId) {
            this.modifierBucket.shipId = this.shipId;
        }
        bindChildActions(owner, this.modifierBucket, `${childName}_bucket`);
    }

    rollSkill(skill: ShipSkillKey): Roll3d6UnderWithCritResult {
        const modifier = this.modifierBucket.total(skill);
        return this.ship.rollSkill(skill, modifier);
    }

    // guard/dispatch is handled by getOwnActionEvent()
}
