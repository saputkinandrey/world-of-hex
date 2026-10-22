extends "res://modules/character-animation-workbench/tests/author-south-west.gd"

func _initialize() -> void:
	_source_view = "north/"
	_target_view = "north-west/"
	_projection = Vector2(-.8, -.65)
	_depth_sign = -1
	_phase_offset = .5
	super()
