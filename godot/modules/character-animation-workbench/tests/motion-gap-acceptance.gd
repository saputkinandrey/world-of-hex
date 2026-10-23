extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")
const Geometry = preload("res://modules/character-animation-workbench/ligament-geometry.gd")

func _inside_margin(points: PackedVector2Array, triangle: Vector3i) -> bool:
	var center: Vector2 = (points[triangle.x]+points[triangle.y]+points[triangle.z])/3.0
	var corners: Array[int] = [triangle.x,triangle.y,triangle.z]
	for index: int in 3:
		var a: Vector2 = points[corners[index]]
		var edge: Vector2 = points[corners[(index+1)%3]]-a
		if edge.length() < .001 or absf(edge.cross(center-a))/edge.length() < 1.0:
			return false
	return true

func _check_visible(surface: Polygon2D, image: Image) -> int:
	var skeleton: Skeleton2D = surface.get_node(surface.skeleton)
	var vertices: PackedInt32Array = surface.get_meta("ligament_corner_vertices")
	var owners: PackedByteArray = surface.get_meta("ligament_corner_owners")
	var transforms: Array[Transform2D] = []
	for index: int in surface.get_bone_count():
		var bone: Bone2D = skeleton.get_node(surface.get_bone_path(index))
		transforms.append(surface.global_transform.affine_inverse()*bone.global_transform*bone.get_skeleton_rest().affine_inverse()*skeleton.global_transform.affine_inverse()*surface.global_transform)
	var active: Dictionary = {}
	var start: int = surface.get_meta("motion_bridge_vertex_start")
	for index: int in surface.get_meta("motion_bridge_indices"):
		active[int((surface.polygons[index][0]-start)/12)] = true
	var samples: int = 0
	for index: int in active:
		var local_points: PackedVector2Array = []
		var screen_points: PackedVector2Array = []
		for corner: int in 4:
			var anchor: int = index*4+corner
			var point: Vector2 = transforms[owners[anchor]]*(surface.polygon[vertices[anchor]]+surface.offset)
			local_points.append(point)
			screen_points.append(surface.get_global_transform_with_canvas()*point)
		var selected: int = Geometry.selected_triangles(local_points)
		for candidate: int in Geometry.TRIANGLES.size():
			var triangle: Vector3i = Geometry.TRIANGLES[candidate]
			if not selected & (1 << candidate) or not _inside_margin(screen_points,triangle):
				continue
			var center: Vector2 = (screen_points[triangle.x]+screen_points[triangle.y]+screen_points[triangle.z])/3.0
			var pixel: Vector2i = Vector2i(center.floor())
			if not Rect2i(Vector2i.ZERO,image.get_size()).has_point(pixel):
				continue
			_check(not image.get_pixelv(pixel).is_equal_approx(image.get_pixel(0,0)),"Actual GPU ligament interior has no background hole: %s patch %s candidate %s pixel %s" % [surface.get_meta("mask_profile"),index,candidate,pixel])
			samples += 1
	return samples

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	# Verify flesh connectivity directly. A garment occlusion mask deliberately
	# makes body fragments transparent and is tested by north-layer-test instead.
	for view: String in scene.VIEWS:
		scene.get_node("Viewport/"+view)._active_rig.body_only = true
	var random: RandomNumberGenerator = RandomNumberGenerator.new()
	random.seed = 90217
	var checked: int = 0
	for pose: int in 8:
		for view: String in scene.VIEWS:
			var workbench: Node = scene.get_node("Viewport/"+view)
			workbench.get_node("AnimationPlayer").stop()
			var skeleton: Skeleton2D = workbench._active_rig.get_node("Skeleton2D")
			for index: int in skeleton.get_bone_count():
				var bone: Bone2D = skeleton.get_bone(index)
				bone.transform = bone.rest
				bone.rotation += random.randf_range(-.4,.4)
				bone.position += Vector2(random.randf_range(-1.5,1.5),random.randf_range(-1.5,1.5))
				bone.scale = Vector2(random.randf_range(.8,1.2),random.randf_range(.8,1.2))
		await RenderingServer.frame_post_draw
		var image: Image = scene.get_node("Viewport").get_texture().get_image()
		for view: String in scene.VIEWS:
			checked += _check_visible(scene.get_node("Viewport/"+view)._active_rig.get_node("Layers/BodyBase/Surface"),image)
	_check(checked > 200,"GPU proof covers many attachment interiors outside saved animations")
	print("GPU ligament interiors: %s samples, eight independent poses, %s failure(s)." % [checked,_failures])
	scene.free()
	quit(1 if _failures else 0)
