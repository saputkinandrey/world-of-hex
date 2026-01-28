import {
    AllDirections,
    Direction,
    DirectionTurnLeft,
    DirectionTurnRight,
} from '../types/direction.type';
import { randomChoice } from '../../rps/utils/roll';

export class WindroseEntity {
    direction: Direction = randomChoice(AllDirections);

    reRollWindDirection() {
        return this.setDirection(randomChoice(AllDirections));
    }

    setDirection(direction: Direction) {
        this.direction = direction;
        return this;
    }

    turnRight() {
        return this.setDirection(DirectionTurnRight[this.direction]);
    }

    turnLeft() {
        return this.setDirection(DirectionTurnLeft[this.direction]);
    }
}
