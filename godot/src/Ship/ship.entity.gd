class_name ShipEntity
extends TileNode2D

enum Type {DRAKKAR=1}
enum Direction {N, S, NE, SE, NW, SW}

@export var speed: int = 0
@export var type: Type = Type.DRAKKAR
@export var direction: Direction = Direction.N
var coords: Vector2i = Vector2i(0, 0)
