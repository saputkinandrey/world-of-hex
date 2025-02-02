class_name ShipEntity
extends Node

func _init():
	for child in self.get_children():
		child.parent = self

func _ready() -> void:
	self.updateSprite()

enum ShipType {DRAKKAR=1}
enum ShipDirection {N, S, NE, SE, NW, SW}

var Type2Texture = {
	ShipType.DRAKKAR: load("res://tile-sets/Drakkar.tres")
}

var Direction2Frame = {
	ShipDirection.SW: 0,
	ShipDirection.NW: 1,
	ShipDirection.N: 2,
	ShipDirection.NE: 3,
	ShipDirection.SE: 4,
	ShipDirection.S: 5,
}

@export var speed: int = 0
@export var type: ShipType = ShipType.DRAKKAR
@export var direction: ShipDirection = ShipDirection.N
@export var sprite: Sprite2D

func setSpeed(_speed: int) -> ShipEntity:
	self.speed = _speed
	return self
	
func setType(_type: ShipType) -> ShipEntity:
	self.type = _type
	return self

func setDirection(_direction:ShipDirection) -> ShipEntity:
	self.direction = _direction
	return self.updateSprite()
	
func updateSprite():
	self.sprite.texture = Type2Texture[self.type]
	self.sprite.frame = Direction2Frame[self.direction]
	self.sprite.hframes = 6
	self.sprite.vframes = 1
