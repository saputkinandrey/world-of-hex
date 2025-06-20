class_name ShipSpriteTrait
extends TileSprite2D

var Type2Texture = {
	ShipEntity.ShipType.DRAKKAR: load("res://objects/ship/traits/ship-sprite/textures/Drakkar.tres"),
	ShipEntity.ShipType.GALLEON: load("res://objects/ship/traits/ship-sprite/textures/Galleon.tres"),
	ShipEntity.ShipType.TRIREME: load("res://objects/ship/traits/ship-sprite/textures/Drakkar.tres"),
	ShipEntity.ShipType.STEAMSHIP: load("res://objects/ship/traits/ship-sprite/textures/Drakkar.tres")
}

var Direction2Frame = {
	FacedData.Direction.SW: 0,
	FacedData.Direction.NW: 1,
	FacedData.Direction.N: 2,
	FacedData.Direction.NE: 3,
	FacedData.Direction.SE: 4,
	FacedData.Direction.S: 5,
}

@onready var parent: ShipObject = get_parent()

func updateTexture(type: ShipEntity.ShipType):
	super.updateTexture(self.Type2Texture[type])
	pass

func updateFrame():
	self.frame = Direction2Frame[parent.facedData.direction]
	pass

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	self.updateFrame()
	pass

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	self.updateFrame()
	pass
