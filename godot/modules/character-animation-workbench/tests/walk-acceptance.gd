extends SceneTree

const SCENE = preload("res://modules/character-animation-workbench/tests/walk-preview.tscn")
const SOUTH = preload("res://modules/character-animation-workbench/animations/skeletal-library.tres")
const CLIPS: Array[String] = ["idle_to_walk", "walk_loop", "walk_to_idle"]
const POSE_PATHS: Array[String] = [
	"Pelvis", "Pelvis/Spine", "Pelvis/Spine/Chest", "Pelvis/Spine/Chest/Head",
	"Pelvis/Spine/Chest/ArmL", "Pelvis/Spine/Chest/ArmL/ForearmL",
	"Pelvis/Spine/Chest/ArmR", "Pelvis/Spine/Chest/ArmR/ForearmR",
	"Pelvis/ThighL", "Pelvis/ThighL/CalfL", "Pelvis/ThighR", "Pelvis/ThighR/CalfR",
	"Pelvis/ThighL/CalfL/FootL", "Pelvis/ThighR/CalfR/FootR",
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

func _check_calibrated_contacts(workbench: Node2D) -> Dictionary:
	var keys: Array[String] = ["south","north","south-west","north-west"]
	var points: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://modules/character-animation-workbench/rig-calibration.json")).views[keys[workbench._active_rig.authored_direction]]
	var skeleton: Skeleton2D = workbench._active_rig.get_node("Skeleton2D")
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	var surface: Polygon2D = workbench._active_rig.get_node("Layers/BodyBase/Surface")
	var size: Vector2 = Vector2(surface.get_meta("frame_size"))
	var forward: Vector2 = Vector2(points.forward[0],points.forward[1])
	var error: float = 0.0
	var clearance: float = 0.0
	var flight: int = 0
	for clip: String in ["walk_loop","run_loop"]:
		var animation: Animation = player.get_animation(clip)
		var run: bool = clip == "run_loop"
		var support: float = .38 if run else .6
		var stride: float = 3.8 if run else 2.5
		for side: String in ["L","R"]:
			var toe: Marker2D = skeleton.get_node("Pelvis/Thigh%s/Calf%s/Foot%s/Toe%s" % [side,side,side,side])
			var contact: Vector2
			for sample: int in 30:
				var phase: float = support*(.05+.9*sample/29.0)
				_sample(player,clip,fposmod(phase-(0 if side == "L" else .5),1)*animation.length)
				var position: Vector2 = skeleton.to_local(toe.global_position)+forward*(2*stride*phase/support)
				if sample == 0:
					contact = position
				error = maxf(error,position.distance_to(contact))
		for frame: int in 160:
			var phase: float = frame/160.0
			_sample(player,clip,phase*animation.length)
			var airborne: int = 0
			for side: String in ["L","R"]:
				var toe: Marker2D = skeleton.get_node("Pelvis/Thigh%s/Calf%s/Foot%s/Toe%s" % [side,side,side,side])
				var depths: PackedFloat32Array = animation.get_meta("leg_depths")["Foot"+side]
				var key: float = phase*(depths.size()-1)
				var depth: float = lerpf(depths[floori(key)],depths[ceili(key)],fposmod(key,1))
				var height: float = float(points["Toe"+side][1])-size.y*.5-(skeleton.to_local(toe.global_position).y-forward.y*depth)
				clearance = maxf(clearance,height)
				if height > 1:
					airborne += 1
			if run and airborne == 2:
				flight += 1
			for path: String in POSE_PATHS:
				_check(skeleton.get_node(path).scale.is_equal_approx(Vector2.ONE), "Calibrated bones retain unit scale")
	_check(error < .025, "Actual planted toe markers do not slide relative to travel")
	_check(clearance > 3.8 and flight > 0, "Foot markers show swing clearance and a both-feet flight phase")
	return {"error":error,"clearance":clearance,"flight":flight}

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
	var contact_stats: Dictionary = _check_calibrated_contacts(workbench)
	_check(base.transform == original_base and body.polygon == original_vertices, "Walking preserves source registration and mesh")
	workbench.outfit = 0
	workbench.apply_source()
	_sample(player, "walk_loop", .2)
	var white: Array[Transform2D] = _pose(skeleton)
	workbench.outfit = 1
	workbench.apply_source()
	_sample(player, "walk_loop", .2)
	_compare(white, _pose(skeleton), "Both shirt variants use the same bone keys")
	_check(shirt.get_bone_weights(1) == original_weights, "Appearance changes preserve painted skin weights")
	for view: String in ["north-west"]:
		var library: AnimationLibrary = load("res://modules/character-animation-workbench/animations/skeletal-library-%s.tres" % view)
		for clip: String in CLIPS:
			_check(library.has_animation(clip), "Walking is available for the authored rear diagonal")
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
	print("South walk acceptance: %s failure(s); planted drift %.6f px; swing clearance %.3f px." % [_failures, contact_stats.error, contact_stats.clearance])
	scene.free()
	quit(1 if _failures else 0)
