extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const POINTS: Array[Vector2] = [Vector2(-27.5, 23.5), Vector2(-25.5, 23.5), Vector2(-26.5, 25.5)]

func _weights_at(surface: Polygon2D, point: Vector2) -> PackedFloat32Array:
	for triangle: PackedInt32Array in surface.polygons:
		var a: Vector2 = surface.polygon[triangle[0]]
		var b: Vector2 = surface.polygon[triangle[1]]
		var c: Vector2 = surface.polygon[triangle[2]]
		var denominator: float = (b - a).cross(c - a)
		if is_zero_approx(denominator):
			continue
		var v: float = (point - a).cross(c - a) / denominator
		var w: float = (b - a).cross(point - a) / denominator
		if v < -.00001 or w < -.00001 or v + w > 1.00001:
			continue
		var result: PackedFloat32Array = []
		for bone: int in surface.get_bone_count():
			var weights: PackedFloat32Array = surface.get_bone_weights(bone)
			result.append(weights[triangle[0]] * (1 - v - w) + weights[triangle[1]] * v + weights[triangle[2]] * w)
		return result
	push_error("Hand landmark is outside the mesh: " + str(point))
	return []

func _deformed(surface: Polygon2D, skeleton: Skeleton2D, point: Vector2, weights: PackedFloat32Array) -> Vector2:
	var result: Vector2 = Vector2.ZERO
	for index: int in weights.size():
		var bone: Bone2D = skeleton.get_node(surface.get_bone_path(index))
		var transform: Transform2D = skeleton.global_transform.affine_inverse() * bone.global_transform * bone.get_skeleton_rest().affine_inverse() * skeleton.global_transform.affine_inverse() * surface.global_transform
		result += (transform * point) * weights[index]
	return result

func _run() -> void:
	var scene: Node = SCENE.instantiate()
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var workbench: Node2D = scene.get_node("Viewport/Workbench")
	var surface: Polygon2D = workbench._active_rig.get_node("Layers/BodyBase/Surface")
	var skeleton: Skeleton2D = workbench._active_rig.get_node("Skeleton2D")
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	var samples: Array[PackedFloat32Array] = []
	for point: Vector2 in POINTS:
		samples.append(_weights_at(surface, point))
	var maximum_strain: float = 0
	for clip: String in ["walk_loop", "run_loop"]:
		for frame: int in 40:
			_sample(player, clip, player.get_animation(clip).length * frame / 40.0)
			var points: Array[Vector2] = []
			for index: int in POINTS.size():
				points.append(_deformed(surface, skeleton, POINTS[index], samples[index]))
			for index: int in [1, 2]:
				maximum_strain = maxf(maximum_strain, absf(points[0].distance_to(points[index]) / POINTS[0].distance_to(POINTS[index]) - 1))
	_check(maximum_strain < .005, "Opaque hand preserves shape within 0.5 percent")
	print("Hand rigidity: %s failure(s); maximum hand strain %.3f percent." % [_failures, maximum_strain * 100])
	scene.free()
	quit(1 if _failures else 0)
