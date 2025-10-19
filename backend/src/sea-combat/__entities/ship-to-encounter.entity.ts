import { ApiProperty } from '@nestjs/swagger';
import {
  Direction,
  DirectionTurnLeft,
  DirectionTurnRight,
} from '../types/direction.type';
import { ShipEntity } from './ship.entity';
import { ModifierBucketEntity } from './modifier-bucket.entity';
import { roll3d6Under } from '../../rps/utils/roll';
import { ShipSkillsEntity } from './ship-skills.entity';
import Vector from 'vector2js';

const idType = String;

export class ShipToEncounterEntity {
  startTurn() {
    this.modifierBucket.startTurn();
  }

  endTurn() {}

  modifierBucket: ModifierBucketEntity = new ModifierBucketEntity();

  @ApiProperty({
    type: idType,
  })
  id: string;

  @ApiProperty()
  shipId: string;

  @ApiProperty()
  ship: ShipEntity;

  @ApiProperty()
  position: Vector;

  @ApiProperty()
  skills: ShipSkillsEntity = new ShipSkillsEntity().setSeamanship(12);

  @ApiProperty()
  actualSpeed: number = 0;

  @ApiProperty()
  actualDirection: Direction = Direction.N;

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

  accelerate() {
    if (
      roll3d6Under(
        this.skills.seamanship + this.modifierBucket.total('seamanship'),
      ) >= 0
    )
      return this.setActualSpeed(this.actualSpeed++);
  }

  decelerate() {
    return this.setActualSpeed(this.actualSpeed--);
  }

  turnRight() {
    return this.decelerate().setActualDirection(
      DirectionTurnRight[this.actualDirection],
    );
  }

  turnLeft() {
    return this.decelerate().setActualDirection(
      DirectionTurnLeft[this.actualDirection],
    );
  }

  setActualDirection(direction: Direction) {
    this.actualDirection = direction;
    return this;
  }

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date;
}
