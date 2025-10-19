class_name FacedTrait
extends Node

@onready var parent: ShipObject = get_parent()
@onready var facedData: FacedData = parent.facedData
@onready var movableData: MovableData = parent.movableData

func turnLeft():
	facedData.direction = FacedData.TurnLeftDict[facedData.direction]
	pass
	
func turnRight():
	facedData.direction = FacedData.TurnRightDict[facedData.direction]
	pass

func moveForward():
	if parent.movable.is_moving():
		return

	var steps := parent.speed
	if steps <= 0:
		steps = parent.shipData.speed
	steps = max(steps, 1)

	var movement_sequence: Array[Vector2i] = []
	var position_cursor: Vector2i = movableData.currentPosition

	for i in range(steps):
		var movement: Vector2i = _direction_to_offset(position_cursor, facedData.direction)
		movement_sequence.append(movement)
		position_cursor += movement

	parent.movable.move(movement_sequence)

func _direction_to_offset(from_position: Vector2i, direction: ShipToEncounterEntity.Direction) -> Vector2i:
	if from_position.x % 2 == 1:
		return FacedData.Direction2Vector2i[direction]
	else:
		return FacedData.Direction2Vector2iOdd[direction]
