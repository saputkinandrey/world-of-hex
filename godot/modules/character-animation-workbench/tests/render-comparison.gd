extends "res://modules/character-animation-workbench/tests/render-walk.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")
const COMPARISON_OUTPUT = "res://../tmp/animation-workbench/comparison-anatomy"

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var sequence: Animation = scene.get_node("SequencePlayer").get_animation("comparison")
	var directory: String = COMPARISON_OUTPUT + "/sequence"
	var error: Error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
	if error != OK:
		push_error("Cannot create comparison frame directory: " + error_string(error))
		scene.free()
		quit(1)
		return
	var frames: int = roundi(sequence.length * FPS)
	for index: int in frames:
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
	var file: FileAccess = FileAccess.open(COMPARISON_OUTPUT + "/manifest.json", FileAccess.WRITE)
	if file == null:
		push_error("Cannot save comparison manifest: " + error_string(FileAccess.get_open_error()))
		_failed = true
	else:
		var size: Vector2i = scene.get_node("Viewport").size
		file.store_string(JSON.stringify({"fps": FPS, "size": [size.x, size.y], "clips": {"sequence": frames}}, "  "))
	print("Rendered S/N/SW/NW comparison: %s frames, 2048x512, 30 FPS." % frames)
	scene.free()
	quit(1 if _failed else 0)
