extends "res://modules/character-animation-workbench/tests/render-walk.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")
const COMPARISON_OUTPUT = "res://../tmp/animation-workbench/comparison-calibrated-feet"
const PROOF_FRAMES: Array[int] = [30,37,67,84,90,94,98,99,112,162,179,223,257]

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var sources: Dictionary = {}
	for index: int in scene.VIEWS.size():
		var workbench: Node2D = scene.get_node("Viewport/" + scene.VIEWS[index])
		var overlay: Node2D = workbench._active_rig.get_node("Overlay")
		overlay.show_surface_mesh = false
		overlay.bone_color = Color.RED
		overlay.joint_color = Color.RED
		overlay.z_as_relative = false
		overlay.z_index = RenderingServer.CANVAS_ITEM_Z_MAX
		overlay.show()
		for base: Node2D in workbench._active_rig.get_node("Layers").get_children():
			if base.has_node("Surface") and base.get_node("Surface") is Polygon2D:
				base.get_node("Surface").material.set_shader_parameter("ownership_tint", 0.20)
		var surface: Polygon2D = workbench._active_rig.get_node("Layers/BodyBase/Surface")
		sources[surface.texture.resource_path] = true
		if workbench.source_direction != index:
			push_error("Comparison must contain S/N/SW/NW, without duplicated directions")
			scene.free()
			quit(1)
			return
	if sources.size() != scene.VIEWS.size():
		push_error("Four-direction video must use four distinct authored body textures")
		scene.free()
		quit(1)
		return
	var sequence: Animation = scene.get_node("SequencePlayer").get_animation("comparison")
	var proof: bool = "--proof" in OS.get_cmdline_user_args()
	var directory: String = COMPARISON_OUTPUT + ("/proof" if proof else "/sequence")
	var error: Error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
	if error != OK:
		push_error("Cannot create comparison frame directory: " + error_string(error))
		scene.free()
		quit(1)
		return
	var frames: int = roundi(sequence.length * FPS)
	for index: int in frames:
		if proof and not index in PROOF_FRAMES:
			continue
		var absolute: float = float(index) / FPS
		var key: int = 0
		for candidate: int in sequence.track_get_key_count(0):
			if sequence.track_get_key_time(0, candidate) <= absolute:
				key = candidate
		var clip: String = sequence.animation_track_get_key_animation(0, key)
		var time: float = absolute - sequence.track_get_key_time(0, key)
		for name: String in scene.VIEWS:
			_sample(scene.get_node("Viewport/%s/AnimationPlayer" % name), clip, time)
			scene.get_node("Viewport/Caption" + name).text = "%s | %s" % [scene.LABELS[name], "idle" if clip == "RESET" else clip]
		await process_frame
		_save(scene.get_node("Viewport"), directory, index)
		if index == 99:
			for mode: int in [2,8]:
				for name: String in scene.VIEWS:
					scene.get_node("Viewport/"+name).region_debug = mode
				await process_frame
				RenderingServer.force_draw(false)
				var result: Error = scene.get_node("Viewport").get_texture().get_image().save_png(COMPARISON_OUTPUT + ("/ligaments.png" if mode == 2 else "/regions.png"))
				if result != OK:
					push_error("Cannot save ligament diagnostic: " + error_string(result))
					_failed = true
			for name: String in scene.VIEWS:
				scene.get_node("Viewport/"+name).region_debug = 0
	if proof:
		print("Rendered %s targeted motion-gap frames." % PROOF_FRAMES.size())
		scene.free()
		quit(1 if _failed else 0)
		return
	var file: FileAccess = FileAccess.open(COMPARISON_OUTPUT + "/manifest.json", FileAccess.WRITE)
	if file == null:
		push_error("Cannot save comparison manifest: " + error_string(FileAccess.get_open_error()))
		_failed = true
	else:
		var size: Vector2i = scene.get_node("Viewport").size
		file.store_string(JSON.stringify({"fps": FPS, "size": [size.x, size.y], "directions":["S","N","SW","NW"], "sources":sources.keys(), "clips": {"sequence": frames}}, "  "))
	print("Rendered S/N/SW/NW comparison: %s frames, 2048x512, 30 FPS." % frames)
	scene.free()
	quit(1 if _failed else 0)
