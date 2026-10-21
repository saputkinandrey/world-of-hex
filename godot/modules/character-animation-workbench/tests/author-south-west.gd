extends "res://modules/character-animation-workbench/tests/author-north.gd"

const WIDTH: float = .65
const DEPTH = Vector2(-.8, .65)
const VIEW = "south-west/"

func _initialize() -> void:
	var error: Error = DirAccess.make_dir_recursive_absolute(DIRECTORY + VIEW)
	if error != OK:
		push_error("Cannot create SW animation directory: " + error_string(error))
		quit(1)
		return
	for clip: String in CLIPS:
		_bake(clip)
	quit(1 if _failed else 0)

func _retarget(south: Animation, clip: String, time: float) -> Dictionary:
	var source: Dictionary = {}
	var pose: Dictionary = {}
	for track: int in south.get_track_count():
		var path: String = str(south.track_get_path(track))
		var value: Variant = south.value_track_interpolate(track, time)
		source[path] = value
		pose[path] = Vector2(value.x * WIDTH, value.y) if value is Vector2 else value
	var weight: float = _weight(time / south.length)
	var phase: float = _phase(clip, time, south.length)
	var run_weight: float = _run_weight(clip, weight)
	for side: String in ["L", "R"]:
		var sign_x: float = -1 if side == "L" else 1
		var leg: String = PELVIS + "/Thigh" + side
		var calf: String = leg + "/Calf" + side
		var south_toe: Vector2 = source[PELVIS + ":position"] + Vector2(sign_x * 10, 4) + (source[calf + ":position"] + Vector2(sign_x * 3, 5).rotated(source[calf + ":rotation"])).rotated(source[leg + ":rotation"])
		var depth: float = _depth(clip, phase + (0.0 if side == "L" else .5), weight)
		var lift: float = 47 + depth - south_toe.y
		var target: Vector2 = Vector2(south_toe.x * WIDTH, 47 - lift) + DEPTH * depth
		var hip: Vector2 = pose[PELVIS + ":position"] + Vector2(sign_x * 10 * WIDTH, 4)
		pose[calf + ":position"] = (target - hip).rotated(-pose[leg + ":rotation"]) - Vector2(sign_x * 3 * WIDTH, 5).rotated(pose[calf + ":rotation"])
		var arm: String = CHEST + "/Arm" + side
		var arm_depth: float = source[arm + ":position"].y - 2
		pose[arm + ":position"] = Vector2(source[arm + ":position"].x * WIDTH, 2) + DEPTH * arm_depth
		var forearm: String = arm + "/Forearm" + side + ":position"
		var elbow_y: float = 20 - 1.5 * run_weight
		var forearm_depth: float = source[forearm].y - elbow_y
		pose[forearm] = Vector2(source[forearm].x * WIDTH, elbow_y) + DEPTH * forearm_depth
	return pose

func _bake(clip: String) -> void:
	var south: Animation = load(DIRECTORY + clip + ".tres")
	var diagonal: Animation = Animation.new()
	diagonal.resource_name = clip
	diagonal.length = south.length
	diagonal.loop_mode = south.loop_mode
	diagonal.step = south.step
	for index: int in south.get_track_count():
		var track: int = diagonal.add_track(Animation.TYPE_VALUE)
		diagonal.track_set_path(track, south.track_get_path(index))
		diagonal.track_set_interpolation_type(track, Animation.INTERPOLATION_CUBIC)
		diagonal.track_set_interpolation_loop_wrap(track, south.loop_mode != Animation.LOOP_NONE)
		for key: int in south.track_get_key_count(index):
			var time: float = south.track_get_key_time(index, key)
			diagonal.track_insert_key(track, time, _retarget(south, clip, time)[str(diagonal.track_get_path(track))])
	var error: Error = ResourceSaver.save(diagonal, DIRECTORY + VIEW + clip + ".tres")
	if error != OK:
		_failed = true
		push_error("Cannot save SW %s: %s" % [clip, error_string(error)])
