@tool
extends "res://modules/character-animation-workbench/character-animation-workbench.gd"

const RIG_NAMES: Array[String] = ["South", "North", "SouthWest", "NorthWest"]

@export var show_mesh: bool = false:
	set(value):
		show_mesh = value
		if is_node_ready() and _active_rig != null:
			_active_rig.show_mesh = value
			$UI/Panel/Margin/Controls/MeshOverlay.set_pressed_no_signal(value)

var _active_rig: Node2D
var _unavailable_clip: String = ""

func _ready() -> void:
	super()
	var clips: OptionButton = $UI/Panel/Margin/Controls/Clip
	for index: int in clips.item_count:
		if clips.get_item_text(index) == "rig_lean":
			clips.select(index)

func _setup_controls() -> void:
	var clips: OptionButton = $UI/Panel/Margin/Controls/Clip
	var previous: String = clips.get_item_text(clips.selected) if clips.selected >= 0 else ""
	super()
	if previous.is_empty():
		return
	clips.select(-1)
	for index: int in clips.item_count:
		if clips.get_item_text(index) == previous:
			clips.select(index)
			_unavailable_clip = ""
			return
	_unavailable_clip = previous

func apply_source() -> void:
	_source_update_queued = false
	reset_motion()
	var outfits: PackedStringArray = _catalog.get_meta("outfits")
	for rig: Node2D in $Preview/Mirror.get_children():
		rig.visible = false
	if outfit < 0 or outfit >= outfits.size():
		_set_diagnostics(PackedStringArray(["Selected outfit is absent from the imported catalog."]))
		return
	var key: String = "%s:%s:%s" % [outfits[outfit], source_pose, source_direction]
	var snapshots: Dictionary = _catalog.get_meta("snapshots")
	if not snapshots.has(key):
		_set_diagnostics(PackedStringArray(["Snapshot is unavailable: %s" % key]))
		return
	var snapshot: Dictionary = snapshots[key]
	var author: int = CharacterSpriteEntity.DIRECTION_MIRROR_FALLBACK.get(source_direction, source_direction)
	_active_rig = $Preview/Mirror.get_node(RIG_NAMES[author])
	_active_rig.visible = true
	_active_rig.snapshot_key = key
	_active_rig.show_mesh = show_mesh
	$Preview/Mirror.scale = Vector2(-1.0 if snapshot.mirrored else 1.0, 1.0)
	var next_root: NodePath = $AnimationPlayer.get_path_to(_active_rig)
	if $AnimationPlayer.root_node != next_root:
		$AnimationPlayer.remove_animation_library("")
		var result: Error = $AnimationPlayer.add_animation_library("", _active_rig.get_node("AnimationPlayer").get_animation_library(""))
		if result != OK:
			push_error("Cannot select rig animation library: %s" % error_string(result))
			return
		_setup_controls()
	$AnimationPlayer.root_node = next_root
	$AnimationPlayer.clear_caches()
	_evaluate_reset()
	_support_point = snapshot.support_point
	var panel: VBoxContainer = $UI/Panel/Margin/Controls
	panel.get_node("Outfit").select(outfit)
	panel.get_node("Pose").select(source_pose)
	panel.get_node("Direction").select(source_direction)
	var messages: PackedStringArray = _active_rig.diagnostics.duplicate()
	if not _unavailable_clip.is_empty() and panel.get_node("Clip").selected < 0:
		messages.append("Clip '%s' is unavailable in this view. Select an authored clip from this view's library." % _unavailable_clip)
	if _catalog.get_meta("source_hash") != FileAccess.get_sha256(SOURCE_PATH):
		messages.append("Saved source scene changed. Reimport the base catalog.")
	_set_diagnostics(messages)
	queue_redraw()

func reset_motion() -> void:
	$AnimationPlayer.stop()
	for rig: Node2D in $Preview/Mirror.get_children():
		rig.get_node("AnimationPlayer").stop()
		var skeleton: Skeleton2D = rig.get_node("Skeleton2D")
		for index: int in skeleton.get_bone_count():
			skeleton.get_bone(index).apply_rest()
	for motion: Node2D in get_tree().get_nodes_in_group("skeletal_weapon_motion"):
		if is_ancestor_of(motion):
			motion.transform = Transform2D.IDENTITY
	_evaluate_reset()

func _evaluate_reset() -> void:
	$AnimationPlayer.play("RESET")
	$AnimationPlayer.advance(0.0)
	$AnimationPlayer.stop(true)

func _on_mesh_toggled(value: bool) -> void:
	show_mesh = value

func _on_play_pressed() -> void:
	if $UI/Panel/Margin/Controls/Clip.selected < 0:
		var messages: PackedStringArray = _diagnostics.duplicate()
		messages.append("Select a compatible clip before playback.")
		_set_diagnostics(messages)
		return
	super()

func _set_diagnostics(messages: PackedStringArray) -> void:
	_diagnostics = messages
	$UI/Panel/Margin/Controls/DiagnosticsScroll/Diagnostics.text = "\n".join(messages) if not messages.is_empty() else "Source composition available."
	update_configuration_warnings()
