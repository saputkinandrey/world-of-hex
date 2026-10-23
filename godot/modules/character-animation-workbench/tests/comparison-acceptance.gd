extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")
const NORTH = preload("res://modules/character-animation-workbench/animations/skeletal-library-north.tres")
const MOTIONS: Array[String] = ["walk_loop", "idle_to_walk", "walk_to_idle", "run_loop", "walk_to_run", "run_to_walk", "idle_to_run", "run_to_idle"]

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var south: Node2D = scene.get_node("Viewport/South")
	var north: Node2D = scene.get_node("Viewport/North")
	var south_player: AnimationPlayer = south.get_node("AnimationPlayer")
	var north_player: AnimationPlayer = north.get_node("AnimationPlayer")
	var south_skeleton: Skeleton2D = south._active_rig.get_node("Skeleton2D")
	var north_skeleton: Skeleton2D = north._active_rig.get_node("Skeleton2D")
	var body: Polygon2D = north._active_rig.get_node("Layers/BodyBase/Surface")
	var vertices: PackedVector2Array = body.polygon.duplicate()
	var weights: PackedFloat32Array = body.get_bone_weights(1).duplicate()
	var registration: Transform2D = body.get_parent().transform
	_check(south.source_direction == 0 and north.source_direction == 1 and north._active_rig.authored_direction == 1, "Comparison uses actual South and North rigs")
	_check(north._active_rig.snapshot_key.ends_with(":0:1"), "North uses the Idle North snapshot")
	_check(north._active_rig.get_node("Layers/ShirtsBase").visible and north._active_rig.get_node("Layers/BootsBase").visible, "North clothes bind without missing-asset substitution")
	var reloaded: AnimationLibrary = ResourceLoader.load(NORTH.resource_path, "", ResourceLoader.CACHE_MODE_IGNORE)
	for clip: String in MOTIONS:
		_check(reloaded.has_animation(clip), "North clip survives disk reload: " + clip)
		var animation: Animation = north_player.get_animation(clip)
		_check(animation.resource_path.contains("/animations/north/"), "North owns an independent native clip")
		_check(is_equal_approx(animation.length, south_player.get_animation(clip).length), "Both directions have matching duration: " + clip)
		_check(animation.loop_mode == south_player.get_animation(clip).loop_mode, "Both directions have matching loop mode: " + clip)
		for track: int in animation.get_track_count():
			var path: String = str(animation.track_get_path(track))
			_check(path.begins_with("Skeleton2D/") and not path.ends_with(":scale"), "North only animates bones without scale")
	north.reset_motion()
	var anchors: Dictionary = {"idle": _pose(north_skeleton)}
	for name: String in ["walk", "run"]:
		_sample(north_player, name + "_loop", 0)
		anchors[name] = _pose(north_skeleton)
		_sample(north_player, name + "_loop", north_player.get_animation(name + "_loop").length)
		_compare(anchors[name], _pose(north_skeleton), "North loop closes: " + name)
	for clip: String in MOTIONS:
		if not clip.contains("_to_"):
			continue
		var names: PackedStringArray = clip.split("_to_")
		_sample(north_player, clip, 0)
		_compare(anchors[names[0]], _pose(north_skeleton), "North transition entry: " + clip)
		_sample(north_player, clip, north_player.get_animation(clip).length)
		_compare(anchors[names[1]], _pose(north_skeleton), "North transition exit: " + clip)
	var contact_stats: Dictionary = _check_calibrated_contacts(north)
	_check(body.polygon == vertices and body.get_bone_weights(1) == weights and body.get_parent().transform == registration, "Calibrated motion preserves source mesh, weights and registration")
	var outer: AnimationPlayer = scene.get_node("SequencePlayer")
	var sequence: Animation = outer.get_animation("comparison")
	for key: int in sequence.track_get_key_count(0):
		_check(sequence.track_get_key_time(0, key) == sequence.track_get_key_time(1, key) and sequence.animation_track_get_key_animation(0, key) == sequence.animation_track_get_key_animation(1, key), "Native sequence tracks use identical events")
	south.reset_motion()
	north.reset_motion()
	outer.play("comparison")
	outer.advance(0)
	var visited: Dictionary = {}
	for step: int in 290:
		outer.advance(1.0 / 30)
		south_player.advance(1.0 / 30)
		north_player.advance(1.0 / 30)
		_check(south_player.assigned_animation == north_player.assigned_animation, "Native playback stays synchronized")
		_check(is_equal_approx(south_player.current_animation_position, north_player.current_animation_position), "Native playback phase stays synchronized")
		visited[north_player.assigned_animation] = true
	for clip: String in MOTIONS:
		_check(visited.has(clip), "Comparison plays " + clip)
	_compare(anchors["idle"], _pose(north_skeleton), "Comparison finishes at North idle")
	outer.stop()
	print("S/N acceptance: %s failure(s); North ground error %.6f px; run flight %s/160 samples." % [_failures, contact_stats.error, contact_stats.flight])
	scene.free()
	quit(1 if _failures else 0)
