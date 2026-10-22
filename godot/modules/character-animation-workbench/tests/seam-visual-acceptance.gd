extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")
const SILHOUETTE_EDGE: Vector2i = Vector2i(72, 80)

func _capture(viewport: SubViewport) -> Image:
	RenderingServer.force_draw(false)
	return viewport.get_texture().get_image().get_region(Rect2i(0, 0, 512, 512))

func _changed(first: Image, second: Image) -> int:
	var count: int = 0
	for y: int in first.get_height():
		for x: int in first.get_width():
			if not first.get_pixel(x, y).is_equal_approx(second.get_pixel(x, y)):
				count += 1
	return count

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var workbench: Node2D = scene.get_node("Viewport/South")
	var surface: Polygon2D = workbench._active_rig.get_node("Layers/BodyBase/Surface")
	for base: Node2D in workbench._active_rig.get_node("Layers").get_children():
		base.visible = base.name == "BodyBase"
	_sample(workbench.get_node("AnimationPlayer"), "run_loop", .25)
	var size: Vector2i = surface.get_meta("frame_size")
	var image: Image = surface.texture.get_image()
	var bound_polygons: Array = surface.polygons.duplicate()
	_check(image.get_pixelv(SILHOUETTE_EDGE).a == 0 and image.get_pixelv(SILHOUETTE_EDGE + Vector2i.DOWN).a > .5, "Regression edge separates transparent and opaque source texels")
	var patches: Array[PackedInt32Array] = []
	for y: int in size.y - 1:
		for x: int in size.x - 1:
			for offset: Vector2i in [Vector2i.RIGHT, Vector2i.DOWN]:
				var alpha: float = image.get_pixel(x, y).a
				var next_alpha: float = image.get_pixelv(Vector2i(x, y) + offset).a
				if not ((alpha == 0 and next_alpha > .5) or (alpha > .5 and next_alpha == 0)):
					continue
				var cell: int = (y * size.x + x) * 2
				var neighbor: int = cell + (offset.y * size.x + offset.x) * 2
				var first: PackedInt32Array = surface.polygons[cell]
				var second: PackedInt32Array = surface.polygons[cell + 1]
				var next_first: PackedInt32Array = surface.polygons[neighbor]
				var next_second: PackedInt32Array = surface.polygons[neighbor + 1]
				var edge: PackedInt32Array = [first[1], first[2], next_first[0], next_second[2]] if offset == Vector2i.RIGHT else [second[2], first[2], next_first[0], next_first[1]]
				if edge[0] != edge[2] or edge[1] != edge[3]:
					patches.append(PackedInt32Array([edge[0], edge[1], edge[2]]))
					patches.append(PackedInt32Array([edge[1], edge[3], edge[2]]))
	surface.polygons = patches
	var covered: Array[PackedInt32Array] = []
	for triangle: PackedInt32Array in patches:
		if bound_polygons.has(triangle):
			covered.append(triangle)
	var viewport: SubViewport = scene.get_node("Viewport")
	surface.hide()
	await process_frame
	var reference: Image = _capture(viewport)
	surface.show()
	await process_frame
	var unguarded: int = _changed(reference, _capture(viewport))
	# Empty polygons would request automatic triangulation; hide the isolated
	# patch surface instead when the alpha gate rejects every candidate.
	if covered.is_empty():
		surface.hide()
	else:
		surface.polygons = covered
	await process_frame
	var painted: int = _changed(reference, _capture(viewport))
	_check(unguarded > 0, "The regression control actually paints an unwanted silhouette wedge")
	_check(painted == 0, "Elastic seams cannot paint across a transparent source edge")
	surface.polygons = bound_polygons.slice(int(surface.get_meta("base_triangle_count")))
	surface.show()
	await process_frame
	var repaired: int = _changed(reference, _capture(viewport))
	_check(repaired > 0, "Covered elastic strips actually render pixels to fill the opening")
	print("Seam silhouette: unguarded=%s colored pixels, guarded=%s; covered strips=%s pixels; %s failure(s)." % [unguarded, painted, repaired, _failures])
	scene.free()
	quit(1 if _failures else 0)
