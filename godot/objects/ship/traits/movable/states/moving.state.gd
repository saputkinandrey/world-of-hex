class_name MovingState
extends MovableState

@onready var parent: MovableTrait = get_parent()

func _ready() -> void:
	pass

func _process(delta: float) -> void:
	self.timePassed += delta
	if (self.timePassed > self.duration):
		parent.state = parent.IdleState
	pass
