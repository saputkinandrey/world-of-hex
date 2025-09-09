class_name ShipEntity 
extends Resource

enum ShipType {DRAKKAR=1, GALLEON=2, STEAMSHIP=3, TRIREME=4}

@export var speed: int = 3
@export var type: ShipType = ShipType.DRAKKAR
# CREW
@export var Sailor: OfficerEntity = OfficerEntity.new()
# OFFICERS
@export var Bosun: OfficerEntity = OfficerEntity.new()
@export var Gunner: OfficerEntity = OfficerEntity.new()
@export var Leader: OfficerEntity = OfficerEntity.new()
