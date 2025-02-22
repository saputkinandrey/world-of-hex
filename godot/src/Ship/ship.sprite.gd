class_name ShipSprite
extends TileSprite2D

var Direction2Frame = {
	types.TileDirection.SW: 0,
	types.TileDirection.NW: 1,
	types.TileDirection.N: 2,
	types.TileDirection.NE: 3,
	types.TileDirection.SE: 4,
	types.TileDirection.S: 5,
}

		
func updateFrame():
	self.frame = Direction2Frame[self.direction]

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	self.updateFrame()
	super._ready()


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	self.updateFrame()
	super._process(delta)
