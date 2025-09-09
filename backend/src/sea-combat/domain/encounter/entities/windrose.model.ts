import {
  Direction,
  DirectionTurnLeft,
  DirectionTurnRight,
} from '../../../types/direction.type';

export class WindroseEntity {
  direction: Direction;

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
