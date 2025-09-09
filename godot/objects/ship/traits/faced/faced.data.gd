class_name FacedData
extends Resource
enum Direction {N, S, NE, SE, NW, SW}

@export var direction: Direction = Direction.N

const Direction2Vector2i = {
	Direction.N: Vector2i(0, -1),
	Direction.NW: Vector2i(-1, 0),
	Direction.SW: Vector2i(-1, 1),
	Direction.S: Vector2i(0, 1),
	Direction.SE: Vector2i(1, 1),
	Direction.NE: Vector2i(1, 0),
}

const Direction2Vector2iOdd = {
	Direction.N: Vector2i(0, -1),
	Direction.NW: Vector2i(-1, -1),
	Direction.SW: Vector2i(-1, 0),
	Direction.S: Vector2i(0, 1),
	Direction.SE: Vector2i(1, 0),
	Direction.NE: Vector2i(1, -1),
}

const TurnLeftDict = {
	Direction.N: Direction.NW,
	Direction.NW: Direction.SW,
	Direction.SW: Direction.S,
	Direction.S: Direction.SE,
	Direction.SE: Direction.NE,
	Direction.NE: Direction.N,
}

const TurnRightDict = {
	Direction.N: Direction.NE,	
	Direction.NE: Direction.SE,
	Direction.SE: Direction.S,
	Direction.S: Direction.SW,
	Direction.SW: Direction.NW,
	Direction.NW: Direction.N,
}
