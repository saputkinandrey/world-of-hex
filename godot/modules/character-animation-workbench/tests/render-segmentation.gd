extends "res://modules/character-animation-workbench/tests/render-walk.gd"

const PREVIEW = preload("res://modules/character-animation-workbench/tests/segmentation-preview.tscn")
const DESTINATION: String = "res://../tmp/animation-workbench/segmentation"

func _run() -> void:
	var scene: Node = PREVIEW.instantiate()
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	for name: String in scene.VIEWS:
		var workbench: Node = scene.get_node("Viewport/"+name)
		var rig: Node2D = workbench._active_rig
		var diagnostic: Polygon2D = rig.get_node("SegmentationSurface")
		var body: Polygon2D = rig.get_node("Layers/BodyBase/Surface")
		diagnostic.transform = rig.global_transform.affine_inverse()*body.global_transform
		diagnostic.offset = body.offset
		rig.get_node("Layers").hide()
		rig.get_node("Overlay").hide()
	var sequence: Animation = scene.get_node("SequencePlayer").get_animation("comparison")
	var frames: int = roundi(sequence.length*FPS)
	for mode: String in ["chunks","texture"]:
		var directory: String = DESTINATION+"/"+mode+"/sequence"
		var error: Error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
		if error != OK:
			push_error("Cannot create segmentation frame directory: "+error_string(error))
			scene.free()
			quit(1)
			return
		for name: String in scene.VIEWS:
			scene.get_node("Viewport/"+name)._active_rig.get_node("SegmentationSurface").material.set_shader_parameter("flat_chunk_colors",mode == "chunks")
		for index: int in frames:
			var absolute: float = index/float(FPS)
			var key: int = 0
			for candidate: int in sequence.track_get_key_count(0):
				if sequence.track_get_key_time(0,candidate) <= absolute:
					key = candidate
			var clip: String = sequence.animation_track_get_key_animation(0,key)
			for name: String in scene.VIEWS:
				_sample(scene.get_node("Viewport/"+name+"/AnimationPlayer"),clip,absolute-sequence.track_get_key_time(0,key))
				scene.get_node("Viewport/Caption"+name).text = "%s | %s | %s" % [scene.LABELS[name],mode,clip]
			await process_frame
			_save(scene.get_node("Viewport"),directory,index)
		var file: FileAccess = FileAccess.open(DESTINATION+"/"+mode+"/manifest.json",FileAccess.WRITE)
		if file == null:
			push_error("Cannot write segmentation manifest: "+error_string(FileAccess.get_open_error()))
			_failed = true
		else:
			file.store_string(JSON.stringify({"fps":FPS,"size":[2048,512],"directions":["S","N","SW","NW"],"sources":["south","north","south-west","north-west"],"clips":{"sequence":frames},"mode":mode,"ligaments":false},"  "))
		print("Rendered segmentation %s: %s frames." % [mode,frames])
	scene.free()
	quit(1 if _failed else 0)
