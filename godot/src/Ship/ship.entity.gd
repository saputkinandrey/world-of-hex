class_name ShipEntity 
extends ShipSprite

var Type2Texture = {
	types.ShipType.DRAKKAR: load("res://tokens/Drakkar.tres")
}

@export var speed: int = 0
@export var type: types.ShipType = types.ShipType.DRAKKAR
# CREW
@export var skillSailor = 12
# OFFICERS
@export var skillShiphandling: int = 12
@export var skillGunnery: int = 12
@export var skillLeadership: int = 12

func _ready() -> void:
	super()
	self.updateTexture(Type2Texture[self.type])
	self.updateVelocity(self.speed)

func moveForward():
	#self.move(helpers.Direction2Vector2i[self.direction])

	if(self.currentPosition.x % 2 == 1):
		self.move(helpers.Direction2Vector2i[self.direction])
	else:
		self.move(helpers.Direction2Vector2iOdd[self.direction])
	
	pass
	#super.move(Direction2Vector2i[self.direction] * self.speed)
