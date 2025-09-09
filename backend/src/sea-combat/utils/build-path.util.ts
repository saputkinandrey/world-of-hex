import {
  Direction,
  DirectionToVectorEven,
  DirectionToVectorOdd,
} from '../types/direction.type';
import Vector from 'vector2js';

export const buildPath = (
  start: Vector,
  direction: Direction,
  length: number,
): Vector[] => {
  const result: Vector[] = [];
  result.push(new Vector(start.x, start.y));
  for (let i = 1; i < length; i++) {
    if (result[i - 1].x % 2 === 0) {
      result.push(
        new Vector(result[i - 1].x, result[i - 1].y).add(
          DirectionToVectorEven[direction],
        ),
      );
    } else {
      result.push(
        new Vector(result[i - 1].x, result[i - 1].y).add(
          DirectionToVectorOdd[direction],
        ),
      );
    }
  }

  return result;
};
