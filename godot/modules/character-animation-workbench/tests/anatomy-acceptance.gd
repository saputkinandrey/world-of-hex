extends "res://modules/character-animation-workbench/tests/hand-rigidity-acceptance.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")
const BONE_INDICES: Dictionary = {"Pelvis": 0, "Head": 3, "ArmL": 4, "ForearmL": 5, "ArmR": 6, "ForearmR": 7, "CalfL": 9, "CalfR": 11}
const LANDMARKS: Dictionary = {
	"South": {
		"Head": [Vector2(45,28), Vector2(64,28), Vector2(55,43)],
		"ForearmL": [Vector2(30,83), Vector2(35,82), Vector2(28,78)],
		"ForearmR": [Vector2(79,83), Vector2(75,82), Vector2(82,78)]},
	"North": {"Head": [Vector2(48,23), Vector2(60,23), Vector2(55,30)]},
	"SouthWest": {
		"Head": [Vector2(66,40), Vector2(80,40), Vector2(69,58)],
		"ArmR": [Vector2(86,64), Vector2(90,65), Vector2(88,68)],
		"CalfL": [Vector2(66,102), Vector2(65,104), Vector2(61,105)],
		"CalfR": [Vector2(80,114), Vector2(83,116), Vector2(79,117)]},
	"NorthWest": {
		"Head": [Vector2(62,39), Vector2(76,39), Vector2(62,52)],
		"ArmL": [Vector2(61,67), Vector2(60,71), Vector2(64,68)],
		"Pelvis": [Vector2(79,88), Vector2(78,91), Vector2(74,91)],
		"CalfL": [Vector2(65,113), Vector2(61,116), Vector2(66,115)],
		"CalfR": [Vector2(81,104), Vector2(84,106), Vector2(80,107)]},
}

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	for view: String in LANDMARKS:
		var workbench: Node2D = scene.get_node("Viewport/" + view)
		var surface: Polygon2D = workbench._active_rig.get_node("Layers/BodyBase/Surface")
		var skeleton: Skeleton2D = workbench._active_rig.get_node("Skeleton2D")
		var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
		var image: Image = surface.texture.get_image()
		var size: Vector2 = Vector2(surface.get_meta("frame_size"))
		for bone_name: String in LANDMARKS[view]:
			var owner: int = BONE_INDICES[bone_name]
			var points: Array[Vector2] = []
			var weights: Array[PackedFloat32Array] = []
			var ownership_ok: bool = true
			for pixel: Vector2 in LANDMARKS[view][bone_name]:
				_check(image.get_pixelv(Vector2i(pixel)).a > .1, view + ": anatomical landmark is opaque " + str(pixel))
				var point: Vector2 = pixel + Vector2(.5,.5) - size / 2
				points.append(point)
				weights.append(_weights_at(surface, point))
				ownership_ok = ownership_ok and is_equal_approx(weights[-1][owner], 1.0)
			_check(ownership_ok, view + ": anatomical region follows " + bone_name)
			var strain: float = 0
			for clip: String in ["walk_loop", "run_loop"]:
				for frame: int in 24:
					_sample(player, clip, player.get_animation(clip).length * frame / 24.0)
					var anchor: Vector2 = _deformed(surface, skeleton, points[0], weights[0])
					for index: int in range(1, points.size()):
						var moved: Vector2 = _deformed(surface, skeleton, points[index], weights[index])
						strain = maxf(strain, absf(anchor.distance_to(moved) / points[0].distance_to(points[index]) - 1))
			_check(strain < .005, view + ": anatomical shape remains rigid for " + bone_name)
			print("Anatomy %s %s: strain %.3f percent; correct ownership=%s" % [view, bone_name, strain * 100, ownership_ok])
	scene.free()
	quit(1 if _failures else 0)
