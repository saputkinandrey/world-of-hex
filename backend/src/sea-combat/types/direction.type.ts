import Vector from 'vector2js';

export enum Direction {
  N = 'N',
  NE = 'NE',
  SE = 'SE',
  S = 'S',
  SW = 'SW',
  NW = 'NW',
}

export const VectorOddToDirection = {
  [new Vector(0, -1).toString()]: Direction.N,
  [new Vector(1, 0).toString()]: Direction.NE,
  [new Vector(1, 1).toString()]: Direction.SE,
  [new Vector(0, 1).toString()]: Direction.S,
  [new Vector(-1, 1).toString()]: Direction.SW,
  [new Vector(-1, 0).toString()]: Direction.NW,
};

export const VectorEvenToDirection = {
  [new Vector(0, -1).toString()]: Direction.N,
  [new Vector(1, -1).toString()]: Direction.NE,
  [new Vector(1, 0).toString()]: Direction.SE,
  [new Vector(0, 1).toString()]: Direction.S,
  [new Vector(-1, 0).toString()]: Direction.SW,
  [new Vector(-1, -1).toString()]: Direction.NW,
};

export const DirectionToVectorOdd = {
  [Direction.N]: new Vector(0, -1),
  [Direction.NE]: new Vector(1, 0),
  [Direction.SE]: new Vector(1, 1),
  [Direction.S]: new Vector(0, 1),
  [Direction.SW]: new Vector(-1, 1),
  [Direction.NW]: new Vector(-1, 0),
};

export const DirectionToVectorEven = {
  [Direction.N]: new Vector(0, -1),
  [Direction.NE]: new Vector(1, -1),
  [Direction.SE]: new Vector(1, 0),
  [Direction.S]: new Vector(0, 1),
  [Direction.SW]: new Vector(-1, 0),
  [Direction.NW]: new Vector(-1, -1),
};

export const AllDirections = [
  Direction.N,
  Direction.NE,
  Direction.SE,
  Direction.S,
  Direction.SW,
  Direction.NW,
];

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
