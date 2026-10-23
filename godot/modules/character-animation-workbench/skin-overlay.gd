@tool
extends Node2D

@export var show_surface_mesh: bool = true
@export var bone_color: Color = Color(1.0, 0.6, 0.15)
@export var joint_color: Color = Color(1.0, 0.85, 0.2)

func _process(_delta: float) -> void:
	if is_visible_in_tree():
		queue_redraw()

func _draw() -> void:
	if not is_node_ready():
		return
	var rig: Node2D = get_parent()
	var skeleton: Skeleton2D = rig.get_node("Skeleton2D")
	if show_surface_mesh:
		var surface: Polygon2D = rig.get_node("Layers/BodyBase/Surface")
		var points: PackedVector2Array = deformed_vertices(surface, skeleton)
		for polygon: PackedInt32Array in surface.polygons:
			for edge: int in polygon.size():
				draw_line(to_local(points[polygon[edge]]), to_local(points[polygon[(edge + 1) % polygon.size()]]), Color(0.2, 0.9, 0.8, 0.45), 0.25)
	for index: int in skeleton.get_bone_count():
		var bone: Bone2D = skeleton.get_bone(index)
		var start: Vector2 = to_local(bone.global_position)
		var has_child: bool = false
		for child: Node in bone.get_children():
			if child is Bone2D:
				has_child = true
				draw_line(start, to_local(child.global_position), bone_color, 0.8)
		if not has_child:
			for child: Node in bone.get_children():
				if child is Marker2D:
					var end: Vector2 = to_local(child.global_position)
					draw_line(start, end, bone_color, 0.8)
					draw_circle(end, 0.8, joint_color)
		draw_circle(start, 1.2, joint_color)

static func deformed_vertices(surface: Polygon2D, skeleton: Skeleton2D) -> PackedVector2Array:
	var result: PackedVector2Array = []
	var weights: Array[PackedFloat32Array] = []
	var transforms: Array[Transform2D] = []
	for index: int in surface.get_bone_count():
		var bone: Bone2D = skeleton.get_node(surface.get_bone_path(index))
		weights.append(surface.get_bone_weights(index))
		transforms.append(bone.global_transform * bone.get_skeleton_rest().affine_inverse() * skeleton.global_transform.affine_inverse() * surface.global_transform)
	for index: int in surface.polygon.size():
		var point: Vector2 = Vector2.ZERO
		for bone: int in weights.size():
			point += (transforms[bone] * (surface.polygon[index] + surface.offset)) * weights[bone][index]
		result.append(point)
	return result
