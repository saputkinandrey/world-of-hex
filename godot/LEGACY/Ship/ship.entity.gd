class_name ShipEntityLegacy
extends Resource

enum ShipType {DRAKKAR=1, GALLEON=2, STEAMSHIP=3, TRIREME=4}

var Type2Texture = {
	ShipType.DRAKKAR: load("res://resources/tokens/Drakkar.tres"),
	ShipType.GALLEON: load("res://resources/tokens/Galleon.tres"),
	ShipType.TRIREME: load("res://resources/tokens/Drakkar.tres"),
	ShipType.STEAMSHIP: load("res://resources/tokens/Drakkar.tres")
}

@export var speed: int = 0
@export var type: ShipType = ShipType.DRAKKAR
# CREW
@export var skillSailor = 12
# OFFICERS
@export var skillShiphandling: int = 12
@export var skillGunnery: int = 12
@export var skillLeadership: int = 12

#@export var movable: MovableEntity = MovableEntity.new()
#@export var faced: FacedEntity = FacedEntity.new()

func _ready() -> void:
	#print(Type2Texture)
	#$SPRITE.updateTexture(Type2Texture[self.type])
	pass
