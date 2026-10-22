extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")
const OUTPUT: String = "res://../tmp/animation-workbench/motion-gaps-before.json"
const MOTION_CLIPS: Array[String] = ["walk_loop","run_loop","idle_to_walk","walk_to_idle","walk_to_run","run_to_walk","idle_to_run","run_to_idle"]

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var report: Dictionary = {"profiles":{},"samples":0}
	for view: String in scene.VIEWS:
		var workbench: Node2D = scene.get_node("Viewport/"+view)
		var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
		var skeleton: Skeleton2D = workbench._active_rig.get_node("Skeleton2D")
		var surfaces: Array[Dictionary] = []
		for base: Node2D in workbench._active_rig.get_node("Layers").get_children():
			if not base.visible or not base.has_node("Surface") or not base.get_node("Surface") is Polygon2D:
				continue
			var surface: Polygon2D = base.get_node("Surface")
			var edges: Array[Dictionary] = _edges(surface)
			if edges.is_empty():
				continue
			var weights: Array[PackedFloat32Array] = []
			for bone: int in surface.get_bone_count():
				weights.append(surface.get_bone_weights(bone))
			surfaces.append({"surface":surface,"edges":edges,"weights":weights})
		for clip: String in MOTION_CLIPS:
			var animation: Animation = player.get_animation(clip)
			for frame: int in ceili(animation.length*30)+1:
				var time: float = minf(frame/30.0,animation.length)
				_sample(player,clip,time)
				report.samples += 1
				for data: Dictionary in surfaces:
					var surface: Polygon2D = data.surface
					var transforms: Array[Transform2D] = []
					for bone: int in surface.get_bone_count():
						var node: Bone2D = skeleton.get_node(surface.get_bone_path(bone))
						transforms.append(surface.global_transform.affine_inverse()*node.global_transform*node.get_skeleton_rest().affine_inverse()*skeleton.global_transform.affine_inverse()*surface.global_transform)
					var moved: Dictionary = {}
					for edge: Dictionary in data.edges:
						for vertex: int in edge.vertices:
							if moved.has(vertex):
								continue
							var point: Vector2 = Vector2.ZERO
							for bone: int in transforms.size():
								point += (transforms[bone]*(surface.polygon[vertex]+surface.offset))*data.weights[bone][vertex]
							moved[vertex] = point
						var ids: PackedInt32Array = edge.vertices
						var gap: float = maxf(moved[ids[0]].distance_to(moved[ids[2]]),moved[ids[1]].distance_to(moved[ids[3]]))
						if edge.a != edge.b:
							for vertex: int in [ids[0],ids[1]]:
								var rest: Vector2 = surface.polygon[vertex]+surface.offset
								gap = maxf(gap,(transforms[edge.a]*rest).distance_to(transforms[edge.b]*rest))
						if gap > edge.max_gap:
							edge.max_gap = gap
							edge.clip = clip
							edge.time = time
		for data: Dictionary in surfaces:
			var surface: Polygon2D = data.surface
			var edges: Array = []
			for edge: Dictionary in data.edges:
				if edge.max_gap > .1:
					var saved: Dictionary = edge.duplicate()
					saved.erase("vertices")
					edges.append(saved)
			var profile: String = surface.get_meta("mask_profile")
			if report.profiles.has(profile):
				for existing: Dictionary in report.profiles[profile].edges:
					var found: bool = false
					for edge: Dictionary in edges:
						if [edge.x,edge.y,edge.dx,edge.dy] == [existing.x,existing.y,existing.dx,existing.dy]:
							if existing.max_gap > edge.max_gap:
								edge.merge(existing,true)
							found = true
							break
					if not found:
						edges.append(existing)
			report.profiles[profile] = {"view":view,"edges":edges}
			print("Motion gap audit %s: %s moving split edges." % [profile,edges.size()])
	var file: FileAccess = FileAccess.open(OUTPUT,FileAccess.WRITE)
	if file == null:
		push_error("Cannot write motion gap audit: "+error_string(FileAccess.get_open_error()))
		scene.free()
		quit(1)
		return
	file.store_string(JSON.stringify(report,"  "))
	scene.free()
	quit()

func _edges(surface: Polygon2D) -> Array[Dictionary]:
	var size: Vector2i = surface.get_meta("frame_size")
	var indices: PackedInt32Array = surface.get_meta("cell_triangle_indices")
	var regions: PackedByteArray = surface.get_meta("cell_regions")
	var image: Image = surface.texture.get_image()
	var edges: Array[Dictionary] = []
	for y: int in size.y:
		for x: int in size.x:
			for step: Vector2i in [Vector2i.RIGHT,Vector2i.DOWN]:
				var next: Vector2i = Vector2i(x,y)+step
				if next.x >= size.x or next.y >= size.y:
					continue
				var cell: int = y*size.x+x
				var adjacent: int = next.y*size.x+next.x
				var first: PackedInt32Array = surface.polygons[indices[cell*2]]
				var second: PackedInt32Array = surface.polygons[indices[cell*2+1]]
				var other: PackedInt32Array = surface.polygons[indices[adjacent*2]]
				var other_second: PackedInt32Array = surface.polygons[indices[adjacent*2+1]]
				var center: Vector2 = (surface.uv[first[0]]+surface.uv[first[1]]+surface.uv[first[2]])/3.0
				var other_center: Vector2 = (surface.uv[other[0]]+surface.uv[other[1]]+surface.uv[other[2]])/3.0
				if image.get_pixelv(Vector2i(center.floor())).a < .99 or image.get_pixelv(Vector2i(other_center.floor())).a < .99:
					continue
				var vertices: PackedInt32Array = [first[1],first[2],other[0],other_second[2]] if step == Vector2i.RIGHT else [second[2],first[2],other[0],other[1]]
				if int(regions[cell]/4) == int(regions[adjacent]/4) and vertices[0] == vertices[2] and vertices[1] == vertices[3]:
					continue
				edges.append({"x":x,"y":y,"dx":step.x,"dy":step.y,"a":int(regions[cell]/4),"b":int(regions[adjacent]/4),"vertices":vertices,"max_gap":0.0,"clip":"","time":0.0})
	return edges
