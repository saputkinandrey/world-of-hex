import { Direction, DirectionTurnLeft, DirectionTurnRight } from '../../../types/direction.type';
import { ShipEntity } from '../../../__domain/ship.entity';
import { ShipSkillKey } from '../../../__domain/ship-skills.entity';
import { StreamAwareEntity } from '../../../../utils/stream-aware-entity';
import { ModifierBucketClearMode, ModifierBucketEntity } from '../../modifier-bucket.entity';
import { bindChildActions, ChildAction, OnBind } from '../../../../utils/child-action.decorator';
import { getOwnActionEvent, isReplayingAction } from '../../../../utils/action-event';
import {
    ShipAcceleratedEvent,
    ShipDeceleratedEvent,
    ShipMovedEvent,
    ShipPlacementUpdatedEvent,
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

    startTurn(): this;
    startTurn(event: ShipTurnStartedEvent): this;
    @ChildAction(ShipTurnStartedEvent)
    startTurn(_event?: ShipTurnStartedEvent) {
        if (isReplayingAction(this)) {
            return this;
        }

        const action = getOwnActionEvent(this, ShipTurnStartedEvent);
        action.setNamedArgs({});
        this.modifierBucket.startTurn();
        return this;
    }

    endTurn(): this;
    endTurn(event: ShipTurnEndedEvent): this;
    @ChildAction(ShipTurnEndedEvent)
    endTurn(_event?: ShipTurnEndedEvent) {
        if (isReplayingAction(this)) {
            return this;
        }

        const action = getOwnActionEvent(this, ShipTurnEndedEvent);
        action.setNamedArgs({});
        this.modifierBucket.clear(ModifierBucketClearMode.Expired);
        return this;
    }

    moveTo(position: AxialPoint): this;
    moveTo(event: ShipMovedEvent): this;
    @ChildAction(ShipMovedEvent)
    moveTo(positionOrEvent: AxialPoint | ShipMovedEvent) {
        const position = positionOrEvent instanceof ShipMovedEvent ? positionOrEvent.position : positionOrEvent;
        const action = getOwnActionEvent(this, ShipMovedEvent);
        const { position: nextPosition } = action.setNamedArgs({
            position,
        });
        return this.setPosition(nextPosition);
    }

    updatePlacement(position: AxialPoint, direction: Direction, speed: number): this;
    updatePlacement(event: ShipPlacementUpdatedEvent): this;
    @ChildAction(ShipPlacementUpdatedEvent)
    updatePlacement(positionOrEvent: AxialPoint | ShipPlacementUpdatedEvent, direction?: Direction, speed?: number) {
        const position =
            positionOrEvent instanceof ShipPlacementUpdatedEvent ? positionOrEvent.position : positionOrEvent;
        const nextDirection =
            positionOrEvent instanceof ShipPlacementUpdatedEvent ? positionOrEvent.direction : direction;
        const nextSpeed = positionOrEvent instanceof ShipPlacementUpdatedEvent ? positionOrEvent.speed : speed;
        if (nextDirection === undefined || nextSpeed === undefined) {
            throw new Error('Ship placement update requires direction and speed');
        }
        const action = getOwnActionEvent(this, ShipPlacementUpdatedEvent);
        const resolved = action.setNamedArgs({
            position,
            direction: nextDirection,
            speed: nextSpeed,
        });
        return this.setPosition(resolved.position)
            .setActualDirection(resolved.direction)
            .setActualSpeed(resolved.speed);
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

    accelerate(seamanshipRollInput: Roll3d6UnderWithCritResult): this;
    accelerate(event: ShipAcceleratedEvent): this;
    @ChildAction(ShipAcceleratedEvent)
    accelerate(seamanshipRollOrEvent: Roll3d6UnderWithCritResult | ShipAcceleratedEvent) {
        const seamanshipRollInput =
            seamanshipRollOrEvent instanceof ShipAcceleratedEvent
                ? seamanshipRollOrEvent.seamanshipRoll
                : seamanshipRollOrEvent;
        const action = getOwnActionEvent(this, ShipAcceleratedEvent);
        const { seamanshipRoll } = action.setNamedArgs({
            seamanshipRoll: seamanshipRollInput,
        });
        const nextSpeed = seamanshipRoll.mos >= 0 ? this.actualSpeed + 1 : this.actualSpeed;
        const appliedSpeed = Math.min(nextSpeed, this.ship.speed);
        return this.setActualSpeed(appliedSpeed);
    }

    decelerate(): this;
    decelerate(event: ShipDeceleratedEvent): this;
    @ChildAction(ShipDeceleratedEvent)
    decelerate(_event?: ShipDeceleratedEvent) {
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

    turnRight(): this;
    turnRight(event: ShipTurnedRightEvent): this;
    @ChildAction(ShipTurnedRightEvent)
    turnRight(_event?: ShipTurnedRightEvent) {
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

    turnLeft(): this;
    turnLeft(event: ShipTurnedLeftEvent): this;
    @ChildAction(ShipTurnedLeftEvent)
    turnLeft(_event?: ShipTurnedLeftEvent) {
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
