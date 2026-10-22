extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	for view: String in scene.VIEWS:
		var workbench: Node2D = scene.get_node("Viewport/" + view)
		var surface: Polygon2D = workbench._active_rig.get_node("Layers/BodyBase/Surface")
		var indices: PackedInt32Array = surface.get_meta("flesh_overlap_indices",PackedInt32Array())
		_check(not indices.is_empty(), view + ": textured ligament has an actual overlapping flesh margin")
		for index: int in indices:
			var triangle: PackedInt32Array = surface.polygons[index]
			var area: float = absf((surface.uv[triangle[1]]-surface.uv[triangle[0]]).cross(surface.uv[triangle[2]]-surface.uv[triangle[0]]))
			_check(is_equal_approx(area,1.0), "Overlap uses a finite source texel, never an extruded row")
			var owner: int = -1
			for vertex: int in triangle:
				for bone: int in surface.get_bone_count():
					var amount: float = surface.get_bone_weights(bone)[vertex]
					if amount > .00001:
						_check(is_equal_approx(amount,1.0) and (owner < 0 or owner == bone), "Flesh overlap follows exactly one chunk")
						owner = bone
		print("Ligament underlap %s: %s finite overlap triangles." % [view,indices.size()])
	scene.free()
	print("Ligament overlap acceptance: %s failure(s)." % _failures)
	quit(1 if _failures else 0)
