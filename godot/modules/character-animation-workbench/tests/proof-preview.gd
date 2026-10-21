extends SubViewportContainer

func _ready() -> void:
	$Viewport/Rig/AnimationPlayer.play("rig_lean")
