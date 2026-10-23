extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const DIAGNOSTIC = preload("res://modules/character-animation-workbench/tests/segmentation-preview.tscn")

func _run() -> void:
	var scene: Node = DIAGNOSTIC.instantiate()
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	for view: String in scene.VIEWS:
		var workbench: Node = scene.get_node("Viewport/"+view)
		var mesh: Polygon2D = workbench._active_rig.get_node("SegmentationSurface")
		var owners: PackedByteArray = mesh.get_meta("chunk_owners")
		_check(mesh.polygons.size() == 2*int(mesh.get_meta("source_pixels")), view+": two triangles per original visible texel")
		_check(owners.size() == mesh.polygon.size(), view+": every vertex has an explicit owner")
		_check(mesh.get_bone_count() == POSE_PATHS.size(), view+": all fourteen bones bound")
		for vertex: int in mesh.polygon.size():
			for bone: int in mesh.get_bone_count():
				_check(is_equal_approx(mesh.get_bone_weights(bone)[vertex],1.0 if owners[vertex] == bone else 0.0), view+": rigid chunk ownership")
		for triangle: PackedInt32Array in mesh.polygons:
			_check(owners[triangle[0]] == owners[triangle[1]] and owners[triangle[0]] == owners[triangle[2]], view+": no triangle crosses chunk ownership")
		var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
		for clip: String in ["idle_to_walk","walk_loop","walk_to_idle","walk_to_run","run_loop","run_to_walk","idle_to_run","run_to_idle"]:
			_check(player.has_animation(clip), view+": existing "+clip)
			for frame: int in 12:
				_sample(player,clip,player.get_animation(clip).length*frame/12.0)
				for pose: Transform2D in _pose(workbench._active_rig.get_node("Skeleton2D")):
					_check(pose.is_finite(),view+": finite original animation pose")
	scene.free()
	print("Segmentation diagnostic: four authored views, rigid source chunks, eight existing clips; failures: ",_failures)
	quit(1 if _failures else 0)
