@tool
extends Polygon2D

const RegionComposition = preload("res://modules/character-animation-workbench/region-compositor.gd")

@export_file("*.png") var rigidity_mask_path: String = ""
@export_file("*.png") var ownership_mask_path: String = ""
@export var composition_direction: int = 0
@export var safe_compression: bool = true
@export_enum("Normal", "Flesh chunks", "Ligaments", "Skin", "Ownership", "Depth", "UV", "Quality", "All regions") var region_debug: int = 0
var _composition_direction: int = -1
var _cell_polygons: Array = []
var _composition_map: Texture2D

func _ready() -> void:
	set_notify_transform(true)

func _notification(what: int) -> void:
	if what == NOTIFICATION_TRANSFORM_CHANGED and is_node_ready() and _composition_map != null:
		_update_composition_transform()

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
	_composition_direction = -1
	_bind_composition()
	offset = state.offset * Vector2(-1.0 if mirrored else 1.0, 1.0)
	if not state.centered:
		offset += size * 0.5

func configure_composition(direction: int, safe: bool, debug: int) -> void:
	composition_direction = direction
	safe_compression = safe
	region_debug = debug
	if texture != null:
		_bind_composition()

func _bind_composition() -> void:
	if not has_meta("cell_regions"):
		return
	if _cell_polygons.is_empty():
		for index: int in get_meta("cell_triangle_indices"):
			_cell_polygons.append(polygons[index])
	if _composition_direction != composition_direction:
		var composition: Dictionary = RegionComposition.compose(self, composition_direction, _cell_polygons)
		polygons = composition.polygons
		set_meta("cell_triangle_indices", composition.indices)
		set_meta("flesh_overlap_indices", composition.overlap_indices)
		set_meta("directional_depth", composition.table)
		_composition_map = composition.map
		_composition_direction = composition_direction
	var shader_material: ShaderMaterial = material
	shader_material.set_shader_parameter("compositor_enabled", true)
	shader_material.set_shader_parameter("flesh_overlap_vertex_start",get_meta("flesh_overlap_vertex_start",2147483647))
	shader_material.set_shader_parameter("region_map", _composition_map)
	shader_material.set_shader_parameter("region_frame_size", Vector2(get_meta("frame_size")))
	shader_material.set_shader_parameter("region_atlas_origin", bound_atlas_origin)
	shader_material.set_shader_parameter("region_flip", Vector2(1 if bound_flip_h else 0, 1 if bound_flip_v else 0))
	shader_material.set_shader_parameter("safe_compression", safe_compression)
	shader_material.set_shader_parameter("region_debug", region_debug)
	_update_composition_transform()

func _update_composition_transform() -> void:
	var determinant: float = get_global_transform_with_canvas().determinant()
	material.set_shader_parameter("region_rest_area", absf(determinant))
	material.set_shader_parameter("region_orientation", signf(determinant) * (-1.0 if bound_flip_h != bound_flip_v else 1.0))

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
