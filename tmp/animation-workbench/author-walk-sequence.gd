extends SceneTree

func _initialize() -> void:
	var animation: Animation = Animation.new()
	animation.resource_name = "walk_sequence"
	animation.length = 4.5
	animation.loop_mode = Animation.LOOP_LINEAR
	var track: int = animation.add_track(Animation.TYPE_ANIMATION)
	animation.track_set_path(track, NodePath("Viewport/Workbench/AnimationPlayer"))
	for key: Array in [[0.0, "RESET"], [0.75, "idle_to_walk"], [1.25, "walk_loop"], [3.25, "walk_to_idle"], [3.75, "RESET"]]:
		animation.animation_track_insert_key(track, key[0], key[1])
	var library: AnimationLibrary = AnimationLibrary.new()
	library.add_animation("walk_sequence", animation)
	var result: Error = ResourceSaver.save(library, "res://modules/character-animation-workbench/tests/walk-sequence-library.tres")
	if result != OK:
		push_error("Cannot save walk preview sequence: %s" % error_string(result))
	quit(0 if result == OK else 1)
