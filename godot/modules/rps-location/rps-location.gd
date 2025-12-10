class_name RpsLocationScene
extends Node2D

@export var mainScene: Node2D
@export var actor_token_scene: PackedScene
@export var decoration_token_scene: PackedScene

@onready var ws_node: RpsLocationSocket = $RpsLocationSocket
@onready var tokens_node: Node2D = $Tokens

var location_id: String = ""
var location_name: String = ""
var world: Dictionary = {}

var _hex_ids: Array[String] = []
var _hex_coords: Array[Vector2i] = []
var _hex_centers_screen: Dictionary = {} # hexId -> Vector2
var _offset: Vector2 = Vector2.ZERO

const HEX_RADIUS: float = 55.0


func _ready() -> void:
	ws_node.connect("location_loaded", Callable(self, "_on_location_loaded"))


func activate() -> void:
	visible = true
	if mainScene and "activeScene" in mainScene:
		mainScene.activeScene = self


func connect_to_location(id: String) -> void:
	location_id = id
	activate()
	ws_node.connect_to_location(id)


func _on_location_loaded(snapshot: Dictionary) -> void:
	location_id = snapshot.get("locationId", "")
	location_name = snapshot.get("locationName", "")
	world = snapshot.get("world", {})

	_rebuild_hex_cache()
	_spawn_contents()
	queue_redraw()


# ─────────────────────────────────────────────
# Гексы и центрирование карты
# ─────────────────────────────────────────────

func _rebuild_hex_cache() -> void:
	_hex_ids.clear()
	_hex_coords.clear()
	_hex_centers_screen.clear()

	if not world.has("hexes"):
		return

	var hexes: Dictionary = world.hexes

	for hex_id in hexes.keys():
		var hex_data: Dictionary = hexes[hex_id]
		if not hex_data.has("coord"):
			continue
		var c: Dictionary = hex_data.coord
		var q: int = int(c.get("q", 0))
		var r: int = int(c.get("r", 0))
		_hex_ids.append(hex_id)
		_hex_coords.append(Vector2i(q, r))

	if _hex_coords.is_empty():
		_offset = Vector2.ZERO
		return

	var centers: Array[Vector2] = []
	centers.resize(_hex_coords.size())

	for i in _hex_coords.size():
		var axial := _hex_coords[i]
		centers[i] = _axial_to_pixel(axial.x, axial.y)

	var min_x := centers[0].x
	var max_x := centers[0].x
	var min_y := centers[0].y
	var max_y := centers[0].y

	for c in centers:
		min_x = min(min_x, c.x)
		max_x = max(max_x, c.x)
		min_y = min(min_y, c.y)
		max_y = max(max_y, c.y)

	var center_world := Vector2((min_x + max_x) * 0.5, (min_y + max_y) * 0.5)
	var view_center := get_viewport_rect().size * 0.5
	_offset = view_center - center_world

	for i in _hex_ids.size():
		_hex_centers_screen[_hex_ids[i]] = centers[i] + _offset


func _axial_to_pixel(q: int, r: int) -> Vector2:
	var R := HEX_RADIUS
	var x := R * 1.5 * q
	var y := R * (sqrt(3.0) * r + sqrt(3.0) * 0.5 * q)
	return Vector2(x, y)


func _get_hex_screen_position(hex_id: String) -> Vector2:
	if _hex_centers_screen.has(hex_id):
		return _hex_centers_screen[hex_id]
	return Vector2.ZERO


# ─────────────────────────────────────────────
# Спавн акторов и декораций
# ─────────────────────────────────────────────

func _spawn_contents() -> void:
	if not tokens_node:
		return

	for child in tokens_node.get_children():
		child.queue_free()

	if not world.has("contents"):
		return

	var contents: Dictionary = world.contents

	for content_id in contents.keys():
		var c: Dictionary = contents[content_id]
		var hex_id: String = str(c.get("hexId", ""))
		var pos: Vector2 = _get_hex_screen_position(hex_id)
		var kind: String = str(c.get("kind", ""))

		match kind:
			"creature":
				if actor_token_scene:
					var token: RpsActorToken = actor_token_scene.instantiate()
					token.position = pos
					token.actor_id = str(c.get("creatureId", ""))
					tokens_node.add_child(token)
			"structure":
				if decoration_token_scene:
					var deco: RpsDecorationToken = decoration_token_scene.instantiate()
					deco.position = pos
					deco.decoration_id = str(c.get("structureId", ""))
					tokens_node.add_child(deco)
			_:
				pass


# ─────────────────────────────────────────────
# Отрисовка гексов (wireframe)
# ─────────────────────────────────────────────

func _get_hex_points(center: Vector2) -> Array[Vector2]:
	var pts: Array[Vector2] = []
	for i in 6:
		var angle := deg_to_rad(60.0 * i) # flat-top
		var p := center + Vector2(
			HEX_RADIUS * cos(angle),
			HEX_RADIUS * sin(angle)
		)
		pts.append(p)
	return pts


func _draw() -> void:
	if _hex_ids.is_empty():
		return

	for hex_id in _hex_ids:
		var center: Vector2 = _get_hex_screen_position(hex_id)
		var pts := _get_hex_points(center)

		for i in 6:
			var a := pts[i]
			var b := pts[(i + 1) % 6]
			draw_line(a, b, Color.WHITE, 1.5)
