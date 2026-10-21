extends "res://modules/character-animation-workbench/tests/comparison-acceptance.gd"

const DIAGONAL = preload("res://modules/character-animation-workbench/animations/skeletal-library-south-west.tres")
const WIDTH: float = .65
const DEPTH = Vector2(-.8, .65)

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var workbench: Node2D = scene.get_node("Viewport/SouthWest")
	var south: Node2D = scene.get_node("Viewport/South")
	var rig: Node2D = workbench._active_rig
	var skeleton: Skeleton2D = rig.get_node("Skeleton2D")
	var south_skeleton: Skeleton2D = south._active_rig.get_node("Skeleton2D")
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	var south_player: AnimationPlayer = south.get_node("AnimationPlayer")
	var body: Polygon2D = rig.get_node("Layers/BodyBase/Surface")
	var vertices: PackedVector2Array = body.polygon.duplicate()
	var uv: PackedVector2Array = body.uv.duplicate()
	var weights: PackedFloat32Array = body.get_bone_weights(1).duplicate()
	var registration: Transform2D = body.get_parent().transform
	_check(workbench.source_direction == 2 and rig.authored_direction == 2 and not rig.mirrored, "SW is an authored source direction, not a reflected view")
	_check(body.texture.resource_path.contains("/Char1_south_west_idle/Idle_body_SW1.png"), "SW uses its own original source PNG")
	_check(not rig.get_node("Layers/ShirtsBase").visible and not rig.get_node("Layers/HairBase").visible, "Missing SW clothing/hair remain absent without replacement assets")
	_check(scene.get_node("Viewport").size == Vector2i(1536, 512) and workbench.position.x == 1024, "SW occupies the third column")
	var reloaded: AnimationLibrary = ResourceLoader.load(DIAGONAL.resource_path, "", ResourceLoader.CACHE_MODE_IGNORE)
	for clip: String in MOTIONS:
		_check(reloaded.has_animation(clip), "SW clip survives independent disk reload: " + clip)
		var animation: Animation = player.get_animation(clip)
		_check(animation.resource_path.contains("/animations/south-west/"), "SW owns independent native animation resources")
		_check(is_equal_approx(animation.length, south_player.get_animation(clip).length) and animation.loop_mode == south_player.get_animation(clip).loop_mode, "SW preserves duration and loop mode: " + clip)
		for track: int in animation.get_track_count():
			var path: String = str(animation.track_get_path(track))
			_check(path.begins_with("Skeleton2D/") and not path.ends_with(":scale"), "SW keys only bones without stretching")
	workbench.reset_motion()
	var anchors: Dictionary = {"idle": _pose(skeleton)}
	for name: String in ["walk", "run"]:
		_sample(player, name + "_loop", 0)
		anchors[name] = _pose(skeleton)
		_sample(player, name + "_loop", player.get_animation(name + "_loop").length)
		_compare(anchors[name], _pose(skeleton), "SW loop closes: " + name)
	for clip: String in MOTIONS:
		if not clip.contains("_to_"):
			continue
		var names: PackedStringArray = clip.split("_to_")
		_sample(player, clip, 0)
		_compare(anchors[names[0]], _pose(skeleton), "SW transition entry: " + clip)
		_sample(player, clip, player.get_animation(clip).length)
		_compare(anchors[names[1]], _pose(skeleton), "SW transition exit: " + clip)
	var maximum_error: float = 0
	var maximum_clearance: float = 0
	var flight_samples: int = 0
	for clip: String in ["walk_loop", "run_loop"]:
		var support: float = .6 if clip == "walk_loop" else .38
		for frame: int in 160:
			var phase: float = float(frame) / 160
			var time: float = phase * player.get_animation(clip).length
			_sample(player, clip, time)
			_sample(south_player, clip, time)
			var airborne: int = 0
			for side: String in ["L", "R"]:
				var sign_x: float = -1 if side == "L" else 1
				var step: float = fposmod(phase + (0.0 if side == "L" else .5), 1)
				var calf: Bone2D = skeleton.get_node("Pelvis/Thigh%s/Calf%s" % [side, side])
				var toe: Vector2 = skeleton.to_local(calf.to_global(Vector2(sign_x * 3 * WIDTH, 5)))
				var south_calf: Bone2D = south_skeleton.get_node("Pelvis/Thigh%s/Calf%s" % [side, side])
				var south_toe: Vector2 = south_skeleton.to_local(south_calf.to_global(Vector2(sign_x * 3, 5)))
				if step > .03 and step < support - .03:
					var depth: float = 50 - 10 * step / support - 47
					var expected: Vector2 = Vector2(south_toe.x * WIDTH, 47) + DEPTH * depth
					maximum_error = maxf(maximum_error, toe.distance_to(expected))
				elif step > support + .03:
					var ground: float = 40 + 10 * (step - support) / (1 - support)
					var clearance: float = 47 + DEPTH.y * (ground - 47) - toe.y
					maximum_clearance = maxf(maximum_clearance, clearance)
					if clearance > 1:
						airborne += 1
			if clip == "run_loop" and airborne == 2:
				flight_samples += 1
			for path: String in POSE_PATHS:
				_check(skeleton.get_node(path).scale.is_equal_approx(Vector2.ONE), "SW preserves unit bone scales")
			_check(body.polygon == vertices and body.uv == uv and body.get_bone_weights(1) == weights and body.get_parent().transform == registration, "SW preserves source mesh, UV, weights and registration")
	_check(maximum_error < .3, "SW support follows diagonal ground travel")
	_check(maximum_clearance > 7.5 and flight_samples >= 16, "SW run retains swing clearance and both-feet flight")
	var outer: AnimationPlayer = scene.get_node("SequencePlayer")
	var sequence: Animation = outer.get_animation("comparison")
	_check(sequence.get_track_count() == 3, "Native sequence drives all three directions")
	for key: int in sequence.track_get_key_count(0):
		for track: int in [1, 2]:
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
			_check(view_player.assigned_animation == players[0].assigned_animation and is_equal_approx(view_player.current_animation_position, players[0].current_animation_position), "Three-column native playback stays synchronized")
		visited[player.assigned_animation] = true
	for clip: String in MOTIONS:
		_check(visited.has(clip), "Three-column comparison includes " + clip)
	_compare(anchors["idle"], _pose(skeleton), "SW finishes at idle")
	outer.stop()
	print("SW acceptance: %s failure(s); diagonal support error %.6f px; swing clearance %.3f px; flight %s/160 samples." % [_failures, maximum_error, maximum_clearance, flight_samples])
	scene.free()
	quit(1 if _failures else 0)
