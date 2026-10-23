extends "res://modules/character-animation-workbench/tests/render-walk.gd"

const PREVIEW = preload("res://modules/character-animation-workbench/tests/segmentation-preview.tscn")
const DESTINATION: String = "res://../tmp/animation-workbench/segmentation"

func _run() -> void:
	var scene: Node = PREVIEW.instantiate()
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var known: Dictionary = {}
	for name: String in scene.VIEWS:
		var workbench: Node = scene.get_node("Viewport/"+name)
		var rig: Node2D = workbench._active_rig
		var diagnostic: Polygon2D = rig.get_node("SegmentationSurface")
		var body: Polygon2D = rig.get_node("Layers/BodyBase/Surface")
		diagnostic.transform = rig.global_transform.affine_inverse()*body.global_transform
		diagnostic.offset = body.offset
		diagnostic.z_index = 1
		var unknown: Sprite2D = rig.get_node("UnknownSource")
		unknown.transform = diagnostic.transform
		unknown.offset = diagnostic.offset
		known[name] = int(diagnostic.get_meta("source_pixels"))
		rig.get_node("Layers").hide()
		rig.get_node("Overlay").hide()
	var sequence: Animation = scene.get_node("SequencePlayer").get_animation("comparison")
	var frames: int = roundi(sequence.length*FPS)
	for mode: String in ["chunks","texture"]:
		var directory: String = DESTINATION+"/"+mode+"/sequence"
		if DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory)) != OK:
			push_error("Cannot create neural diagnostic frame directory: "+directory)
			scene.free()
			quit(1)
			return
		for name: String in scene.VIEWS:
			var rig: Node2D = scene.get_node("Viewport/"+name)._active_rig
			rig.get_node("SegmentationSurface").material.set_shader_parameter("flat_chunk_colors",mode == "chunks")
			var unknown: Sprite2D = rig.get_node("UnknownSource")
			unknown.texture = unknown.get_meta("chunks_texture" if mode == "chunks" else "source_texture")
		for index: int in frames:
			var absolute: float = index/float(FPS)
			var key: int = 0
			for candidate: int in sequence.track_get_key_count(0):
				if sequence.track_get_key_time(0,candidate) <= absolute:
					key = candidate
			var clip: String = sequence.animation_track_get_key_animation(0,key)
			for name: String in scene.VIEWS:
				_sample(scene.get_node("Viewport/"+name+"/AnimationPlayer"),clip,absolute-sequence.track_get_key_time(0,key))
				scene.get_node("Viewport/Caption"+name).text = "%s | %d px | %s" % [name,known[name],clip]
			await process_frame
			_save(scene.get_node("Viewport"),directory,index)
		var file: FileAccess = FileAccess.open(DESTINATION+"/"+mode+"/manifest.json",FileAccess.WRITE)
		if file == null:
			push_error("Cannot write neural diagnostic manifest")
			_failed = true
		else:
			file.store_string(JSON.stringify({"fps":FPS,"size":[2048,512],"directions":["S","N","SW","NW"],"sources":["south","north","south-west","north-west"],"clips":{"sequence":frames},"mode":mode,"known_pixels":known,"unknown":"static display only; no bone assignment","ligaments":false},"  "))
		print("Rendered Neural %s: %s frames; known pixels: %s" % [mode,frames,known])
	scene.free()
	quit(1 if _failed else 0)
