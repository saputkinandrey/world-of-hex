class_name TileSprite2D
extends Sprite2D


@export var tilemap: TileMapLayer
@export var direction: types.TileDirection = types.TileDirection.N

var desiredPosition: Vector2i
var currentPosition: Vector2i
@export var velocityX: int = 0
@export var velocityY: int = 0
@export var timePeriod: int = 1000

func updateTexture(texture):
	self.texture = texture

func updateVelocity(speed:int):
	self.velocityX = self.tilemap.tile_set.tile_size.x * speed
	self.velocityY = self.tilemap.tile_set.tile_size.y * speed

func turnLeft():
	self.direction = helpers.TurnLeftDict[self.direction]
	
func turnRight():
	self.direction = helpers.TurnRightDict[self.direction]

func move(movement:Vector2i):
	print("movement", movement)
	print('position', self.currentPosition)
	self.desiredPosition = self.currentPosition + movement
	print('desired', self.desiredPosition)
	self.currentPosition = self.desiredPosition
	self.position = tilemap.map_to_local(self.currentPosition)
	pass

func _ready() -> void:
	self.currentPosition = tilemap.local_to_map(self.position)
	self.position = tilemap.map_to_local(self.currentPosition)
	pass


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass
