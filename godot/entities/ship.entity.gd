class_name ShipEntity 
extends Resource

enum ShipType {DRAKKAR=1, GALLEON=2, STEAMSHIP=3, TRIREME=4}

const ShipTypeMap: Dictionary = {
    "drakkar": ShipType.DRAKKAR,
    "galleon": ShipType.GALLEON,
    "steamship": ShipType.STEAMSHIP,
    "trireme": ShipType.TRIREME
}

@export var _id: String
var createdAt: Variant = null
var updatedAt: Variant = null
var deletedAt: Variant = null

@export var name: String
@export var speed: int = 3
@export var type: ShipType = ShipType.DRAKKAR


func from_dict(data: Dictionary) -> ShipEntity:
    _id = data.get("_id", "")
    name = data.get("name", "")
    speed = data.get("speed", 3)

    # Тип корабля из строки или числа
    if data.has("type"):
        var t: Variant = data.type
        if t is String and ShipTypeMap.has(t.to_lower()):
            type = ShipTypeMap[t.to_lower()]
        elif t is int:
            push_error("Unknown ShipType number: %s" % str(t))

    # Даты
    createdAt = data.get("createdAt", null)
    updatedAt = data.get("updatedAt", null)
    deletedAt = data.get("deletedAt", null)

    return self
