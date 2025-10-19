class_name MovableState
extends Node

var duration: float = 0.0
var timePassed: float = 0.0

func reset(duration: float = 0.0) -> void:
        self.duration = duration
        self.timePassed = 0.0
        pass
