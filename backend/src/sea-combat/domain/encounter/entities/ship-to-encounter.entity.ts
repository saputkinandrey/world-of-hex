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
    ShipIntentChangedEvent,
    ShipMovedEvent,
    ShipPlacementUpdatedEvent,
    ShipTurnEndedEvent,
    ShipTargetChangedEvent,
    ShipTurnStartedEvent,
    ShipTurnedLeftEvent,
    ShipTurnedRightEvent,
} from '../events/ship.events';
import { ShipEncounterIntent } from '../../../types/ship-encounter-intent.type';
import {
    DEFAULT_SHIP_CAPTAIN_TARGET,
    ShipCaptainTarget,
    createShipCaptainTarget,
} from '../../../types/ship-captain-target.type';
import { Roll3d6UnderWithCritResult } from '../../../../rps/utils/roll';
import type { AxialPoint } from '../../../utils/hex-coordinate.util';

type OptionalSeamanshipRoll = Roll3d6UnderWithCritResult | null;

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

    target: ShipCaptainTarget = createShipCaptainTarget(DEFAULT_SHIP_CAPTAIN_TARGET.type);

    encounterId: string;

    actualSpeed: number = 0;

    actualDirection: Direction = Direction.N;

    setPosition(position: AxialPoint) {
        this.position = position;
        return this;
    }

    setIntent(intent: ShipEncounterIntent | null): this;
    setIntent(event: ShipIntentChangedEvent): this;
    @ChildAction(ShipIntentChangedEvent)
    setIntent(intentOrEvent: ShipEncounterIntent | null | ShipIntentChangedEvent) {
        const intent = intentOrEvent instanceof ShipIntentChangedEvent ? intentOrEvent.intent : intentOrEvent;
        const action = getOwnActionEvent(this, ShipIntentChangedEvent);
        const resolved = action.setNamedArgs({
            intent,
        });
        this.intent = resolved.intent;
        return this;
    }

    setTarget(target: ShipCaptainTarget): this;
    setTarget(event: ShipTargetChangedEvent): this;
    @ChildAction(ShipTargetChangedEvent)
    setTarget(targetOrEvent: ShipCaptainTarget | ShipTargetChangedEvent) {
        const target = targetOrEvent instanceof ShipTargetChangedEvent ? targetOrEvent.target : targetOrEvent;
        const action = getOwnActionEvent(this, ShipTargetChangedEvent);
        const resolved = action.setNamedArgs({
            target,
        });
        this.target = createShipCaptainTarget(resolved.target.type, resolved.target.shipId);
        return this;
    }

    startTurn(): this;
    startTurn(event: ShipTurnStartedEvent): this;
    @ChildAction(ShipTurnStartedEvent)
    startTurn(event?: ShipTurnStartedEvent) {
        if (event instanceof ShipTurnStartedEvent || isReplayingAction(this)) {
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
    endTurn(event?: ShipTurnEndedEvent) {
        if (event instanceof ShipTurnEndedEvent || isReplayingAction(this)) {
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
        }

        if (speed > this.ship.speed) {
            return this;
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

    decelerate(seamanshipRollInput: Roll3d6UnderWithCritResult): this;
    decelerate(event: ShipDeceleratedEvent): this;
    @ChildAction(ShipDeceleratedEvent)
    decelerate(seamanshipRollOrEvent: Roll3d6UnderWithCritResult | ShipDeceleratedEvent) {
        const seamanshipRollInput =
            seamanshipRollOrEvent instanceof ShipDeceleratedEvent
                ? seamanshipRollOrEvent.seamanshipRoll
                : seamanshipRollOrEvent;
        const action = getOwnActionEvent(this, ShipDeceleratedEvent);
        const success = seamanshipRollInput.mos >= 0;
        const nextSpeed = success ? this.actualSpeed - 1 : this.actualSpeed;
        const appliedSpeed = nextSpeed >= 0 ? nextSpeed : this.actualSpeed;
        const { speed } = action.setNamedArgs({
            seamanshipRoll: seamanshipRollInput,
            speed: appliedSpeed,
            success,
        });
        return this.setActualSpeed(speed);
    }

    turnRight(): this;
    turnRight(seamanshipRollInput: Roll3d6UnderWithCritResult): this;
    turnRight(event: ShipTurnedRightEvent): this;
    @ChildAction(ShipTurnedRightEvent)
    turnRight(seamanshipRollOrEvent?: Roll3d6UnderWithCritResult | ShipTurnedRightEvent) {
        const seamanshipRollInput = this.resolveTurnSeamanshipRoll(seamanshipRollOrEvent);
        const action = getOwnActionEvent(this, ShipTurnedRightEvent);
        const nextDirection = DirectionTurnRight[this.actualDirection];
        const nextSpeed = this.resolveTurnSpeed(seamanshipRollInput);
        const { direction, speed } = action.setNamedArgs({
            direction: nextDirection,
            speed: nextSpeed,
            seamanshipRoll: seamanshipRollInput,
        });
        return this.setActualSpeed(speed).setActualDirection(direction);
    }

    turnLeft(): this;
    turnLeft(seamanshipRollInput: Roll3d6UnderWithCritResult): this;
    turnLeft(event: ShipTurnedLeftEvent): this;
    @ChildAction(ShipTurnedLeftEvent)
    turnLeft(seamanshipRollOrEvent?: Roll3d6UnderWithCritResult | ShipTurnedLeftEvent) {
        const seamanshipRollInput = this.resolveTurnSeamanshipRoll(seamanshipRollOrEvent);
        const action = getOwnActionEvent(this, ShipTurnedLeftEvent);
        const nextDirection = DirectionTurnLeft[this.actualDirection];
        const nextSpeed = this.resolveTurnSpeed(seamanshipRollInput);
        const { direction, speed } = action.setNamedArgs({
            direction: nextDirection,
            speed: nextSpeed,
            seamanshipRoll: seamanshipRollInput,
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

    private resolveTurnSeamanshipRoll(
        seamanshipRollOrEvent: Roll3d6UnderWithCritResult | ShipTurnedLeftEvent | ShipTurnedRightEvent | undefined,
    ): OptionalSeamanshipRoll {
        if (
            seamanshipRollOrEvent instanceof ShipTurnedLeftEvent ||
            seamanshipRollOrEvent instanceof ShipTurnedRightEvent
        ) {
            return seamanshipRollOrEvent.seamanshipRoll;
        }

        return seamanshipRollOrEvent ?? null;
    }

    private resolveTurnSpeed(seamanshipRoll: OptionalSeamanshipRoll) {
        if (seamanshipRoll && seamanshipRoll.mos >= 0) {
            return this.actualSpeed;
        }

        const nextSpeed = this.actualSpeed - 1;
        return nextSpeed >= 0 ? nextSpeed : this.actualSpeed;
    }

    // guard/dispatch is handled by getOwnActionEvent()
}
