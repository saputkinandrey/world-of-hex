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

    var target_positions := _build_path(movableData.currentPosition, facedData.direction, steps)
    if target_positions.is_empty():
        return

    var movement_sequence: Array[Vector2i] = []
    var previous_position: Vector2i = movableData.currentPosition
    for target_position in target_positions:
        movement_sequence.append(target_position - previous_position)
        previous_position = target_position

    parent.movable.move(movement_sequence)

func _build_path(start: Vector2i, direction: ShipToEncounterEntity.Direction, length: int) -> Array[Vector2i]:
    var result: Array[Vector2i] = []
    var cursor := start
    for i in range(length):
        cursor += _direction_to_offset(cursor.x, direction)
        result.append(cursor)
    return result

func _direction_to_offset(column: int, direction: ShipToEncounterEntity.Direction) -> Vector2i:
    if abs(column) % 2 == 0:
        return FacedData.Direction2Vector2iOdd[direction]
    return FacedData.Direction2Vector2i[direction]
