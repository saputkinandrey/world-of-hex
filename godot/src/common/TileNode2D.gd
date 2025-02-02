class_name TileNode2D
extends Node

@export var tilemap: TileMapLayer

func _ready() -> void:
	self.position = tilemap.map_to_local(tilemap.local_to_map(self.position))
	pass


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass
