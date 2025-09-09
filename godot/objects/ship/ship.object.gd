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

var speed = 10

func _ready() -> void:
	#self.position = Vector2i(0,0)
	self.sprite.updateTexture(self.shipData.type)
	self.sprite._ready()
	self.movable._ready()
	pass
	
func _process(delta: float) -> void:
	self.movable._process(delta)
	self.sprite._process(delta)
	velocity = FacedData.Direction2Vector2i[facedData.direction] * speed
	move_and_collide(velocity * delta)
	pass

func _on_input_event(viewport: Node, event: InputEvent, shape_idx: int) -> void:
	var input_dir = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	if event.is_pressed() and event.button_index == MOUSE_BUTTON_LEFT:
		player.select = self
	pass # Replace with function body.
