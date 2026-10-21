@tool
extends Node2D

@export var pivot_offset: Vector2 = Vector2.ZERO:
	set(value):
		pivot_offset = value
		if is_node_ready():
			_update_pivot()

func _ready() -> void:
	_update_pivot()

func _update_pivot() -> void:
	$PivotOrigin.position = pivot_offset
	$PivotOrigin/MotionPivot/CounterPivot.position = -pivot_offset
