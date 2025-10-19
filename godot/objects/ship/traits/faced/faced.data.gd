class_name FacedData
extends Resource

@export var direction: ShipToEncounterEntity.Direction = ShipToEncounterEntity.Direction.N

const Direction2Vector2i = {
	ShipToEncounterEntity.Direction.N: Vector2i(0, -1),
	ShipToEncounterEntity.Direction.NW: Vector2i(-1, 0),
	ShipToEncounterEntity.Direction.SW: Vector2i(-1, 1),
	ShipToEncounterEntity.Direction.S: Vector2i(0, 1),
	ShipToEncounterEntity.Direction.SE: Vector2i(1, 1),
	ShipToEncounterEntity.Direction.NE: Vector2i(1, 0),
}

const Direction2Vector2iOdd = {
	ShipToEncounterEntity.Direction.N: Vector2i(0, -1),
	ShipToEncounterEntity.Direction.NW: Vector2i(-1, -1),
	ShipToEncounterEntity.Direction.SW: Vector2i(-1, 0),
	ShipToEncounterEntity.Direction.S: Vector2i(0, 1),
	ShipToEncounterEntity.Direction.SE: Vector2i(1, 0),
	ShipToEncounterEntity.Direction.NE: Vector2i(1, -1),
}

const TurnLeftDict = {
	ShipToEncounterEntity.Direction.N: ShipToEncounterEntity.Direction.NW,
	ShipToEncounterEntity.Direction.NW: ShipToEncounterEntity.Direction.SW,
	ShipToEncounterEntity.Direction.SW: ShipToEncounterEntity.Direction.S,
	ShipToEncounterEntity.Direction.S: ShipToEncounterEntity.Direction.SE,
	ShipToEncounterEntity.Direction.SE: ShipToEncounterEntity.Direction.NE,
	ShipToEncounterEntity.Direction.NE: ShipToEncounterEntity.Direction.N,
}

const TurnRightDict = {
	ShipToEncounterEntity.Direction.N: ShipToEncounterEntity.Direction.NE,	
	ShipToEncounterEntity.Direction.NE: ShipToEncounterEntity.Direction.SE,
	ShipToEncounterEntity.Direction.SE: ShipToEncounterEntity.Direction.S,
	ShipToEncounterEntity.Direction.S: ShipToEncounterEntity.Direction.SW,
	ShipToEncounterEntity.Direction.SW: ShipToEncounterEntity.Direction.NW,
	ShipToEncounterEntity.Direction.NW: ShipToEncounterEntity.Direction.N,
}
