@tool
extends Polygon2D

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
	offset = state.offset * Vector2(-1.0 if mirrored else 1.0, 1.0)
	if not state.centered:
		offset += size * 0.5
