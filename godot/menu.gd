extends Control

@export var seaCombatScene: SeaCombatScene
@export var shipConstructorScene: Node2D
@export var rpsLocationScene: RpsLocationScene



# Called when the node enters the scene tree for the first time.
func _ready() -> void:
    pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
    pass


func _on_exit_pressed() -> void:
    print('EXIT PRESSED')
    get_tree().quit()

func _input(event: InputEvent) -> void:
    if event.is_action_pressed("ui_cancel"):
        if self.visible:
            self.hide()
        else:
            self.show()
        #get_tree().quit()


func _on_sea_combat_pressed() -> void:
    self.seaCombatScene.activate()
    pass # Replace with function body.


func _on_battle_for_nothing_pressed() -> void:
    var battleForNothingId: String = '6873743de19a720b371cac5e'
    self.seaCombatScene.connectToEncounter(battleForNothingId)
    pass # Replace with function body.


func _on_rps_location_pressed() -> void:
    var location_id: String = "dev:lizard-puddle"
    rpsLocationScene.connect_to_location(location_id)


func _on_sort_of_pressed() -> void:
    var sortOfId: String = '68c987fe2c58ea7363e4e19a'
    self.seaCombatScene.connectToEncounter(sortOfId)
    pass # Replace with function body.
