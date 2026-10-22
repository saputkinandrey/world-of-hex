@tool
extends Polygon2D

@export_file("*.png") var rigidity_mask_path: String = ""
@export_file("*.png") var ownership_mask_path: String = ""

# These values travel with native UV edits when the scene is saved. They let a
# new atlas frame reuse edited UVs instead of recreating them from the polygon.
@export_storage var bound_atlas_origin: Vector2 = Vector2.ZERO
@export_storage var bound_flip_h: bool = false
@export_storage var bound_flip_v: bool = false

func rebind_atlas(state: Dictionary, mirrored: bool) -> void:
	var size: Vector2 = Vector2(get_meta("frame_size"))
	var next_origin: Vector2 = Vector2(state.frame % state.hframes, int(state.frame / state.hframes)) * size
	var next_flip_h: bool = state.flip_h != mirrored
	var next_uv: PackedVector2Array = []
	for coordinate: Vector2 in uv:
		var pixel: Vector2 = coordinate - bound_atlas_origin
		if bound_flip_h:
			pixel.x = size.x - pixel.x
		if bound_flip_v:
			pixel.y = size.y - pixel.y
		if next_flip_h:
			pixel.x = size.x - pixel.x
		if state.flip_v:
			pixel.y = size.y - pixel.y
		next_uv.append(pixel + next_origin)
	texture = state.texture
	uv = next_uv
	bound_atlas_origin = next_origin
	bound_flip_h = next_flip_h
	bound_flip_v = state.flip_v
	_bind_elastic_seams()
	offset = state.offset * Vector2(-1.0 if mirrored else 1.0, 1.0)
	if not state.centered:
		offset += size * 0.5

func _bind_elastic_seams() -> void:
	if not has_meta("elastic_triangles"):
		return
	var image: Image = texture.get_image()
	var next_polygons: Array = polygons.slice(0, int(get_meta("base_triangle_count")))
	for triangle: PackedInt32Array in get_meta("elastic_triangles"):
		if _seam_is_covered(triangle, image):
			next_polygons.append(triangle)
	polygons = next_polygons

func _seam_is_covered(triangle: PackedInt32Array, image: Image) -> bool:
	var first: Vector2 = uv[triangle[0]]
	var second: Vector2 = uv[triangle[1]]
	var third: Vector2 = uv[triangle[2]]
	var center: Vector2 = (first + second + third) / 3.0
	# A strip has constant U or V; a corner cap has both constant. Sample
	# inside the adjoining texels so nearest-filter rounding cannot select
	# an opaque neighbor on an otherwise transparent silhouette edge.
	var dx: float = .25 if first.x == second.x and first.x == third.x else 0.0
	var dy: float = .25 if first.y == second.y and first.y == third.y else 0.0
	for sample: Vector2 in [center + Vector2(-dx, -dy), center + Vector2(dx, -dy), center + Vector2(-dx, dy), center + Vector2(dx, dy)]:
		if image.get_pixelv(Vector2i(sample.floor())).a == 0:
			return false
	return true
