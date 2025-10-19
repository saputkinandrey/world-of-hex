class_name ShipSpriteTrait
extends TileSprite2D

var Type2Texture: Dictionary = {
    ShipEntity.ShipType.DRAKKAR: load("res://assets/drakkar 1-6.png"),
    ShipEntity.ShipType.GALLEON: load("res://assets/galleon 1-6.png"),
    ShipEntity.ShipType.TRIREME: load("res://assets/greek-ship 1-6.png"),
    ShipEntity.ShipType.STEAMSHIP: load("res://assets/steamship 1-6.png")
}

var Direction2Frame: Dictionary = {
    ShipToEncounterEntity.Direction.SW: 0,
    ShipToEncounterEntity.Direction.NW: 1,
    ShipToEncounterEntity.Direction.N: 2,
    ShipToEncounterEntity.Direction.NE: 3,
    ShipToEncounterEntity.Direction.SE: 4,
    ShipToEncounterEntity.Direction.S: 5,
}

@onready var parent: ShipObject = get_parent()

func updateTexture(type: ShipEntity.ShipType):
    super.updateTexture(self.Type2Texture[type])
    pass

func updateFrame():
    var direction: ShipToEncounterEntity.Direction = parent.facedData.direction
    var frame: int = Direction2Frame[direction]
    self.frame = frame
    pass

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
    self.updateFrame()
    pass

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
    self.updateFrame()
    pass
