extends Sprite2D

var Type2Texture = {
	ShipEntity.Type.DRAKKAR: load("res://tokens/Drakkar.tres")
}

var Direction2Frame = {
	ShipEntity.Direction.SW: 0,
	ShipEntity.Direction.NW: 1,
	ShipEntity.Direction.N: 2,
	ShipEntity.Direction.NE: 3,
	ShipEntity.Direction.SE: 4,
	ShipEntity.Direction.S: 5,
}

@export var parent: ShipEntity

func updateTexture():
	self.texture = Type2Texture[parent.type]
	
func updateFrame():
	self.frame = Direction2Frame[parent.direction]

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	self.updateTexture()
	self.updateFrame()
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass
