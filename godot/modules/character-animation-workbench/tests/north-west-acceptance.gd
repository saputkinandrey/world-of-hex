extends "res://modules/character-animation-workbench/tests/comparison-acceptance.gd"

const DIAGONAL = preload("res://modules/character-animation-workbench/animations/skeletal-library-north-west.tres")

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var workbench: Node2D = scene.get_node("Viewport/NorthWest")
	var north: Node2D = scene.get_node("Viewport/North")
	var rig: Node2D = workbench._active_rig
	var skeleton: Skeleton2D = rig.get_node("Skeleton2D")
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	var north_player: AnimationPlayer = north.get_node("AnimationPlayer")
	var body: Polygon2D = rig.get_node("Layers/BodyBase/Surface")
	var vertices: PackedVector2Array = body.polygon.duplicate()
	var uv: PackedVector2Array = body.uv.duplicate()
	var weights: PackedFloat32Array = body.get_bone_weights(1).duplicate()
	var registration: Transform2D = body.get_parent().transform
	_check(workbench.source_direction == 3 and rig.authored_direction == 3 and not rig.mirrored, "NW is an authored source direction, not a reflected view")
	_check(body.texture.resource_path.contains("/Char1_north_west_idle/Idle_body_NW1.png"), "NW uses its own original source PNG")
	_check(not rig.get_node("Layers/ShirtsBase").visible and not rig.get_node("Layers/HairBase").visible, "Missing NW clothing/hair remain absent without replacement assets")
	_check(scene.get_node("Viewport").size == Vector2i(2048, 512) and workbench.position.x == 1536, "NW occupies the fourth column")
	var reloaded: AnimationLibrary = ResourceLoader.load(DIAGONAL.resource_path, "", ResourceLoader.CACHE_MODE_IGNORE)
	for clip: String in MOTIONS:
		_check(reloaded.has_animation(clip), "NW clip survives independent disk reload: " + clip)
		var animation: Animation = player.get_animation(clip)
		_check(animation.resource_path.contains("/animations/north-west/"), "NW owns independent native animation resources")
		_check(is_equal_approx(animation.length, north_player.get_animation(clip).length) and animation.loop_mode == north_player.get_animation(clip).loop_mode, "NW preserves duration and loop mode: " + clip)
		for track: int in animation.get_track_count():
			var path: String = str(animation.track_get_path(track))
			_check(path.begins_with("Skeleton2D/") and not path.ends_with(":scale"), "NW keys only bones without stretching")
	workbench.reset_motion()
	var anchors: Dictionary = {"idle": _pose(skeleton)}
	for name: String in ["walk", "run"]:
		_sample(player, name + "_loop", 0)
		anchors[name] = _pose(skeleton)
		_sample(player, name + "_loop", player.get_animation(name + "_loop").length)
		_compare(anchors[name], _pose(skeleton), "NW loop closes: " + name)
	for clip: String in MOTIONS:
		if not clip.contains("_to_"):
			continue
		var names: PackedStringArray = clip.split("_to_")
		_sample(player, clip, 0)
		_compare(anchors[names[0]], _pose(skeleton), "NW transition entry: " + clip)
		_sample(player, clip, player.get_animation(clip).length)
		_compare(anchors[names[1]], _pose(skeleton), "NW transition exit: " + clip)
	var contact_stats: Dictionary = _check_calibrated_contacts(workbench)
	_check(body.polygon == vertices and body.get_bone_weights(1) == weights and body.get_parent().transform == registration, "Calibrated motion preserves source mesh, weights and registration")
	var outer: AnimationPlayer = scene.get_node("SequencePlayer")
	var sequence: Animation = outer.get_animation("comparison")
	_check(sequence.get_track_count() == 4, "Native sequence drives all four directions")
	for key: int in sequence.track_get_key_count(0):
		for track: int in [1, 2, 3]:
			_check(sequence.track_get_key_time(0, key) == sequence.track_get_key_time(track, key) and sequence.animation_track_get_key_animation(0, key) == sequence.animation_track_get_key_animation(track, key), "All columns use identical native events")
	var players: Array[AnimationPlayer] = []
	for name: String in scene.VIEWS:
		var view: Node2D = scene.get_node("Viewport/" + name)
		view.reset_motion()
		players.append(view.get_node("AnimationPlayer"))
	outer.play("comparison")
	outer.advance(0)
	var visited: Dictionary = {}
	for step: int in 290:
		outer.advance(1.0 / 30)
		for view_player: AnimationPlayer in players:
			view_player.advance(1.0 / 30)
			_check(view_player.assigned_animation == players[0].assigned_animation and is_equal_approx(view_player.current_animation_position, players[0].current_animation_position), "Four-column native playback stays synchronized")
		visited[player.assigned_animation] = true
	for clip: String in MOTIONS:
		_check(visited.has(clip), "Four-column comparison includes " + clip)
	_compare(anchors["idle"], _pose(skeleton), "NW finishes at idle")
	outer.stop()
	print("NW acceptance: %s failure(s); diagonal support error %.6f px; swing clearance %.3f px; flight %s/160 samples." % [_failures, contact_stats.error, contact_stats.clearance, contact_stats.flight])
	scene.free()
	quit(1 if _failures else 0)
