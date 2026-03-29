import { Direction } from './direction.type';
import {
    moveAxialPosition,
    moveOffsetPosition,
    offsetToAxialPoint,
    stepAxialPosition,
} from '../utils/hex-coordinate.util';

describe('direction movement helpers', () => {
    it('moves north in axial space without parity branches', () => {
        const result = moveAxialPosition({ q: 0, r: 0 }, Direction.N, 15);

        expect(result).toEqual({ q: 0, r: -15 });
    });

    it('keeps offset movement compatible through axial conversion', () => {
        const result = moveOffsetPosition({ x: 0, y: 0 }, Direction.SE, 14);

        expect(result).toEqual({ x: 14, y: 7 });
    });

    it('moves north-west correctly through negative odd columns in offset space', () => {
        const result = moveOffsetPosition({ x: 0, y: 0 }, Direction.NW, 13);

        expect(result).toEqual({ x: -13, y: -7 });
    });

    it('represents south-east as one stable axial delta', () => {
        const fromStart = stepAxialPosition({ q: 0, r: 0 }, Direction.SE);
        const fromNext = stepAxialPosition({ q: 1, r: 0 }, Direction.SE);

        expect(fromStart).toEqual({ q: 1, r: 0 });
        expect(fromNext).toEqual({ q: 2, r: 0 });
    });

    it('maps legacy odd-q offset coordinates to the same axial path', () => {
        const fromEven = offsetToAxialPoint({ x: 0, y: 0 });
        const fromOdd = offsetToAxialPoint({ x: 1, y: 0 });

        expect(stepAxialPosition(fromEven, Direction.SE)).toEqual({ q: 1, r: 0 });
        expect(stepAxialPosition(fromOdd, Direction.SE)).toEqual({ q: 2, r: 0 });
    });
});
