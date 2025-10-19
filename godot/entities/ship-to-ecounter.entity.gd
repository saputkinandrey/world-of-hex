class_name ShipToEncounterEntity
extends Resource
enum Direction {N, S, NE, SE, NW, SW}

@export var _id: String
@export var position: Vector2i
@export var direction: Direction
@export var speed: int
@export var ship: ShipEntity

func from_dict(data: Dictionary) -> ShipToEncounterEntity:
	if data.has("position"):
		var pos_dict = data.position
		position = Vector2i(pos_dict.get("x", 0), pos_dict.get("y", 0))
	
	if data.has("direction"):
		match data.direction:
			"N": direction = Direction.N
			"S": direction = Direction.S
			"NE": direction = Direction.NE
			"SE": direction = Direction.SE
			"NW": direction = Direction.NW
			"SW": direction = Direction.SW
			_: push_error("Unknown direction: %s" % str(data.direction))
	
	if data.has("speed"): speed = data.speed
	if data.has("_id"): _id = data._id
	
	if data.has("ship"):
		ship = ShipEntity.new().from_dict(data.ship)
	
	return self
