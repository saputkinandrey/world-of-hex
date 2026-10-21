@tool
extends Node2D

const CATALOG_PATH = "res://modules/character-animation-workbench/base-catalog.tres"
const IMPORT_SCRIPT = "res://modules/character-animation-workbench/import-source.gd"
const SOURCE_PATH = "res://modules/character-sprite-tool/character-sprite-tool.tscn"

@export var outfit: int = 2:
	set(value):
		outfit = value
		_queue_source_update()
@export_enum("Idle", "Walk", "Aim pistol", "Longarm", "Aim 2 pistols", "Flinch", "Swing 1h", "Thrust 1h") var source_pose: int = 0:
	set(value):
		source_pose = value
		_queue_source_update()
@export_enum("South", "North", "South west", "North west", "South east", "North east") var source_direction: int = 0:
	set(value):
		source_direction = value
		_queue_source_update()
@export_range(0.25, 4.0, 0.05) var preview_zoom: float = 3.0:
	set(value):
		preview_zoom = value
		if is_node_ready():
			$Preview.scale = Vector2.ONE * value
		queue_redraw()
@export var show_grid: bool = true:
	set(value):
		show_grid = value
		queue_redraw()
@export var show_markers: bool = true:
	set(value):
		show_markers = value
		queue_redraw()
@export var show_stage: bool = true:
	set(value):
		show_stage = value
		queue_redraw()
@export_tool_button("Reimport saved source", "Reload") var reimport_action: Callable = reimport_source

var _catalog: Resource
var _source_update_queued: bool = false
var _diagnostics: PackedStringArray = []
var _support_point: Vector2 = Vector2.ZERO

func _ready() -> void:
	_catalog = load(CATALOG_PATH)
	$Preview.scale = Vector2.ONE * preview_zoom
	_setup_controls()
	apply_source()

func _validate_property(property: Dictionary) -> void:
	if property.name == "outfit":
		var catalog: Resource = _catalog if _catalog != null else load(CATALOG_PATH)
		property.hint = PROPERTY_HINT_ENUM
		property.hint_string = ",".join(catalog.get_meta("outfits"))

func _queue_source_update() -> void:
	if is_node_ready() and not _source_update_queued:
		_source_update_queued = true
		call_deferred("apply_source")

func _setup_controls() -> void:
	var panel: VBoxContainer = $UI/Panel/Margin/Controls
	panel.get_node("Outfit").clear()
	for label: String in _catalog.get_meta("outfits"):
		panel.get_node("Outfit").add_item(label)
	panel.get_node("Pose").clear()
	for label: String in _catalog.get_meta("poses"):
		panel.get_node("Pose").add_item(label.capitalize())
	panel.get_node("Direction").clear()
	for label: String in _catalog.get_meta("directions"):
		panel.get_node("Direction").add_item(label.capitalize())
	panel.get_node("Clip").clear()
	for clip: String in $AnimationPlayer.get_animation_list():
		panel.get_node("Clip").add_item(clip)

func apply_source() -> void:
	_source_update_queued = false
	reset_motion()
	var outfits: PackedStringArray = _catalog.get_meta("outfits")
	if outfit < 0 or outfit >= outfits.size():
		$Preview/Mirror.visible = false
		_set_diagnostics(PackedStringArray(["Selected outfit is absent; reimport or select an existing outfit."]))
		return
	var key: String = "%s:%s:%s" % [outfits[outfit], source_pose, source_direction]
	var snapshots: Dictionary = _catalog.get_meta("snapshots")
	if not snapshots.has(key):
		$Preview/Mirror.visible = false
		_set_diagnostics(PackedStringArray(["Source combination is unavailable: %s" % key]))
		return
	$Preview/Mirror.visible = true
	var snapshot: Dictionary = snapshots[key]
	_support_point = snapshot.support_point
	var mirrored: bool = snapshot.mirrored
	$Preview/Mirror.scale = Vector2(-1.0 if mirrored else 1.0, 1.0)
	for base: Node in get_tree().get_nodes_in_group("animation_workbench_base"):
		if not is_ancestor_of(base):
			continue
		var slot: String = base.get_meta("slot")
		var state: Dictionary = snapshot.layers[slot]
		_apply_base(base, state, mirrored)
	var panel: VBoxContainer = $UI/Panel/Margin/Controls
	panel.get_node("Outfit").select(outfit)
	panel.get_node("Pose").select(source_pose)
	panel.get_node("Direction").select(source_direction)
	var messages: PackedStringArray = snapshot.diagnostics.duplicate()
	if _catalog.get_meta("source_hash") != FileAccess.get_sha256(SOURCE_PATH):
		messages.append("Saved source scene changed. Reimport the base catalog.")
	_set_diagnostics(messages)
	queue_redraw()

func _apply_base(base: Node2D, state: Dictionary, mirrored: bool) -> void:
	base.position = state.position * Vector2(-1.0 if mirrored else 1.0, 1.0)
	base.rotation = -state.rotation if mirrored else state.rotation
	base.scale = state.scale
	base.visible = state.visible
	var visual: Sprite2D = base.get_node("PivotOrigin/MotionPivot/CounterPivot/Visual")
	visual.texture = state.texture
	visual.hframes = state.hframes
	visual.vframes = state.vframes
	visual.frame = state.frame
	visual.flip_h = state.flip_h != mirrored
	visual.flip_v = state.flip_v
	visual.centered = state.centered
	visual.offset = state.offset * Vector2(-1.0 if mirrored else 1.0, 1.0)
	visual.modulate = state.modulate
	visual.z_index = state.z_index

func reset_motion() -> void:
	$AnimationPlayer.stop()
	$AnimationPlayer.play("RESET")
	$AnimationPlayer.advance(0)
	$AnimationPlayer.stop(true)
	# Also neutralize new motion controllers that have no RESET track yet.
	for motion: Node in get_tree().get_nodes_in_group("animation_workbench_motion"):
		if is_ancestor_of(motion):
			motion.position = Vector2.ZERO
			motion.rotation = 0.0
			motion.scale = Vector2.ONE

func reimport_source() -> void:
	var output: Array = []
	var result: int = OS.execute(OS.get_executable_path(), PackedStringArray([
		"--headless", "--path", ProjectSettings.globalize_path("res://"), "--script", IMPORT_SCRIPT,
		"--log-file", ProjectSettings.globalize_path("res://modules/character-animation-workbench/tests/import-editor.log"),
	]), output, true)
	if result != 0:
		_set_diagnostics(PackedStringArray(["Source import failed (%s): %s" % [result, "\n".join(output)]]))
		push_error("Source import failed: %s" % "\n".join(output))
		return
	_catalog = ResourceLoader.load(CATALOG_PATH, "", ResourceLoader.CACHE_MODE_REPLACE)
	notify_property_list_changed()
	_setup_controls()
	apply_source()

func _set_diagnostics(messages: PackedStringArray) -> void:
	_diagnostics = messages
	$UI/Panel/Margin/Controls/Diagnostics.text = "\n".join(messages) if not messages.is_empty() else "Source composition available."
	update_configuration_warnings()

func _get_configuration_warnings() -> PackedStringArray:
	return _diagnostics

func _on_outfit_selected(index: int) -> void:
	outfit = index

func _on_pose_selected(index: int) -> void:
	source_pose = index

func _on_direction_selected(index: int) -> void:
	source_direction = index

func _on_play_pressed() -> void:
	var choice: OptionButton = $UI/Panel/Margin/Controls/Clip
	var clip: String = choice.get_item_text(choice.selected)
	reset_motion()
	$AnimationPlayer.play(clip)

func _on_stop_pressed() -> void:
	reset_motion()

func _on_speed_changed(value: float) -> void:
	$AnimationPlayer.speed_scale = value

func _on_zoom_changed(value: float) -> void:
	preview_zoom = value

func _on_grid_toggled(value: bool) -> void:
	show_grid = value

func _draw() -> void:
	if not show_stage:
		return
	var origin: Vector2 = $Preview.position + _support_point * preview_zoom if is_node_ready() else Vector2(900, 620)
	draw_rect(Rect2(360, 0, 1560, 1080), Color(0.10, 0.12, 0.15))
	if show_grid:
		for x: int in range(372, 1920, 32):
			draw_line(Vector2(x, 0), Vector2(x, 1080), Color(0.16, 0.18, 0.21))
		for y: int in range(12, 1080, 32):
			draw_line(Vector2(360, y), Vector2(1920, y), Color(0.16, 0.18, 0.21))
	draw_line(origin - Vector2(350, 0), origin + Vector2(350, 0), Color(0.36, 0.5, 0.56), 1)
	if show_markers:
		draw_line(origin - Vector2(10, 0), origin + Vector2(10, 0), Color.CORAL, 2)
		draw_line(origin - Vector2(0, 10), origin + Vector2(0, 10), Color.CORAL, 2)
