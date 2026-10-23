@tool
extends Resource

@export var poses: AnimationLibrary
@export_range(0.0,8.0,.1) var walk_bounce: float = 1.5
@export_range(0.0,8.0,.1) var run_bounce: float = 3.0
@export var walk_baseline: float = 1.6
@export var run_baseline: float = 2.4
# Stride, lift, upper-body displacement gains; projections are calibrated apart.
@export var direction_gains: Dictionary[String,Vector3] = {
	"south":Vector3(1.2,1.15,1.0), "north":Vector3(1.2,1.15,1.0),
	"south-west":Vector3(1.0,1.0,1.0), "north-west":Vector3(1.0,1.0,1.0)
}
