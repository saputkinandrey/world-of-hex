class_name SeaCombatScene
extends Node2D
@export var mainScene: Node2D
@export var encounter: EncounterEntity = EncounterEntity.new()

@onready var tokens = $Map/Tokens
@onready var ws_node = $SeaCombatSocket

func spawnShipToken(shipToEnc: ShipToEncounterEntity):
	var shipScene = preload("res://scenes/ship.tscn")
	var shipSceneInstance: ShipObject = shipScene.instantiate()
	shipSceneInstance.tileMapLayer = $Map
	$Map.set_circle_tiles(shipToEnc.position, self.encounter.radius * 2)
	tokens.add_child(shipSceneInstance.setShip(shipToEnc))
	pass

func connectToEncounter(encounterId: String) -> void:
	self.ws_node.sendMessage(
		LoadEncounterMessage.new()
			.setUserId(Global.player.player._id)
			.setEncounterId(encounterId)
	)
	pass

func activate() -> void:
	for scene in self.mainScene.scenes:
		scene.hide()
	self.show()
	mainScene.activeScene = self


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	ws_node.connect("encounterLoaded", Callable(self, "_on_encounter_loaded"))
	#Global.player.select = $Map/Tokens/Drakkar
	#Global.player.select.facedData.direction = ShipToEncounterEntity.Direction.SE
	pass # Replace with function body.
	
func _on_encounter_loaded(encounter: EncounterEntity):
	print("ENCOUNTER LOADED")
	self.encounter = encounter
	$Controls/Label.text = "Circle: " + str(encounter.radius * 2)
	#$Map.set_circle_tiles(Vector2i(0,0), encounter.radius  * 2)
	for ship in self.encounter.ships:
		self.spawnShipToken(ship)
		print("123")
	self.activate()
	pass # Replace with function body.

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass
