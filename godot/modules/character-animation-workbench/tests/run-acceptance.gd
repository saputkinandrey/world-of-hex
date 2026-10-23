extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const RUN_SCENE = preload("res://modules/character-animation-workbench/tests/run-preview.tscn")
const RUN_CLIPS: Array[String] = ["run_loop", "walk_to_run", "run_to_walk", "idle_to_run", "run_to_idle"]

func _run() -> void:
	var scene: Node = RUN_SCENE.instantiate()
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var workbench: Node2D = scene.get_node("Viewport/Workbench")
	var rig: Node2D = workbench._active_rig
	var skeleton: Skeleton2D = rig.get_node("Skeleton2D")
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	var body: Polygon2D = rig.get_node("Layers/BodyBase/Surface")
	var vertices: PackedVector2Array = body.polygon.duplicate()
	var base_transform: Transform2D = body.get_parent().transform
	var weights: PackedFloat32Array = body.get_bone_weights(1).duplicate()
	var library: AnimationLibrary = ResourceLoader.load(SOUTH.resource_path, "", ResourceLoader.CACHE_MODE_IGNORE)
	for clip: String in RUN_CLIPS:
		_check(library.has_animation(clip), "Run clip survives disk reload: " + clip)
		var animation: Animation = player.get_animation(clip)
		_check(animation.loop_mode == (Animation.LOOP_LINEAR if clip == "run_loop" else Animation.LOOP_NONE), "Correct loop mode: " + clip)
		for track: int in animation.get_track_count():
			var path: String = str(animation.track_get_path(track))
			_check(path.begins_with("Skeleton2D/") and not path.ends_with(":scale"), "Run keys only bones without stretching")
	workbench.reset_motion()
	var idle: Array[Transform2D] = _pose(skeleton)
	_sample(player, "walk_loop", 0)
	var walk: Array[Transform2D] = _pose(skeleton)
	_sample(player, "run_loop", 0)
	var run: Array[Transform2D] = _pose(skeleton)
	_sample(player, "run_loop", player.get_animation("run_loop").length)
	_compare(run, _pose(skeleton), "Run loop closes")
	for clip: String in ["walk_to_run", "run_to_walk", "idle_to_run", "run_to_idle"]:
		var first: Array[Transform2D] = walk if clip == "walk_to_run" else (idle if clip == "idle_to_run" else run)
		var last: Array[Transform2D] = run if clip.ends_with("to_run") else (walk if clip == "run_to_walk" else idle)
		_sample(player, clip, 0)
		_compare(first, _pose(skeleton), clip + " begins at source pose")
		_sample(player, clip, player.get_animation(clip).length)
		_compare(last, _pose(skeleton), clip + " ends at target pose")
	var contact_stats: Dictionary = _check_calibrated_contacts(workbench)
	_check(body.polygon == vertices and body.get_bone_weights(1) == weights and body.get_parent().transform == base_transform, "Calibrated motion preserves source mesh, weights and registration")
	_check(player.get_animation("run_loop").length < player.get_animation("walk_loop").length, "Run cadence is faster than walk")
	for view: String in ["north-west"]:
		var other: AnimationLibrary = load("res://modules/character-animation-workbench/animations/skeletal-library-%s.tres" % view)
		for clip: String in RUN_CLIPS:
			_check(other.has_animation(clip), "Running is available for the authored rear diagonal")
	var outer: AnimationPlayer = scene.get_node("SequencePlayer")
	workbench.reset_motion()
	outer.play("run_sequence")
	outer.advance(0)
	var visited: Dictionary = {}
	for step: int in 290:
		outer.advance(1.0 / 30)
		player.advance(1.0 / 30)
		visited[player.assigned_animation] = true
	for clip: String in RUN_CLIPS:
		_check(visited.has(clip), "Native sequence plays " + clip)
	_compare(idle, _pose(skeleton), "Native sequence ends at idle")
	outer.stop()
	print("South run acceptance: %s failure(s); ground error %.6f px; clearance %.3f px; flight %s/160 samples." % [_failures, contact_stats.error, contact_stats.clearance, contact_stats.flight])
	scene.free()
	quit(1 if _failures else 0)
