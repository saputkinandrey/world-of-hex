import { Direction } from '../types/direction.type';
import Vector from 'vector2js';
import { moveOffsetPosition } from './hex-coordinate.util';

export const buildPath = (start: Vector, direction: Direction, length: number): Vector[] => {
    const result: Vector[] = [];
    result.push(new Vector(start.x, start.y));
    for (let i = 1; i < length; i++) {
        const next = moveOffsetPosition(result[i - 1], direction, 1);
        result.push(new Vector(next.x, next.y));
    }

    return result;
};
