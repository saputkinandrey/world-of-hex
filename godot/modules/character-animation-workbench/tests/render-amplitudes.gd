extends "res://modules/character-animation-workbench/tests/render-walk.gd"

const PREVIEW = preload("res://modules/character-animation-workbench/tests/amplitude-comparison.tscn")
const DESTINATION: String = "res://../tmp/animation-workbench/comparison-bounce-amplitudes"
const DIRECTIONS: Array[String] = ["south","north","south-west","north-west"]

func _run() -> void:
	var scene: Node = PREVIEW.instantiate()
	root.add_child(scene)
	await process_frame
	await process_frame
	var players: Array[AnimationPlayer] = []
	var rows: Array = []
	for amplitude: int in [2,3,4]:
		var row: Node = scene.get_node("Viewport/Bounce"+str(amplitude))
		rows.append(row)
		for index: int in row.VIEWS.size():
			var workbench: Node = row.get_node("Viewport/"+row.VIEWS[index])
			workbench._active_rig.get_node("Overlay").hide()
			var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
			if amplitude != 3:
				var library: AnimationLibrary = player.get_animation_library("").duplicate()
				library.remove_animation("run_loop")
				library.add_animation("run_loop",load("res://../tmp/animation-workbench/bounce-%s/%s/run_loop.tres" % [amplitude,DIRECTIONS[index]]))
				player.remove_animation_library("")
				player.add_animation_library("",library)
			players.append(player)
			row.get_node("Viewport/Caption"+row.VIEWS[index]).text = "%s px | %s | run_loop" % [amplitude,row.LABELS[row.VIEWS[index]]]
	var directory: String = DESTINATION+"/sequence"
	var error: Error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
	if error != OK:
		push_error("Cannot create amplitude frame directory: "+error_string(error))
		scene.free()
		quit(1)
		return
	for frame: int in 120:
		for player: AnimationPlayer in players:
			_sample(player,"run_loop",frame/float(FPS))
		await process_frame
		_save(scene.get_node("Viewport"),directory,frame)
	var file: FileAccess = FileAccess.open(DESTINATION+"/manifest.json",FileAccess.WRITE)
	if file == null:
		push_error("Cannot write amplitude manifest: "+error_string(FileAccess.get_open_error()))
		_failed = true
	else:
		file.store_string(JSON.stringify({"fps":FPS,"size":[2048,1536],"directions":["S","N","SW","NW"],"amplitudes":[2,3,4],"clips":{"sequence":120}},"  "))
	print("Rendered 2/3/4 px amplitude comparison: 120 frames, four authored views.")
	scene.free()
	quit(1 if _failed else 0)
