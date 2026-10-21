extends SubViewportContainer

signal preview_ready
@export var autoplay: bool = true

func _ready() -> void:
	RenderingServer.set_default_clear_color(Color(.10, .12, .15))
	for name: String in ["South", "North"]:
		var workbench: Node2D = get_node("Viewport/" + name)
		workbench.get_node("UI").hide()
		workbench.get_node("Preview").position = Vector2(228, 215)
	await get_tree().process_frame
	for name: String in ["South", "North"]:
		var workbench: Node2D = get_node("Viewport/" + name)
		for slot: String in ["WeaponBase", "WeaponSecondaryBase"]:
			workbench._active_rig.get_node("Layers/%s/PivotOrigin/MotionPivot/CounterPivot/Surface" % slot).hide()
	if autoplay:
		$SequencePlayer.play("comparison")
	preview_ready.emit()
