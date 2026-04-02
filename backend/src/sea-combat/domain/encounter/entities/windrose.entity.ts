import { Direction, DirectionTurnLeft, DirectionTurnRight } from '../../../types/direction.type';
import { WindroseReRollDirectionEvent, WindroseTurnLeftEvent, WindroseTurnRightEvent } from '../events/windrose.events';
import { ChildAction } from '../../../../utils/child-action.decorator';
import { getActionEvent } from '../../../../utils/action-event';
import { StreamAwareEntity } from '../../../../utils/stream-aware-entity';

export class WindroseEntity extends StreamAwareEntity {
    constructor() {
        super();
        this.setOwnerKey(null);
    }

    direction: Direction = Direction.N;

    setDirection(direction: Direction) {
        this.direction = direction;
        return this;
    }

    @ChildAction(WindroseReRollDirectionEvent)
    reRollWindDirection(direction: Direction) {
        const event = getActionEvent(this, WindroseReRollDirectionEvent);
        const { direction: nextDirection } = event.setNamedArgs({
            direction,
        });
        return this.setDirection(nextDirection);
    }

    @ChildAction(WindroseTurnRightEvent)
    turnRight() {
        return this.setDirection(DirectionTurnRight[this.direction]);
    }

    @ChildAction(WindroseTurnLeftEvent)
    turnLeft() {
        return this.setDirection(DirectionTurnLeft[this.direction]);
    }
}
