import Vector from 'vector2js';

import { Direction, movePosition, stepPosition } from './direction.type';

describe('direction movement helpers', () => {
    it('moves north without changing column parity', () => {
        const result = movePosition(new Vector(0, 0), Direction.N, 15);

        expect(result.x).toBe(0);
        expect(result.y).toBe(-15);
    });

    it('moves south-east step by step across alternating column parity', () => {
        const result = movePosition(new Vector(0, 0), Direction.SE, 14);

        expect(result.x).toBe(14);
        expect(result.y).toBe(7);
    });

    it('moves north-west correctly through negative odd columns', () => {
        const result = movePosition(new Vector(0, 0), Direction.NW, 13);

        expect(result.x).toBe(-13);
        expect(result.y).toBe(-7);
    });

    it('steps from even and odd columns with different deltas', () => {
        const fromEven = stepPosition(new Vector(0, 0), Direction.SE);
        const fromOdd = stepPosition(new Vector(1, 0), Direction.SE);

        expect(fromEven.toString()).toBe('1,0');
        expect(fromOdd.toString()).toBe('2,1');
    });
});
