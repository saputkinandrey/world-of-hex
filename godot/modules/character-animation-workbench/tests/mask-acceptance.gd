extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const MASK_ROOT: String = "res://modules/character-animation-workbench/masks/"
const MESH_ROOT: String = "res://modules/character-animation-workbench/rigs/masked/"

func _run() -> void:
	var manifest: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(MASK_ROOT + "profiles.json"))
	var palette: Array = manifest.bones.values()
	var rigid_pixels: int = 0
	for profile: String in manifest.profiles:
		var surface: Polygon2D = load(MESH_ROOT + profile + ".tscn").instantiate()
		var rigidity: Image = Image.load_from_file(surface.rigidity_mask_path)
		var owners: Image = Image.load_from_file(surface.ownership_mask_path)
		var cell_triangles: PackedInt32Array = surface.get_meta("cell_triangle_indices")
		var weights: Array[PackedFloat32Array] = []
		for bone: int in surface.get_bone_count():
			weights.append(surface.get_bone_weights(bone))
		var violations: int = 0
		var free_pixels: int = 0
		var flexible_pixels: int = 0
		for y: int in rigidity.get_height():
			for x: int in rigidity.get_width():
				var strength: int = roundi(rigidity.get_pixel(x, y).r * 255)
				if strength == 0:
					free_pixels += 1
					continue
				if strength != 255:
					flexible_pixels += 1
					continue
				rigid_pixels += 1
				var color: Color = owners.get_pixel(x, y)
				var owner: int = -1
				for candidate: int in palette.size():
					var rgb: Array = palette[candidate]
					if color.is_equal_approx(Color.from_rgba8(int(rgb[0]), int(rgb[1]), int(rgb[2]))):
						owner = candidate
						break
				var triangle: PackedInt32Array = surface.polygons[cell_triangles[(y * rigidity.get_width() + x) * 2]]
				var second: PackedInt32Array = surface.polygons[cell_triangles[(y * rigidity.get_width() + x) * 2 + 1]]
				for vertex: int in [triangle[0], triangle[1], triangle[2], second[2]]:
					for bone: int in weights.size():
						if not is_equal_approx(weights[bone][vertex], 1.0 if bone == owner else 0.0):
							violations += 1
		_check(violations == 0, profile + ": every rigid texel follows exactly its selected bone")
		_check(free_pixels > 0, profile + ": transparent background remains deformable")
		_check(manifest.profiles[profile].head or flexible_pixels > 0, profile + ": articulated body has flexible joints")
		_check(surface.texture_filter == CanvasItem.TEXTURE_FILTER_NEAREST, profile + ": free cells cannot interpolate visible edge texels")
		surface.free()
	print("Pixel masks: %s failure(s); %s profiles, %s rigid texels checked." % [_failures, manifest.profiles.size(), rigid_pixels])
	quit(1 if _failures else 0)
