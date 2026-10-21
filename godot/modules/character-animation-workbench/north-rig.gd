@tool
extends "res://modules/character-animation-workbench/skinned-rig.gd"

func _ready() -> void:
	super()
	for layer: CanvasItem in [$Layers/ShirtsBase, $Layers/ShirtsBase/Surface]:
		if not layer.visibility_changed.is_connected(_on_shirt_visibility_changed):
			layer.visibility_changed.connect(_on_shirt_visibility_changed)

func apply_snapshot() -> void:
	super()
	_update_shirt_occlusion()

func _update_shirt_occlusion() -> void:
	var body: Polygon2D = $Layers/BodyBase/Surface
	var shirt: Polygon2D = $Layers/ShirtsBase/Surface
	var body_material: ShaderMaterial = body.material
	var enabled: bool = not body_only and $Layers/ShirtsBase.visible and shirt.visible and shirt.texture != null
	body_material.set_shader_parameter("occlusion_enabled", enabled)
	if not enabled:
		return
	body_material.set_shader_parameter("garment_mask", shirt.texture)
	body_material.set_shader_parameter("body_atlas_origin", body.bound_atlas_origin)
	body_material.set_shader_parameter("garment_atlas_origin", shirt.bound_atlas_origin)
	body_material.set_shader_parameter("garment_texture_size", Vector2(shirt.texture.get_size()))
	# Use rig-local coordinates; the preview can be translated and zoomed.
	var registration: Transform2D = $Skeleton2D.transform.affine_inverse() * $Layers/ShirtsBase.transform * shirt.transform
	body_material.set_shader_parameter("garment_offset", registration.origin)

func _on_shirt_visibility_changed() -> void:
	if is_node_ready():
		_update_shirt_occlusion()
