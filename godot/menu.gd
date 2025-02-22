extends Control

@export var seaCombatScene: Node2D
@export var shipConstructorScene: Node2D


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass


func _on_exit_pressed() -> void:
	print('EXIT PRESSED')
	get_tree().quit()

func _input(event):
	if event.is_action_pressed("ui_cancel"):
		if(self.visible):
			self.hide()
		else:
			self.show()
		#get_tree().quit()


func _on_sea_combat_pressed() -> void:
	self.seaCombatScene.activate()
	pass # Replace with function body.
