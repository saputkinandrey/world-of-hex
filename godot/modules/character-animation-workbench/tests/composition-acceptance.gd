extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const Composition = preload("res://modules/character-animation-workbench/region-compositor.gd")
const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var workbench: Node2D = scene.get_node("Viewport/South")
	for direction: int in Composition.DIRECTIONS.size():
		workbench.source_direction = direction
		workbench.apply_source()
		var rig: Node2D = workbench._active_rig
		var surface: Polygon2D = rig.get_node("Layers/BodyBase/Surface")
		var table: Dictionary = surface.get_meta("directional_depth")
		_check(table.name == Composition.DIRECTIONS[direction], "Each actual direction selects its own explicit depth table")
		for depth: int in table.flesh:
			_check(depth % 2 == 0 and depth >= 0 and depth < 24, "Compact even Flesh Chunk Z")
		for depth: int in table.ligament:
			_check(depth == -1 or depth % 2 == 1, "Odd Ligament Z")
		var cells: PackedByteArray = surface.get_meta("cell_regions")
		var indices: PackedInt32Array = surface.get_meta("cell_triangle_indices")
		var visited: Dictionary = {}
		for index: int in indices:
			visited[index] = true
		_check(visited.size() == cells.size() * 2 and surface.polygons.size() == cells.size() * 2, "Every source cell has exactly two triangles; no uncontrolled texture duplication")
		var kinds: Dictionary = {}
		for region: int in cells:
			kinds[region % 4] = true
		_check(kinds.has(Composition.FLESH) and kinds.has(Composition.LIGAMENT) and kinds.has(Composition.SKIN), "All three region types derive from current masks")
		var elastic_vertices: Dictionary = {}
		for cell: int in cells.size():
			if cells[cell] % 4 != Composition.SKIN:
				continue
			for triangle: int in [indices[cell*2],indices[cell*2+1]]:
				for vertex: int in surface.polygons[triangle]:
					var influences: int = 0
					for bone: int in surface.get_bone_count():
						if surface.get_bone_weights(bone)[vertex] > .00001:
							influences += 1
					if influences > 1:
						elastic_vertices[vertex] = true
		var source: Image = surface.texture.get_image()
		var size: Vector2i = surface.get_meta("frame_size")
		var omitted: int = 0
		for y: int in size.y:
			for x: int in size.x:
				if source.get_pixel(x,y).a > 0 and cells[y*size.x+x] % 4 == 0:
					omitted += 1
		_check(omitted == 0, "Every opaque source texel has a region membership")
		var before: PackedInt32Array = surface.get_meta("cell_triangle_indices")
		var vertices: PackedVector2Array = surface.polygon.duplicate()
		var weights: PackedFloat32Array = surface.get_bone_weights(0).duplicate()
		var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
		_sample(player, "walk_loop", .25)
		workbench.safe_compression = false
		workbench.region_debug = 4
		_check(surface.polygon == vertices and surface.get_bone_weights(0) == weights, "Composition options preserve mesh/weights")
		_check(is_equal_approx(player.current_animation_position, .25), "Debug/compression switches preserve timeline position")
		workbench.safe_compression = true
		workbench.region_debug = 0
		_check(surface.get_meta("cell_triangle_indices") == before, "Switching diagnostics does not duplicate triangles")
		print("Composition %s: %s source cells, %s elastic skin vertices, independent depth table." % [table.name, cells.size(),elastic_vertices.size()])
	scene.free()
	print("Composition acceptance: %s failure(s)." % _failures)
	quit(1 if _failures else 0)
