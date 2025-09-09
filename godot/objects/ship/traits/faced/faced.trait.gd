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
	var movement
	if(movableData.currentPosition.x % 2 == 1):
		movement = FacedData.Direction2Vector2i[facedData.direction]
	else:
		movement = FacedData.Direction2Vector2iOdd[facedData.direction]	
	
	parent.movable.move(movement)
	pass
