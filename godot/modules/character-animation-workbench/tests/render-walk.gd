extends SceneTree

const SCENE = preload("res://modules/character-animation-workbench/tests/walk-preview.tscn")
const OUTPUT = "res://../tmp/animation-workbench/walk"
const FPS: int = 30
var _failed: bool = false

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene: Node = SCENE.instantiate()
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var workbench: Node2D = scene.get_node("Viewport/Workbench")
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	var viewport: SubViewport = scene.get_node("Viewport")
	var manifest: Dictionary = {"fps": FPS, "size": [512, 512], "clips": {}}
	for clip: String in ["walk_loop", "idle_to_walk", "walk_to_idle"]:
		var frames: int = 60 if clip == "walk_loop" else 33
		var directory: String = "%s/%s" % [OUTPUT, clip]
		DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
		for index: int in frames:
			var time: float = float(index) / FPS
			if clip != "walk_loop":
				time = clampf(time - .3, 0, .5)
			_sample(player, clip, time)
			scene.get_node("Viewport/Caption").text = "South | %s" % clip
			await process_frame
			_save(viewport, directory, index)
		manifest.clips[clip] = frames
		print("Rendered %s: %s frames, 512x512, 30 FPS." % [clip, frames])
	var sequence: Animation = scene.get_node("SequencePlayer").get_animation("walk_sequence")
	var directory: String = "%s/sequence" % OUTPUT
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
	var frames: int = roundi(sequence.length * FPS)
	for index: int in frames:
		var absolute: float = float(index) / FPS
		var key: int = 0
		for candidate: int in sequence.track_get_key_count(0):
			if sequence.track_get_key_time(0, candidate) <= absolute:
				key = candidate
		var clip: String = sequence.animation_track_get_key_animation(0, key)
		var local: float = absolute - sequence.track_get_key_time(0, key)
		_sample(player, clip, local)
		scene.get_node("Viewport/Caption").text = "South | %s" % ("idle" if clip == "RESET" else clip)
		await process_frame
		_save(viewport, directory, index)
	manifest.clips["sequence"] = frames
	var file: FileAccess = FileAccess.open("%s/manifest.json" % OUTPUT, FileAccess.WRITE)
	if file == null:
		push_error("Cannot write walk render manifest: %s" % error_string(FileAccess.get_open_error()))
		_failed = true
	else:
		file.store_string(JSON.stringify(manifest, "  "))
	print("Rendered complete sequence: %s frames." % frames)
	scene.free()
	quit(1 if _failed else 0)

func _sample(player: AnimationPlayer, clip: String, time: float) -> void:
	var animation: Animation = player.get_animation(clip)
	var sample: float = fposmod(time, animation.length) if animation.loop_mode != Animation.LOOP_NONE else minf(time, animation.length)
	player.play(clip)
	player.seek(sample, true)
	player.pause()

func _save(viewport: SubViewport, directory: String, index: int) -> void:
	RenderingServer.force_draw(false)
	var result: Error = viewport.get_texture().get_image().save_png("%s/frame-%04d.png" % [directory, index])
	if result != OK:
		push_error("Cannot save walking frame %s/frame-%04d.png: %s" % [directory, index, error_string(result)])
		_failed = true
