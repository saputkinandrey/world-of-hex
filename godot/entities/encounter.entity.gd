class_name EncounterEntity
extends Resource

var _id: String
var name: String
var radius: int
var ships: Array[ShipToEncounterEntity]
var players: Array[PlayerEntity]

func from_dict(data: Dictionary) -> EncounterEntity:
	_id = data.get("_id", "")
	name = data.get("name", "")
	radius = data.get("radius", 0)
	
	# Players
	players.clear()
	if data.has("players"):
		for p_dict in data.players:
			players.append(PlayerEntity.new().from_dict(p_dict))
	
	# Ships
	ships.clear()
	if data.has("ships"):
		for s_dict in data.ships:
			ships.append(ShipToEncounterEntity.new().from_dict(s_dict))
	
	return self
