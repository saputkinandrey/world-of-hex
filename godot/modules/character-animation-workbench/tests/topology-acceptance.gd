extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const Geometry = preload("res://modules/character-animation-workbench/ligament-geometry.gd")
const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")

func _area(a: Vector2,b: Vector2,c: Vector2) -> float:
	return absf((b-a).cross(c-a))*.5

func _verify(points: PackedVector2Array) -> void:
	var selected: int = Geometry.selected_triangles(points)
	var hull: PackedVector2Array = Geometry2D.convex_hull(points)
	var expected: float = 0.0
	for index: int in range(1,hull.size()-2):
		expected += _area(hull[0],hull[index],hull[index+1])
	var actual: float = 0.0
	var triangles: int = 0
	for index: int in Geometry.TRIANGLES.size():
		if selected & (1 << index):
			var triangle: Vector3i = Geometry.TRIANGLES[index]
			actual += _area(points[triangle.x],points[triangle.y],points[triangle.z])
			triangles += 1
	_check(triangles <= 2,"One non-overlapping triangulation is selected")
	_check(absf(actual-expected) < maxf(.001,expected*.00001),"Attachment envelope has no uncovered or doubled area")
	if expected > .0001:
		for point: Vector2 in points:
			var attached: bool = false
			for index: int in Geometry.TRIANGLES.size():
				if selected & (1 << index):
					var triangle: Vector3i = Geometry.TRIANGLES[index]
					attached = attached or Geometry2D.point_is_inside_triangle(point,points[triangle.x],points[triangle.y],points[triangle.z]) or point in [points[triangle.x],points[triangle.y],points[triangle.z]]
			_check(attached,"All transformed flesh anchors remain covered")

func _run() -> void:
	var random: RandomNumberGenerator = RandomNumberGenerator.new()
	random.seed = 73192
	for step: int in 80:
		var rectangle: PackedVector2Array = []
		for point: Vector2 in [Vector2.ZERO,Vector2(2,0),Vector2(2,1),Vector2(0,1)]:
			rectangle.append(point.rotated(step*TAU/80.0))
		_check(Geometry.selected_triangles(rectangle) == 3,"Common rotation keeps the source UV diagonal")
	for sample: int in 2000:
		var first: Transform2D = Transform2D(random.randf_range(-PI,PI),Vector2(random.randf_range(.2,3),random.randf_range(.2,3)),0,Vector2(random.randf_range(-40,40),random.randf_range(-40,40)))
		var second: Transform2D = Transform2D(random.randf_range(-PI,PI),Vector2(random.randf_range(.2,3),random.randf_range(.2,3)),0,Vector2(random.randf_range(-40,40),random.randf_range(-40,40)))
		if sample%3 == 0:
			first.x = -first.x
		if sample%7 == 0:
			second.y = -second.y
		_verify(PackedVector2Array([first*Vector2(0,0),second*Vector2(2,0),second*Vector2(2,1),first*Vector2(0,1)]))
	_verify(PackedVector2Array([Vector2.ZERO,Vector2.RIGHT,Vector2(2,0),Vector2(3,0)]))
	_verify(PackedVector2Array([Vector2.ZERO,Vector2.ZERO,Vector2.ZERO,Vector2.ZERO]))
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var checked: int = 0
	for view: String in scene.VIEWS:
		var workbench: Node = scene.get_node("Viewport/"+view)
		var rig: Node = workbench._active_rig
		var surface: Polygon2D = rig.get_node("Layers/BodyBase/Surface")
		_check(surface.get_meta("ligament_source") == "ownership+rigidity","Generated surface identifies static mask topology")
		_check(not surface.has_meta("motion_reveal_hands"),"No clip-measured driver metadata remains")
		var vertices: PackedInt32Array = surface.get_meta("ligament_corner_vertices")
		var owners: PackedByteArray = surface.get_meta("ligament_corner_owners")
		_check(not vertices.is_empty() and owners.size() == vertices.size(),"Mask attachments have four explicit flesh anchors")
		# This pose has no Animation: arbitrary joint rotations, translations and
		# nonuniform scales exercise new geometry outside the saved clip library.
		for index: int in surface.get_bone_count():
			var bone: Bone2D = rig.get_node("Skeleton2D").get_node(surface.get_bone_path(index))
			bone.rotation = random.randf_range(-2.5,2.5)
			bone.position += Vector2(random.randf_range(-6,6),random.randf_range(-6,6))
			bone.scale = Vector2(random.randf_range(.5,1.8),random.randf_range(.5,1.8))
		surface._update_ligaments()
		for index: int in vertices.size():
			_check(is_equal_approx(surface.get_bone_weights(owners[index])[vertices[index]],1.0),"Every attachment anchor follows exactly its flesh chunk")
		checked += vertices.size()/4
	scene.free()
	print("Static ligament topology: %s anchors; 2000 independent arbitrary transforms; %s failure(s)." % [checked,_failures])
	quit(1 if _failures else 0)
