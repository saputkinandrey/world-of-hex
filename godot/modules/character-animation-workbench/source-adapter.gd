extends RefCounted

# Only used in a normal SceneTree (including the headless importer), never @tool.
const SOURCE_SCENE = preload("res://modules/character-sprite-tool/character-sprite-tool.tscn")
const SPRITE_PROPERTIES: Array[String] = [
	"texture", "hframes", "vframes", "frame", "flip_h", "flip_v", "position",
	"rotation", "scale", "visible", "z_index", "centered", "offset", "modulate",
]

static func source_entity(scene: Node) -> CharacterSpriteEntity:
	return scene.get_node("PreviewOrigin/CharacterSpriteEntity") as CharacterSpriteEntity

static func capture(source: CharacterSpriteEntity) -> Dictionary:
	var layers: Dictionary = {}
	var diagnostics: PackedStringArray = []
	var render_direction: int = source.DIRECTION_MIRROR_FALLBACK.get(source.direction, source.direction)
	var expected: Dictionary = {}
	for spec: Dictionary in source._get_layer_specs(source.pose, render_direction):
		expected[spec.name] = spec
		if not ResourceLoader.exists(spec.path):
			diagnostics.append("Missing asset: %s (%s)" % [spec.name, spec.path])
		elif spec.frame < 0 or spec.frame >= spec.hframes:
			diagnostics.append("Invalid atlas frame: %s (%s/%s)" % [spec.name, spec.frame, spec.hframes])
	for slot: String in source.LAYER_NODE_PATH:
		var sprite: Sprite2D = source.get_node(source.LAYER_NODE_PATH[slot])
		var state: Dictionary = {}
		for property: String in SPRITE_PROPERTIES:
			state[property] = sprite.get(property)
		# Hidden layers may retain the preceding pose's texture in the old compositor.
		# Do not carry that stale image into a saved snapshot.
		if not sprite.visible:
			state.texture = null
		if not expected.has(slot):
			diagnostics.append("Layer absent or disabled in source: %s" % slot)
		layers[slot] = state
	if source.show_weapon:
		for weapon: int in [source.weapon_type, source.weapon_type_secondary]:
			if weapon != source.WeaponType.NONE and not source.is_current_weapon_type_supported(weapon):
				diagnostics.append("Unsupported weapon %s for %s/%s" % [weapon, source.get_pose_label(), source.get_direction_label()])
	var support: Vector2 = Vector2.ZERO
	var body: Sprite2D = source.get_node(source.LAYER_NODE_PATH.body)
	if body.visible and body.texture != null:
		var frame_size: Vector2i = Vector2i(body.texture.get_size()) / Vector2i(body.hframes, body.vframes)
		var image: Image = body.texture.get_image().get_region(Rect2i(body.frame_coords * frame_size, frame_size))
		var bounds: Rect2i = image.get_used_rect()
		support = body.transform * (body.get_rect().position + Vector2(bounds.get_center().x, bounds.end.y))
	return {"layers": layers, "mirrored": render_direction != source.direction, "diagnostics": diagnostics, "support_point": support}
