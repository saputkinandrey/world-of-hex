import { Direction } from '../types/direction.type';

export type OffsetPoint = {
    x: number;
    y: number;
};

export type AxialPoint = {
    q: number;
    r: number;
};

type CubePoint = {
    x: number;
    y: number;
    z: number;
};

const DirectionToAxialVector: Record<Direction, AxialPoint> = {
    [Direction.N]: { q: 0, r: -1 },
    [Direction.NE]: { q: 1, r: -1 },
    [Direction.SE]: { q: 1, r: 0 },
    [Direction.S]: { q: 0, r: 1 },
    [Direction.SW]: { q: -1, r: 1 },
    [Direction.NW]: { q: -1, r: 0 },
};

export const isOddColumn = (value: number) => Math.abs(value % 2) === 1;

export const sameAxialPoint = (left: AxialPoint, right: AxialPoint) => left.q === right.q && left.r === right.r;

export const offsetToAxialPoint = (point: OffsetPoint): AxialPoint => ({
    q: point.x,
    r: point.y - (point.x - (isOddColumn(point.x) ? 1 : 0)) / 2,
});

export const axialToOffsetPoint = (point: AxialPoint): OffsetPoint => ({
    x: point.q,
    y: point.r + (point.q - (isOddColumn(point.q) ? 1 : 0)) / 2,
});

export const axialToCubePoint = (point: AxialPoint): CubePoint => {
    const x = point.q;
    const z = point.r;
    const y = -x - z;

    return { x, y, z };
};

export const distanceBetweenAxialPoints = (left: AxialPoint, right: AxialPoint) => {
    const leftCube = axialToCubePoint(left);
    const rightCube = axialToCubePoint(right);

    return Math.max(
        Math.abs(leftCube.x - rightCube.x),
        Math.abs(leftCube.y - rightCube.y),
        Math.abs(leftCube.z - rightCube.z),
    );
};

export const distanceBetweenOffsetPoints = (left: OffsetPoint, right: OffsetPoint) =>
    distanceBetweenAxialPoints(offsetToAxialPoint(left), offsetToAxialPoint(right));

export const stepAxialPosition = (position: AxialPoint, direction: Direction): AxialPoint => {
    const delta = DirectionToAxialVector[direction];

    return {
        q: position.q + delta.q,
        r: position.r + delta.r,
    };
};

export const moveAxialPosition = (start: AxialPoint, direction: Direction, steps: number): AxialPoint => {
    let position = { ...start };

    for (let i = 0; i < Math.max(0, steps); i += 1) {
        position = stepAxialPosition(position, direction);
    }

    return position;
};

export const stepOffsetPosition = (position: OffsetPoint, direction: Direction): OffsetPoint =>
    axialToOffsetPoint(stepAxialPosition(offsetToAxialPoint(position), direction));

export const moveOffsetPosition = (start: OffsetPoint, direction: Direction, steps: number): OffsetPoint =>
    axialToOffsetPoint(moveAxialPosition(offsetToAxialPoint(start), direction, steps));
