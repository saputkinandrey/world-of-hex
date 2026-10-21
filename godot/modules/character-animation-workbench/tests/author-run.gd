extends SceneTree

const DIRECTORY = "res://modules/character-animation-workbench/animations/"
const PELVIS = "Skeleton2D/Pelvis"
const SPINE = PELVIS + "/Spine"
const CHEST = SPINE + "/Chest"
const RUN_DURATION: float = 2.0 / 3.0
const SPEED_TRANSITION: float = .8
var _walk: Animation
var _rest: Dictionary = {}
var _failed: bool = false

func _initialize() -> void:
	_walk = load(DIRECTORY + "walk_loop.tres")
	var reset: Animation = load(DIRECTORY + "rig_reset_south.tres")
	for track: int in _walk.get_track_count():
		var path: NodePath = _walk.track_get_path(track)
		_rest[str(path)] = reset.value_track_interpolate(reset.find_track(path, Animation.TYPE_VALUE), 0)
	_save("run_loop", RUN_DURATION, true)
	for clip: String in ["walk_to_run", "run_to_walk", "idle_to_run", "run_to_idle"]:
		_save(clip, SPEED_TRANSITION if clip.contains("walk") else .5, false)
	quit(1 if _failed else 0)

func _walk_pose(phase: float) -> Dictionary:
	var result: Dictionary = {}
	for track: int in _walk.get_track_count():
		result[str(_walk.track_get_path(track))] = _walk.value_track_interpolate(track, fposmod(phase, 1))
	return result

func _run_pose(phase: float) -> Dictionary:
	var pose: Dictionary = _rest.duplicate()
	var wave: float = sin(TAU * phase)
	var half: float = fposmod(phase, .5)
	var heights: Array[Vector2] = [Vector2(0, 1), Vector2(.08, 2.5), Vector2(.18, 1.8), Vector2(.32, -2), Vector2(.42, -4), Vector2(.5, 1)]
	var height: float = 0
	for index: int in heights.size() - 1:
		var first: Vector2 = heights[index]
		var last: Vector2 = heights[index + 1]
		if half >= first.x and half <= last.x:
			height = lerpf(first.y, last.y, smoothstep(first.x, last.x, half))
			break
	var pelvis: Vector2 = Vector2(.7 * wave, 25 + height)
	pose[PELVIS + ":position"] = pelvis
	pose[SPINE + ":rotation"] = .02 * wave
	pose[CHEST + ":rotation"] = -.035 * wave
	pose[CHEST + "/Head:rotation"] = .015 * wave
	pose[CHEST + "/Head:position"] = Vector2(0, -12 + .2 * sin(TAU * 2 * (phase - .04)))
	for side: String in ["L", "R"]:
		var sign_x: float = -1 if side == "L" else 1
		var step: float = fposmod(phase + (0.0 if side == "L" else .5), 1)
		var depth: float = cos(TAU * step)
		var support: bool = step <= .38
		var travel: float = (step - .38) / .62
		var ground: float = 50 - 10 * step / .38 if support else 40 + 10 * travel
		var lift: float = 0 if support else 8 * sin(PI * travel)
		var thigh: float = sign_x * .07 * sin(TAU * step)
		var calf: float = -sign_x * .055 * lift / 8
		var target: Vector2 = Vector2(sign_x * (13 + .4 * depth), ground - lift)
		var hip: Vector2 = pelvis + Vector2(sign_x * 10, 4)
		var leg: String = PELVIS + "/Thigh" + side
		pose[leg + ":rotation"] = thigh
		pose[leg + "/Calf" + side + ":position"] = (target - hip).rotated(-thigh) - Vector2(sign_x * 3, 5).rotated(calf)
		pose[leg + "/Calf" + side + ":rotation"] = calf
		var arm: String = CHEST + "/Arm" + side
		pose[arm + ":position"] = Vector2(sign_x * 23, 1 - 2.8 * depth)
		pose[arm + ":rotation"] = sign_x * .035 * depth
		pose[arm + "/Forearm" + side + ":position"] = Vector2(sign_x * 4, 18.5 - depth)
		pose[arm + "/Forearm" + side + ":rotation"] = sign_x * (.10 - .035 * depth)
	return pose

func _blend(first: Dictionary, last: Dictionary, amount: float) -> Dictionary:
	var pose: Dictionary = {}
	for path: String in first:
		pose[path] = lerp(first[path], last[path], amount)
	return pose

func _sample(clip: String, time: float, duration: float) -> Dictionary:
	var fraction: float = time / duration
	var weight: float = fraction * fraction * fraction * (fraction * (6 * fraction - 15) + 10)
	match clip:
		"run_loop":
			return _run_pose(fraction)
		"walk_to_run":
			var phase: float = time + .25 * time * time / duration
			return _blend(_walk_pose(phase), _run_pose(phase), weight)
		"run_to_walk":
			var phase: float = 1.5 * time - .25 * time * time / duration
			return _blend(_run_pose(phase), _walk_pose(phase), weight)
		"idle_to_run":
			return _blend(_rest, _run_pose(-.375 + 1.5 * time * time), weight)
		"run_to_idle":
			return _blend(_run_pose(1.5 * time - 1.5 * time * time), _rest, weight)
	assert(false, "Unsupported run clip: " + clip)
	return {}

func _save(clip: String, duration: float, loop: bool) -> void:
	var animation: Animation = Animation.new()
	animation.resource_name = clip
	animation.length = duration
	animation.loop_mode = Animation.LOOP_LINEAR if loop else Animation.LOOP_NONE
	animation.step = 1.0 / 30
	var keys: int = 40 if loop else 32
	for path: String in _rest:
		var track: int = animation.add_track(Animation.TYPE_VALUE)
		animation.track_set_path(track, NodePath(path))
		animation.track_set_interpolation_type(track, Animation.INTERPOLATION_CUBIC)
		animation.track_set_interpolation_loop_wrap(track, loop)
		for index: int in keys + 1:
			var time: float = duration * index / keys
			animation.track_insert_key(track, time, _sample(clip, time, duration)[path])
	var error: Error = ResourceSaver.save(animation, DIRECTORY + clip + ".tres")
	if error != OK:
		_failed = true
		push_error("Cannot save %s: %s" % [clip, error_string(error)])
