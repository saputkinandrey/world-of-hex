class_name ShipObject
extends CharacterBody2D


@export var shipData: ShipEntity = ShipEntity.new()
@export var movableData: MovableData = MovableData.new()
@export var facedData: FacedData = FacedData.new()
@export var tileMapLayer: TileMapLayer
# Globals
@onready var player: Player = Global.player
# TRAITS
@onready var movable: Node = $MovableTrait
@onready var faced: FacedTrait = $FacedTrait
@onready var roll: RollTrait = $RollTrait
@onready var sprite: ShipSpriteTrait = $ShipSpriteTrait

var speed = 0

func setShip(shipToEnc: ShipToEncounterEntity) -> ShipObject:
	self.shipData = shipToEnc.ship
	self.facedData.direction = shipToEnc.direction
	self.movableData.currentPosition = shipToEnc.position
	self.movableData.desiredPosition = shipToEnc.position
	self.speed = shipToEnc.speed
	self.set_name(shipToEnc.ship._id)
	return self

func _ready() -> void:
	var name = self.name
	print(name)
	#self.position = Vector2i(0,0)
	$Labels/Name.text = self.shipData.name
	$Labels/Position.text = JSON.stringify(self.movableData.currentPosition)

	if speed <= 0:
		speed = shipData.speed

	self.sprite.updateTexture(self.shipData.type)
	self.sprite._ready()
	self.movable._ready()
	pass
	
func _process(delta: float) -> void:
	self.movable._process(delta)
	self.sprite._process(delta)
	velocity = FacedData.Direction2Vector2i[facedData.direction] * speed
	print(self.name, " speed ", speed)
	print(self.name, " velocity ", velocity)
	print(self.name, " direction ", self.facedData.direction)
	print(self.name, " position ", self.movableData.currentPosition)
	print(self.name, " node position ", self.position)
	print(self.name, " move_and_collide ", velocity * delta)
	#move_and_collide(velocity * delta)
	pass

func _on_input_event(viewport: Node, event: InputEvent, shape_idx: int) -> void:
	var input_dir = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	if event.is_pressed() and event.button_index == MOUSE_BUTTON_LEFT:
		player.select = self
	pass # Replace with function body.
