extends Node2D

@export var mainScene: Node2D

#func activate() -> void:
	#for scene in self.mainScene.scenes:
		#scene.hide()
	#self.show()
	#mainScene.activeScene = self


# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	Global.player.select = $Tokens/Drakkar
	Global.player.select.facedData.direction = FacedData.Direction.SE
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
	pass
