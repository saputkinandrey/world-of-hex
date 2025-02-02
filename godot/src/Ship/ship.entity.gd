class_name ShipEntity
extends TileNode2D

enum Type {DRAKKAR=1}

@export var speed: int = 0
@export var type: Type = Type.DRAKKAR

func moveForward():
	super.move(Direction2Vector2i[self.direction] * self.speed)
