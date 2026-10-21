extends SceneTree

const DIRECTORY = "res://modules/character-animation-workbench/animations/"
const CLIPS: Array[String] = ["walk_loop", "idle_to_walk", "walk_to_idle", "run_loop", "walk_to_run", "run_to_walk", "idle_to_run", "run_to_idle"]
const PELVIS = "Skeleton2D/Pelvis"
const CHEST = PELVIS + "/Spine/Chest"
var _failed: bool = false

func _initialize() -> void:
	var error: Error = DirAccess.make_dir_recursive_absolute(DIRECTORY + "north")
	if error != OK:
		push_error("Cannot create North animation directory: " + error_string(error))
		quit(1)
		return
	for clip: String in CLIPS:
		_bake(clip)
	quit(1 if _failed else 0)

func _swapped(path: String) -> String:
	for bone: String in ["Thigh", "Calf", "Arm", "Forearm"]:
		path = path.replace(bone + "L", bone + "TEMP").replace(bone + "R", bone + "L").replace(bone + "TEMP", bone + "R")
	return path

func _weight(fraction: float) -> float:
	return fraction * fraction * fraction * (fraction * (6 * fraction - 15) + 10)

func _phase(clip: String, time: float, duration: float) -> float:
	match clip:
		"walk_loop", "run_loop": return time / duration
		"idle_to_walk": return -.25 + time * time
		"walk_to_idle": return time - time * time
		"walk_to_run": return time + .25 * time * time / duration
		"run_to_walk": return 1.5 * time - .25 * time * time / duration
		"idle_to_run": return -.375 + 1.5 * time * time
		"run_to_idle": return 1.5 * time - 1.5 * time * time
	assert(false, "Unknown North clip: " + clip)
	return 0

func _run_weight(clip: String, weight: float) -> float:
	match clip:
		"run_loop": return 1
		"walk_to_run", "idle_to_run": return weight
		"run_to_walk", "run_to_idle": return 1 - weight
	return 0

func _ground(phase: float, support: float) -> float:
	phase = fposmod(phase, 1)
	return 50 - 10 * phase / support if phase <= support else 40 + 10 * (phase - support) / (1 - support)

func _depth(clip: String, phase: float, weight: float) -> float:
	var walk: float = _ground(phase, .6) - 47
	var run: float = _ground(phase, .38) - 47
	match clip:
		"walk_loop": return walk
		"run_loop": return run
		"idle_to_walk": return walk * weight
		"walk_to_idle": return walk * (1 - weight)
		"idle_to_run": return run * weight
		"run_to_idle": return run * (1 - weight)
		"walk_to_run": return lerpf(walk, run, weight)
		"run_to_walk": return lerpf(run, walk, weight)
	assert(false, "Unknown North projection: " + clip)
	return 0

func _retarget(south: Animation, clip: String, time: float) -> Dictionary:
	var source: Dictionary = {}
	var pose: Dictionary = {}
	for track: int in south.get_track_count():
		var path: String = str(south.track_get_path(track))
		var value: Variant = south.value_track_interpolate(track, time)
		source[path] = value
		pose[_swapped(path)] = Vector2(-value.x, value.y) if value is Vector2 else -float(value)
	var weight: float = _weight(time / south.length)
	var phase: float = _phase(clip, time, south.length)
	var run_weight: float = _run_weight(clip, weight)
	for side: String in ["L", "R"]:
		var sign_x: float = -1 if side == "L" else 1
		var other: String = "R" if side == "L" else "L"
		var leg: String = PELVIS + "/Thigh" + side
		var calf_path: String = leg + "/Calf" + side
		var south_toe: Vector2 = source[PELVIS + ":position"] + Vector2(sign_x * 10, 4) + (source[calf_path + ":position"] + Vector2(sign_x * 3, 5).rotated(source[calf_path + ":rotation"])).rotated(source[leg + ":rotation"])
		var target: Vector2 = Vector2(-south_toe.x, south_toe.y - 2 * _depth(clip, phase + (0.0 if side == "L" else .5), weight))
		var north_leg: String = PELVIS + "/Thigh" + other
		var north_calf: String = north_leg + "/Calf" + other
		var hip: Vector2 = pose[PELVIS + ":position"] + Vector2(-sign_x * 10, 4)
		pose[north_calf + ":position"] = (target - hip).rotated(-pose[north_leg + ":rotation"]) - Vector2(-sign_x * 3, 5).rotated(pose[north_calf + ":rotation"])
		var arm: String = CHEST + "/Arm" + other
		pose[arm + ":position"].y = 4 - pose[arm + ":position"].y
		var forearm: String = arm + "/Forearm" + other + ":position"
		pose[forearm].y = 2 * (20 - 1.5 * run_weight) - pose[forearm].y
	return pose

func _bake(clip: String) -> void:
	var south: Animation = load(DIRECTORY + clip + ".tres")
	var north: Animation = Animation.new()
	north.resource_name = clip
	north.length = south.length
	north.loop_mode = south.loop_mode
	north.step = south.step
	for index: int in south.get_track_count():
		var track: int = north.add_track(Animation.TYPE_VALUE)
		north.track_set_path(track, NodePath(_swapped(str(south.track_get_path(index)))))
		north.track_set_interpolation_type(track, Animation.INTERPOLATION_CUBIC)
		north.track_set_interpolation_loop_wrap(track, south.loop_mode != Animation.LOOP_NONE)
		for key: int in south.track_get_key_count(index):
			var time: float = south.track_get_key_time(index, key)
			north.track_insert_key(track, time, _retarget(south, clip, time)[str(north.track_get_path(track))])
	var error: Error = ResourceSaver.save(north, DIRECTORY + "north/" + clip + ".tres")
	if error != OK:
		_failed = true
		push_error("Cannot save North %s: %s" % [clip, error_string(error)])
