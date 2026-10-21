extends "res://modules/character-animation-workbench/tests/render-walk.gd"

const RUN_SCENE = preload("res://modules/character-animation-workbench/tests/run-preview.tscn")
const RUN_OUTPUT = "res://../tmp/animation-workbench/run"

func _run() -> void:
	var scene: Node = RUN_SCENE.instantiate()
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var player: AnimationPlayer = scene.get_node("Viewport/Workbench/AnimationPlayer")
	var viewport: SubViewport = scene.get_node("Viewport")
	var sequence: Animation = scene.get_node("SequencePlayer").get_animation("run_sequence")
	var manifest: Dictionary = {"fps": FPS, "size": [512, 512], "clips": {}}
	for name: String in ["run_loop", "sequence"]:
		var duration: float = sequence.length if name == "sequence" else player.get_animation("run_loop").length * 2
		var frames: int = roundi(duration * FPS)
		var directory: String = RUN_OUTPUT + "/" + name
		var directory_error: Error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
		if directory_error != OK:
			push_error("Cannot create %s: %s" % [directory, error_string(directory_error)])
			_failed = true
			continue
		for index: int in frames:
			var time: float = float(index) / FPS
			var clip: String = "run_loop"
			if name == "sequence":
				var key: int = 0
				for candidate: int in sequence.track_get_key_count(0):
					if sequence.track_get_key_time(0, candidate) <= time:
						key = candidate
				clip = sequence.animation_track_get_key_animation(0, key)
				time -= sequence.track_get_key_time(0, key)
			_sample(player, clip, time)
			scene.get_node("Viewport/Caption").text = "South | %s" % ("idle" if clip == "RESET" else clip)
			await process_frame
			_save(viewport, directory, index)
		manifest.clips[name] = frames
		print("Rendered %s: %s frames, 512x512, 30 FPS." % [name, frames])
	var file: FileAccess = FileAccess.open(RUN_OUTPUT + "/manifest.json", FileAccess.WRITE)
	if file == null:
		push_error("Cannot save run manifest: " + error_string(FileAccess.get_open_error()))
		_failed = true
	else:
		file.store_string(JSON.stringify(manifest, "  "))
	scene.free()
	quit(1 if _failed else 0)
