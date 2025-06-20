extends Node2D

@export var ship: ShipEntity

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	$Drakkar2.shipData.type = Global.ship2.type;
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass
