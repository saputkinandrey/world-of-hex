class_name MovableTrait
extends Node

@export var state: MovableState

@onready var IdleState: MovableState = $IdleState
@onready var MovingState: MovableState = $MovingState

@onready var parent: ShipObject = get_parent()
@onready var movableData: MovableData = parent.movableData
@onready var tileMapLayer: TileMapLayer = parent.tileMapLayer

var timePassed: float = 0

func move(movement:Vector2i, duration:int=1000):
	print("MOVING");
	parent.velocity = Vector2i(5,5)
	parent.move_and_slide()
	#parent.move_and_collide(Vector2i(3,3)*1)
	state = $MovingState
	state.reset(duration)
	
	#movableData.desiredPosition = movableData.currentPosition + movement
	#movableData.currentPosition = movableData.desiredPosition
	#parent.position = tilemap.map_to_local(movableData.currentPosition)
	pass
	
func updateVelocity(speed:int):
	pass
	#self.velocityX = self.tilemap.tile_set.tile_size.x * speed
	#self.velocityY = self.tilemap.tile_set.tile_size.y * speed


func _ready() -> void:
	if tileMapLayer && tileMapLayer.tile_set:
		movableData.currentPosition = tileMapLayer.local_to_map(parent.position)
	#parent.position = tileMapLayer.map_to_local(movableData.currentPosition)
	pass


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	#if tileMapLayer && tileMapLayer.tile_set:
		#parent.position = tileMapLayer.map_to_local(movableData.currentPosition)
	pass
