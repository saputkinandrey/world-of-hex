class_name TileNode2D
extends Node2D

enum Direction {N, S, NE, SE, NW, SW}

const Direction2Vector2i = {
	Direction.N: Vector2i(0, -1),
	Direction.NW: Vector2i(-1, -1),
	Direction.SW: Vector2i(-1, 1),
	Direction.S: Vector2i(0, 1),
	Direction.SE: Vector2i(1, 1),
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

@export var tilemap: TileMapLayer
@export var direction: Direction = Direction.N
var coords: Vector2i = Vector2i(0, 0)

func turnLeft():
	self.direction = TurnLeftDict[self.direction]
	
func turnRight():
	self.direction = TurnRightDict[self.direction]

func move(distance:Vector2i):
	super.move_local_x()
	pass

func _ready() -> void:
	self.position = tilemap.map_to_local(tilemap.local_to_map(self.position))
	pass


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass
