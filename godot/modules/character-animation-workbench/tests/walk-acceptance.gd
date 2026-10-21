extends SceneTree

const SCENE = preload("res://modules/character-animation-workbench/tests/walk-preview.tscn")
const SOUTH = preload("res://modules/character-animation-workbench/animations/skeletal-library.tres")
const CLIPS: Array[String] = ["idle_to_walk", "walk_loop", "walk_to_idle"]
const POSE_PATHS: Array[String] = [
	"Pelvis", "Pelvis/Spine", "Pelvis/Spine/Chest", "Pelvis/Spine/Chest/Head",
	"Pelvis/Spine/Chest/ArmL", "Pelvis/Spine/Chest/ArmL/ForearmL",
	"Pelvis/Spine/Chest/ArmR", "Pelvis/Spine/Chest/ArmR/ForearmR",
	"Pelvis/ThighL", "Pelvis/ThighL/CalfL", "Pelvis/ThighR", "Pelvis/ThighR/CalfR",
]
var _failures: int = 0

func _initialize() -> void:
	call_deferred("_run")

func _check(condition: bool, message: String) -> void:
	if not condition:
		_failures += 1
		push_error("FAIL: %s" % message)

func _sample(player: AnimationPlayer, clip: String, time: float) -> void:
	player.play(clip)
	player.seek(time, true)
	player.pause()

func _pose(skeleton: Skeleton2D) -> Array[Transform2D]:
	var result: Array[Transform2D] = []
	for path: String in POSE_PATHS:
		result.append(skeleton.get_node(path).transform)
	return result

func _compare(a: Array[Transform2D], b: Array[Transform2D], label: String) -> void:
	for index: int in a.size():
		_check(a[index].is_equal_approx(b[index]), "%s: %s" % [label, POSE_PATHS[index]])

func _run() -> void:
	var scene: Node = SCENE.instantiate()
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var workbench: Node2D = scene.get_node("Viewport/Workbench")
	var rig: Node2D = workbench._active_rig
	var skeleton: Skeleton2D = rig.get_node("Skeleton2D")
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	var base: Node2D = rig.get_node("Layers/BodyBase")
	var original_base: Transform2D = base.transform
	var body: Polygon2D = base.get_node("Surface")
	var original_vertices: PackedVector2Array = body.polygon.duplicate()
	var shirt: Polygon2D = rig.get_node("Layers/ShirtsBase/Surface")
	var original_weights: PackedFloat32Array = shirt.get_bone_weights(1).duplicate()
	for clip: String in CLIPS:
		_check(player.has_animation(clip), "Saved clip exists: %s" % clip)
		var animation: Animation = player.get_animation(clip)
		_check(animation.get_track_count() >= 10, "Gait uses articulated multi-bone tracks")
		for track: int in animation.get_track_count():
			_check(str(animation.track_get_path(track)).begins_with("Skeleton2D/"), "Motion never targets base/snapshot or PNG properties")
	var reloaded: AnimationLibrary = ResourceLoader.load(SOUTH.resource_path, "", ResourceLoader.CACHE_MODE_IGNORE)
	for clip: String in CLIPS:
		_check(reloaded.has_animation(clip), "Clip survives independent disk reload: %s" % clip)
	_check(player.get_animation("walk_loop").loop_mode == Animation.LOOP_LINEAR, "Walk is a loop")
	_check(player.get_animation("idle_to_walk").loop_mode == Animation.LOOP_NONE and player.get_animation("walk_to_idle").loop_mode == Animation.LOOP_NONE, "Transitions do not loop")
	workbench.reset_motion()
	var idle: Array[Transform2D] = _pose(skeleton)
	_sample(player, "idle_to_walk", 0)
	_compare(idle, _pose(skeleton), "Start begins at idle")
	_sample(player, "idle_to_walk", .5)
	var entry: Array[Transform2D] = _pose(skeleton)
	_sample(player, "walk_loop", 0)
	var anchor: Array[Transform2D] = _pose(skeleton)
	_compare(entry, anchor, "Start joins walking phase")
	_sample(player, "walk_loop", 1.0)
	_compare(anchor, _pose(skeleton), "Loop endpoint matches start")
	_sample(player, "walk_to_idle", 0)
	_compare(anchor, _pose(skeleton), "Stop begins at walking phase")
	_sample(player, "walk_to_idle", .5)
	_compare(idle, _pose(skeleton), "Stop ends at idle")
	# In support, the whole calf transform is stationary, not just one toe.
	workbench.reset_motion()
	var left_rest: Transform2D = skeleton.get_node("Pelvis/ThighL/CalfL").global_transform
	var right_rest: Transform2D = skeleton.get_node("Pelvis/ThighR/CalfR").global_transform
	var maximum_drift: float = 0.0
	var maximum_lift: float = 0.0
	for frame: int in 120:
		var time: float = float(frame) / 120.0
		_sample(player, "walk_loop", time)
		var phase: float = fposmod(time + .125, 1.0)
		var calf: Bone2D = skeleton.get_node("Pelvis/ThighR/CalfR" if phase < .5 else "Pelvis/ThighL/CalfL")
		var expected: Transform2D = right_rest if phase < .5 else left_rest
		maximum_drift = maxf(maximum_drift, calf.global_position.distance_to(expected.origin) / workbench.preview_zoom)
		var swing: Bone2D = skeleton.get_node("Pelvis/ThighL/CalfL" if phase < .5 else "Pelvis/ThighR/CalfR")
		var swing_rest: Transform2D = left_rest if phase < .5 else right_rest
		maximum_lift = maxf(maximum_lift, (swing_rest.origin.y - swing.global_position.y) / workbench.preview_zoom)
		_check(base.transform == original_base and body.polygon == original_vertices, "Walking preserves source registration and mesh")
	_check(maximum_drift < .15, "Support-foot drift below 0.15 source pixels")
	_check(maximum_lift > 2.5, "Swing foot is visibly lifted")
	workbench.outfit = 0
	workbench.apply_source()
	_sample(player, "walk_loop", .2)
	var white: Array[Transform2D] = _pose(skeleton)
	workbench.outfit = 1
	workbench.apply_source()
	_sample(player, "walk_loop", .2)
	_compare(white, _pose(skeleton), "Both shirt variants use the same bone keys")
	_check(shirt.get_bone_weights(1) == original_weights, "Appearance changes preserve painted skin weights")
	for view: String in ["north", "south-west", "north-west"]:
		var library: AnimationLibrary = load("res://modules/character-animation-workbench/animations/skeletal-library-%s.tres" % view)
		for clip: String in CLIPS:
			_check(not library.has_animation(clip), "Walking is restricted to South")
	workbench.reset_motion()
	var sequence_player: AnimationPlayer = scene.get_node("SequencePlayer")
	sequence_player.play("walk_sequence")
	sequence_player.advance(0.0)
	for step: int in 80:
		sequence_player.advance(.05)
		player.advance(.05)
		var time: float = float(step + 1) * .05
		if is_equal_approx(time, 1.0):
			_check(player.assigned_animation == "idle_to_walk", "Native animation track starts locomotion")
		if is_equal_approx(time, 2.0):
			_check(player.assigned_animation == "walk_loop", "Native animation track loops walking")
		if is_equal_approx(time, 3.5):
			_check(player.assigned_animation == "walk_to_idle", "Native animation track starts stopping")
		if is_equal_approx(time, 4.0):
			_compare(idle, _pose(skeleton), "Native preview sequence returns to idle")
	sequence_player.stop()
	print("South walk acceptance: %s failure(s); support drift %.6f px; swing lift %.3f px." % [_failures, maximum_drift, maximum_lift])
	scene.free()
	quit(1 if _failures else 0)
