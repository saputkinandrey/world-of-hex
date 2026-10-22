extends "res://modules/character-animation-workbench/tests/hand-rigidity-acceptance.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")

func _triangle_key(indices: PackedInt32Array) -> String:
	var sorted: PackedInt32Array = indices.duplicate()
	sorted.sort()
	return str(sorted)

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	for view: String in scene.VIEWS:
		var workbench: Node2D = scene.get_node("Viewport/" + view)
		var surface: Polygon2D = workbench._active_rig.get_node("Layers/BodyBase/Surface")
		var skeleton: Skeleton2D = workbench._active_rig.get_node("Skeleton2D")
		var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
		var size: Vector2i = surface.get_meta("frame_size")
		var image: Image = surface.texture.get_image()
		var polygons: Dictionary = {}
		for triangle: PackedInt32Array in surface.polygons:
			polygons[_triangle_key(triangle)] = true
		var seams: Array[PackedInt32Array] = []
		var missing: int = 0
		for y: int in size.y:
			for x: int in size.x:
				if image.get_pixel(x, y).a < .5:
					continue
				var cell: int = (y * size.x + x) * 2
				var first: PackedInt32Array = surface.polygons[cell]
				var second: PackedInt32Array = surface.polygons[cell + 1]
				for offset: Vector2i in [Vector2i.RIGHT, Vector2i.DOWN]:
					var next: Vector2i = Vector2i(x, y) + offset
					if next.x >= size.x or next.y >= size.y or image.get_pixelv(next).a < .5:
						continue
					var neighbor: int = (next.y * size.x + next.x) * 2
					var n_first: PackedInt32Array = surface.polygons[neighbor]
					var n_second: PackedInt32Array = surface.polygons[neighbor + 1]
					var edge: PackedInt32Array = [first[1], first[2], n_first[0], n_second[2]] if offset == Vector2i.RIGHT else [second[2], first[2], n_first[0], n_first[1]]
					if edge[0] == edge[2] and edge[1] == edge[3]:
						continue
					seams.append(edge)
					for triangle: PackedInt32Array in [PackedInt32Array([edge[0], edge[1], edge[2]]), PackedInt32Array([edge[1], edge[3], edge[2]])]:
						if not polygons.has(_triangle_key(triangle)):
							missing += 1
		for y: int in range(1, size.y):
			for x: int in range(1, size.x):
				if minf(minf(image.get_pixel(x-1, y-1).a, image.get_pixel(x, y-1).a), minf(image.get_pixel(x, y).a, image.get_pixel(x-1, y).a)) < .5:
					continue
				var corners: Array[int] = [surface.polygons[((y-1)*size.x+x-1)*2][2], surface.polygons[((y-1)*size.x+x)*2+1][2], surface.polygons[(y*size.x+x)*2][0], surface.polygons[(y*size.x+x-1)*2][1]]
				var unique: PackedInt32Array = []
				for vertex: int in corners:
					if not unique.has(vertex):
						unique.append(vertex)
				for index: int in range(1, unique.size()-1):
					if not polygons.has(_triangle_key(PackedInt32Array([unique[0], unique[index], unique[index+1]]))):
						missing += 1
		var weights: Array[PackedFloat32Array] = []
		for vertex: int in surface.polygon.size():
			var influences: PackedFloat32Array = []
			for bone: int in surface.get_bone_count():
				influences.append(surface.get_bone_weights(bone)[vertex])
			weights.append(influences)
		var maximum_gap: float = 0
		for clip: String in ["walk_loop", "run_loop"]:
			for frame: int in 16:
				_sample(player, clip, player.get_animation(clip).length * frame / 16.0)
				for edge: PackedInt32Array in seams:
					for index: int in [0, 1]:
						var a: int = edge[index]
						var b: int = edge[index + 2]
						maximum_gap = maxf(maximum_gap, _deformed(surface, skeleton, surface.polygon[a], weights[a]).distance_to(_deformed(surface, skeleton, surface.polygon[b], weights[b])))
		_check(missing == 0, view + ": separated opaque boundaries have elastic connecting triangles")
		print("Seams %s: %s opaque split edges, %s missing patches, maximum opening %.3f source px." % [view, seams.size(), missing, maximum_gap])
	scene.free()
	quit(1 if _failures else 0)
