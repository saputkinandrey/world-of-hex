@tool
extends Node2D

const CATALOG_PATH = "res://modules/character-animation-workbench/base-catalog.tres"

@export var snapshot_key: String = "Saved source:0:0":
	set(value):
		snapshot_key = value
		if is_node_ready():
			apply_snapshot()
@export var authored_direction: int = 0
@export var supported_pose: int = 0
@export var body_only: bool = false:
	set(value):
		body_only = value
		if is_node_ready():
			apply_snapshot()
@export var show_mesh: bool = false:
	set(value):
		show_mesh = value
		if is_node_ready():
			$Overlay.visible = value
@export_range(0.1, 1.0, 0.05) var surface_opacity: float = 1.0:
	set(value):
		surface_opacity = value
		if is_node_ready():
			apply_snapshot()

var diagnostics: PackedStringArray = []
var mirrored: bool = false
var _catalog: Resource

func _ready() -> void:
	_catalog = load(CATALOG_PATH)
	$Overlay.visible = show_mesh
	apply_snapshot()

static func normalized_transform(state: Dictionary, reflected: bool) -> Transform2D:
	var origin: Vector2 = state.position * Vector2(-1.0 if reflected else 1.0, 1.0)
	var angle: float = -state.rotation if reflected else state.rotation
	return Transform2D(angle, state.scale, 0.0, origin)

func apply_snapshot() -> void:
	diagnostics.clear()
	var snapshots: Dictionary = _catalog.get_meta("snapshots")
	if not snapshots.has(snapshot_key):
		diagnostics.append("Snapshot is unavailable: %s" % snapshot_key)
		$Layers.visible = false
		update_configuration_warnings()
		return
	$Layers.visible = true
	var snapshot: Dictionary = snapshots[snapshot_key]
	var parts: PackedStringArray = snapshot_key.rsplit(":", true, 2)
	var direction: int = int(parts[2])
	var author: int = CharacterSpriteEntity.DIRECTION_MIRROR_FALLBACK.get(direction, direction)
	if int(parts[1]) != supported_pose or author != authored_direction:
		diagnostics.append("No authored skeletal template for pose/direction %s/%s (this rig supports %s/%s)." % [parts[1], direction, supported_pose, authored_direction])
		$Layers.visible = false
		update_configuration_warnings()
		return
	mirrored = snapshot.mirrored
	var body_transform: Transform2D = normalized_transform(snapshot.layers.body, mirrored)
	$Skeleton2D.transform = body_transform
	for base: Node2D in $Layers.get_children():
		var slot: String = base.get_meta("slot")
		var state: Dictionary = snapshot.layers[slot]
		base.transform = normalized_transform(state, mirrored)
		base.visible = state.visible
		var surface: CanvasItem = base.get_node("PivotOrigin/MotionPivot/CounterPivot/Surface") if base.has_node("PivotOrigin") else base.get_node("Surface")
		if body_only and slot != "body":
			base.visible = false
		if not base.visible:
			surface.texture = null
			continue
		if surface is Polygon2D:
			surface.composition_direction = direction
			_bind_mesh(surface, state, body_transform.affine_inverse() * base.transform)
		else:
			_bind_weapon(surface, state)
		if base.visible:
			surface.z_index = state.z_index
			surface.modulate = state.modulate
			surface.modulate.a *= surface_opacity
	diagnostics.append_array(snapshot.diagnostics)
	update_configuration_warnings()

func _bind_mesh(surface: Polygon2D, state: Dictionary, registration: Transform2D) -> void:
	var actual_size: Vector2i = Vector2i(state.texture.get_size()) / Vector2i(state.hframes, state.vframes)
	var expected_size: Vector2i = surface.get_meta("frame_size")
	var expected: Transform2D = surface.get_parent().get_meta("registration")
	if actual_size != expected_size or not registration.is_equal_approx(expected):
		surface.get_parent().visible = false
		surface.texture = null
		diagnostics.append("Incompatible rig registration for %s: frame %s (expected %s), transform %s (expected %s). Author a matching rig; no replacement asset is used." % [surface.get_parent().get_meta("slot"), actual_size, expected_size, registration, expected])
		return
	if surface.uv.size() != surface.polygon.size():
		surface.get_parent().visible = false
		diagnostics.append("UV/vertex count mismatch in %s; repair it in the native UV editor." % surface.get_parent().name)
		return
	surface.rebind_atlas(state, mirrored)

func _bind_weapon(surface: Sprite2D, state: Dictionary) -> void:
	surface.texture = state.texture
	surface.hframes = state.hframes
	surface.vframes = state.vframes
	surface.frame = state.frame
	surface.flip_h = state.flip_h != mirrored
	surface.flip_v = state.flip_v
	surface.centered = state.centered
	surface.offset = state.offset * Vector2(-1.0 if mirrored else 1.0, 1.0)

func _get_configuration_warnings() -> PackedStringArray:
	return diagnostics
