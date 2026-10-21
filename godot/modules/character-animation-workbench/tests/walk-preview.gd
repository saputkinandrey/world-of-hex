extends SubViewportContainer

signal preview_ready

@export var play_sequence: bool = false

func _ready() -> void:
	var workbench: Node2D = $Viewport/Workbench
	workbench.get_node("UI").visible = false
	workbench.get_node("Preview").position = Vector2(228, 215)
	RenderingServer.set_default_clear_color(Color(0.10, 0.12, 0.15))
	# Flush the source setters' deferred refresh before changing preview visibility.
	await get_tree().process_frame
	var rig: Node2D = workbench._active_rig
	for slot: String in ["WeaponBase", "WeaponSecondaryBase"]:
		rig.get_node("Layers/%s/PivotOrigin/MotionPivot/CounterPivot/Surface" % slot).visible = false
	if play_sequence:
		$Viewport/Caption.text = "South | idle > walk > idle"
		$SequencePlayer.play("walk_sequence")
	else:
		workbench.get_node("AnimationPlayer").play("walk_loop")
	preview_ready.emit()
