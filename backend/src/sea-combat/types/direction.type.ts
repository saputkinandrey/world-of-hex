export enum Direction {
    N = 'N',
    NE = 'NE',
    SE = 'SE',
    S = 'S',
    SW = 'SW',
    NW = 'NW',
}

export const AllDirections = [Direction.N, Direction.NE, Direction.SE, Direction.S, Direction.SW, Direction.NW];

export const DirectionTurnRight = {
    [Direction.N]: Direction.NE,
    [Direction.NE]: Direction.SE,
    [Direction.SE]: Direction.S,
    [Direction.S]: Direction.SW,
    [Direction.SW]: Direction.NW,
    [Direction.NW]: Direction.N,
};

export const DirectionTurnLeft = {
    [Direction.N]: Direction.NW,
    [Direction.NW]: Direction.SW,
    [Direction.SW]: Direction.S,
    [Direction.S]: Direction.SE,
    [Direction.SE]: Direction.NE,
    [Direction.NE]: Direction.N,
};
