class_name helpers
extends Node

const Direction2Vector2i = {
	types.TileDirection.N: Vector2i(0, -1),
	types.TileDirection.NW: Vector2i(-1, 0),
	types.TileDirection.SW: Vector2i(-1, 1),
	types.TileDirection.S: Vector2i(0, 1),
	types.TileDirection.SE: Vector2i(1, 1),
	types.TileDirection.NE: Vector2i(1, 0),
}

const Direction2Vector2iOdd = {
	types.TileDirection.N: Vector2i(0, -1),
	types.TileDirection.NW: Vector2i(-1, -1),
	types.TileDirection.SW: Vector2i(-1, 0),
	types.TileDirection.S: Vector2i(0, 1),
	types.TileDirection.SE: Vector2i(1, 0),
	types.TileDirection.NE: Vector2i(1, -1),
}

const TurnLeftDict = {
	types.TileDirection.N: types.TileDirection.NW,
	types.TileDirection.NW: types.TileDirection.SW,
	types.TileDirection.SW: types.TileDirection.S,
	types.TileDirection.S: types.TileDirection.SE,
	types.TileDirection.SE: types.TileDirection.NE,
	types.TileDirection.NE: types.TileDirection.N,
}

const TurnRightDict = {
	types.TileDirection.N: types.TileDirection.NE,
	types.TileDirection.NE: types.TileDirection.SE,
	types.TileDirection.SE: types.TileDirection.S,
	types.TileDirection.S: types.TileDirection.SW,
	types.TileDirection.SW: types.TileDirection.NW,
	types.TileDirection.NW: types.TileDirection.N,
}
