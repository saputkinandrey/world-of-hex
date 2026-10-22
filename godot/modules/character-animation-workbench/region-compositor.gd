@tool
extends RefCounted

const DEPTH_PATH: String = "res://modules/character-animation-workbench/directional-depth.json"
const DIRECTIONS: Array[String] = ["SOUTH", "NORTH", "SOUTH_WEST", "NORTH_WEST", "SOUTH_EAST", "NORTH_EAST"]
const BONES: Array[String] = ["Pelvis", "Spine", "Chest", "Head", "ArmL", "ForearmL", "ArmR", "ForearmR", "ThighL", "CalfL", "ThighR", "CalfR"]
const PARENTS: Array[int] = [-1,0,1,2,2,4,2,6,0,8,0,10]
const FLESH: int = 1
const LIGAMENT: int = 2
const SKIN: int = 3

static func depth_table(direction: int) -> Dictionary:
	assert(direction >= 0 and direction < DIRECTIONS.size(), "Unsupported composition direction")
	var document: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(DEPTH_PATH))
	var order: Array = document.directions[DIRECTIONS[direction]]
	assert(order.size() == BONES.size(), "Depth table must contain every leading bone")
	var flesh: PackedInt32Array = []
	var ligament: PackedInt32Array = []
	for bone: String in BONES:
		assert(order.count(bone) == 1, "Depth table contains missing/duplicate bone: " + bone)
		flesh.append(order.find(bone) * 2)
	for index: int in BONES.size():
		ligament.append(-1 if PARENTS[index] < 0 else mini(flesh[index], flesh[PARENTS[index]]) + 1)
	return {"name": DIRECTIONS[direction], "flesh": flesh, "ligament": ligament}

static func compose(surface: Polygon2D, direction: int, cells: Array) -> Dictionary:
	var table: Dictionary = depth_table(direction)
	var regions: PackedByteArray = surface.get_meta("cell_regions")
	var links: PackedByteArray = surface.get_meta("cell_ligament_child")
	var size: Vector2i = surface.get_meta("frame_size")
	var image: Image = Image.create(size.x, size.y, false, Image.FORMAT_RGBA8)
	var buckets: Array[Array] = []
	for depth: int in BONES.size() * 2:
		buckets.append([])
	for cell: int in regions.size():
		var owner: int = int(regions[cell] / 4)
		var kind: int = regions[cell] % 4
		var depth: int = table.ligament[links[cell]] if kind == LIGAMENT else table.flesh[owner]
		assert(depth >= 0, "A ligament must link two chunks")
		image.set_pixel(cell % size.x, int(cell / size.x), Color.from_rgba8(kind, owner, depth))
		buckets[depth].append(cell)
	var polygons: Array = []
	var indices: PackedInt32Array = []
	indices.resize(cells.size())
	for bucket: Array in buckets:
		for cell: int in bucket:
			indices[cell * 2] = polygons.size()
			polygons.append(cells[cell * 2])
			indices[cell * 2 + 1] = polygons.size()
			polygons.append(cells[cell * 2 + 1])
	return {"map": ImageTexture.create_from_image(image), "polygons": polygons, "indices": indices, "table": table}
