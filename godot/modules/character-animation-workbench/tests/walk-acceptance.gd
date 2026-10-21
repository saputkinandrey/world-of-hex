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
	# A treadmill walk needs backward ground travel in support, followed by
	# forward recovery. Pinning both support feet relative to the torso is shuffling.
	workbench.reset_motion()
	var maximum_ground_error: float = 0.0
	var maximum_lift: float = 0.0
	var minimum_foot_y: float = INF
	var maximum_foot_y: float = -INF
	var minimum_pelvis_y: float = INF
	var maximum_pelvis_y: float = -INF
	for frame: int in 120:
		var time: float = float(frame) / 120.0
		_sample(player, "walk_loop", time)
		for side: String in ["L", "R"]:
			var phase: float = fposmod(time + (0.0 if side == "L" else .5), 1.0)
			var calf: Bone2D = skeleton.get_node("Pelvis/Thigh%s/Calf%s" % [side, side])
			var toe: Vector2 = skeleton.to_local(calf.to_global(Vector2(-3 if side == "L" else 3, 5)))
			minimum_foot_y = minf(minimum_foot_y, toe.y)
			maximum_foot_y = maxf(maximum_foot_y, toe.y)
			if phase > .02 and phase < .58:
				var ground_y: float = 50.0 - 10.0 * phase / .6
				maximum_ground_error = maxf(maximum_ground_error, absf(toe.y - ground_y))
			elif phase > .62:
				var ground_y: float = 40.0 + 10.0 * (phase - .6) / .4
				maximum_lift = maxf(maximum_lift, ground_y - toe.y)
		var pelvis: Bone2D = skeleton.get_node("Pelvis")
		minimum_pelvis_y = minf(minimum_pelvis_y, pelvis.position.y)
		maximum_pelvis_y = maxf(maximum_pelvis_y, pelvis.position.y)
		for path: String in POSE_PATHS:
			_check(skeleton.get_node(path).scale.is_equal_approx(Vector2.ONE), "Walk preserves bone scale: %s" % path)
		_check(base.transform == original_base and body.polygon == original_vertices, "Walking preserves source registration and mesh")
	_check(maximum_ground_error < .25, "Support foot follows projected backward ground travel")
	_check(maximum_foot_y - minimum_foot_y > 10.0, "Feet travel forward and backward rather than lift in place")
	_check(maximum_lift > 4.0, "Swing clears the projected ground")
	_check(maximum_pelvis_y - minimum_pelvis_y > 2.5, "Down and Up have distinct body heights")
	_sample(player, "walk_loop", 0)
	var left_contact: Vector2 = skeleton.to_local(skeleton.get_node("Pelvis/ThighL/CalfL").to_global(Vector2(-3, 5)))
	var right_contact: Vector2 = skeleton.to_local(skeleton.get_node("Pelvis/ThighR/CalfR").to_global(Vector2(3, 5)))
	var arm_left: Bone2D = skeleton.get_node("Pelvis/Spine/Chest/ArmL")
	var arm_right: Bone2D = skeleton.get_node("Pelvis/Spine/Chest/ArmR")
	_check(left_contact.y > right_contact.y + 8.0 and arm_left.position.y < arm_right.position.y, "Contact has separated feet and opposing arms")
	_sample(player, "walk_loop", .5)
	_check(arm_left.position.y > arm_right.position.y, "Arms exchange front and back on the opposite contact")
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
	print("South walk acceptance: %s failure(s); ground error %.6f px; swing clearance %.3f px; foot travel %.3f px." % [_failures, maximum_ground_error, maximum_lift, maximum_foot_y - minimum_foot_y])
	scene.free()
	quit(1 if _failures else 0)
