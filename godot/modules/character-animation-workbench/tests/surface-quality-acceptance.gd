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
		var collapsed: int = 0
		for triangle: PackedInt32Array in surface.polygons:
			var a: Vector2 = surface.uv[triangle[0]]
			var b: Vector2 = surface.uv[triangle[1]]
			var c: Vector2 = surface.uv[triangle[2]]
			if absf((b-a).cross(c-a)) < .001:
				collapsed += 1
		_check(collapsed == 0, view + ": visible surface must sample a finite texture area instead of extruding a pixel row")
		print("Surface quality %s: %s collapsed UV triangles." % [view, collapsed])
	scene.free()
	quit(1 if _failures else 0)
