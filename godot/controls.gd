extends Control

@export var player: Node


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass

func _on_left_pressed() -> void:
	player.select.turnLeft()
	pass # Replace with function body.


func _on_right_pressed() -> void:
	player.select.turnRight()
	pass # Replace with function body.


func _on_move_pressed() -> void:
	player.select.moveForward()
	pass # Replace with function body.
