extends "res://modules/character-animation-workbench/tests/render-walk.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")
const DIRECTORY: String = "res://../tmp/animation-workbench/composition-v1.3/"
const NAMES: Array[String] = ["South", "North", "SouthWest", "NorthWest"]

func _red_pixels(image: Image, column: int) -> int:
	var count: int = 0
	for y: int in range(90, 455):
		for x: int in range(column*512+110, column*512+410):
			var color: Color = image.get_pixel(x,y)
			if color.r > .95 and color.g < .05 and color.b < .05:
				count += 1
	return count

func _ligament_pixels(image: Image, column: int) -> int:
	var count: int = 0
	for y: int in range(90,455):
		for x: int in range(column*512+110,column*512+410):
			var color: Color = image.get_pixel(x,y)
			if color.g > .55 and color.r < .4 and color.b > .2 and color.b < .6:
				count += 1
	return count

func _capture(viewport: SubViewport, name: String) -> Image:
	RenderingServer.force_draw(false)
	var image: Image = viewport.get_texture().get_image()
	if not name.is_empty():
		var error: Error = image.save_png(DIRECTORY + name + ".png")
		if error != OK:
			push_error("Cannot save composition diagnostic: " + error_string(error))
			_failed = true
	return image

func _run() -> void:
	var error: Error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(DIRECTORY))
	if error != OK:
		push_error("Cannot create composition diagnostic directory: " + error_string(error))
		quit(1)
		return
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	var workbenches: Array[Node2D] = []
	for index: int in NAMES.size():
		var workbench: Node2D = scene.get_node("Viewport/" + NAMES[index])
		workbench.source_direction = 0 if index < 2 else 2
		workbench.safe_compression = index % 2 == 1
		workbenches.append(workbench)
		scene.get_node("Viewport/Caption" + NAMES[index]).text = ("S" if index < 2 else "SW") + (" | raw compression" if index % 2 == 0 else " | protected compression")
	await process_frame
	await process_frame
	for workbench: Node2D in workbenches:
		for slot: String in ["WeaponBase", "WeaponSecondaryBase"]:
			workbench._active_rig.get_node("Layers/%s/PivotOrigin/MotionPivot/CounterPivot/Surface" % slot).hide()
	var viewport: SubViewport = scene.get_node("Viewport")
	if "--video" in OS.get_cmdline_user_args():
		await _render_sequence(scene, workbenches, viewport)
		scene.free()
		quit(1 if _failed else 0)
		return
	var cases: Dictionary = {"rest": ["RESET",0.0], "stretch": ["walk_loop",.25], "compression": ["run_loop",.25], "hand": ["run_loop",.5]}
	for name: String in cases:
		for workbench: Node2D in workbenches:
			_sample(workbench.get_node("AnimationPlayer"), cases[name][0], cases[name][1])
		await process_frame
		_capture(viewport, name)
	for mode: int in range(1,9):
		for workbench: Node2D in workbenches:
			workbench.region_debug = mode
		await process_frame
		_capture(viewport, "debug-" + str(mode))
	var maximum_before: int = 0
	var maximum_after: int = 0
	var worst_time: float = 0
	for workbench: Node2D in workbenches:
		workbench.region_debug = 7
	for frame: int in 12:
		var time: float = float(frame) / 12 * (2.0/3.0)
		for workbench: Node2D in workbenches:
			_sample(workbench.get_node("AnimationPlayer"), "run_loop", time)
		await process_frame
		var image: Image = _capture(viewport, "")
		var before: int = _red_pixels(image,2)
		var after: int = _red_pixels(image,3)
		if before > maximum_before:
			maximum_before = before
			worst_time = time
		maximum_after = maxi(maximum_after, after)
	for workbench: Node2D in workbenches:
		_sample(workbench.get_node("AnimationPlayer"), "run_loop", worst_time)
	await process_frame
	_capture(viewport, "worst-quality")
	for workbench: Node2D in workbenches:
		workbench.region_debug = 0
	await process_frame
	_capture(viewport, "worst-normal")
	for workbench: Node2D in workbenches:
		workbench.region_debug = 2
	await process_frame
	var standalone: int = _ligament_pixels(_capture(viewport,"ligaments-alone"),3)
	for workbench: Node2D in workbenches:
		workbench.region_debug = 8
	await process_frame
	var visible: int = _ligament_pixels(_capture(viewport,"ligaments-overlapped"),3)
	var file: FileAccess = FileAccess.open(DIRECTORY + "audit.json", FileAccess.WRITE)
	if file == null:
		push_error("Cannot save composition audit: " + error_string(FileAccess.get_open_error()))
		_failed = true
	else:
		file.store_string(JSON.stringify({"sw_unsafe_before":maximum_before,"sw_unsafe_after":maximum_after,"sw_ligament_alone":standalone,"sw_ligament_composited":visible,"run_time":worst_time,"cases":cases},"  "))
	print("Composition GPU audit: SW invalid/compressed ligament pixels before=%s, after=%s; t=%.4f." % [maximum_before,maximum_after,worst_time])
	print("SW ligament pixels: alone=%s, composited=%s (chunks occlude the difference)." % [standalone,visible])
	if maximum_before == 0 or maximum_after != 0:
		push_error("Compression control must reproduce and remove visible invalid ligament pixels")
		_failed = true
	if standalone <= visible:
		push_error("SW compression must demonstrate ligament occlusion by flesh chunks")
		_failed = true
	scene.free()
	await _render_controls()
	quit(1 if _failed else 0)

func _render_controls() -> void:
	var workbench: Node2D = load("res://modules/character-animation-workbench/skeletal-animation-workbench.tscn").instantiate()
	root.add_child(workbench)
	workbench.region_debug = 8
	await process_frame
	await process_frame
	var legend: Label = workbench.get_node("UI/Panel/Margin/Controls/RegionLegend")
	if legend.get_global_rect().end.y > root.size.y:
		push_error("Composition controls extend below the preview window")
		_failed = true
	RenderingServer.force_draw(false)
	var error: Error = root.get_texture().get_image().save_png(DIRECTORY + "controls.png")
	if error != OK:
		push_error("Cannot save controls preview: " + error_string(error))
		_failed = true
	workbench.free()

func _render_sequence(scene: Node, workbenches: Array[Node2D], viewport: SubViewport) -> void:
	var directory: String = DIRECTORY + "sequence"
	var error: Error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
	if error != OK:
		push_error("Cannot create composition sequence: " + error_string(error))
		_failed = true
		return
	var sequence: Animation = scene.get_node("SequencePlayer").get_animation("comparison")
	var frames: int = roundi(sequence.length * FPS)
	for index: int in frames:
		var absolute: float = float(index) / FPS
		var key: int = 0
		for candidate: int in sequence.track_get_key_count(0):
			if sequence.track_get_key_time(0,candidate) <= absolute:
				key = candidate
		var clip: String = sequence.animation_track_get_key_animation(0,key)
		var time: float = absolute - sequence.track_get_key_time(0,key)
		for column: int in workbenches.size():
			_sample(workbenches[column].get_node("AnimationPlayer"),clip,time)
			scene.get_node("Viewport/Caption" + NAMES[column]).text = "%s | %s | %s" % ["S" if column < 2 else "SW", "raw" if column % 2 == 0 else "protected", "idle" if clip == "RESET" else clip]
		await process_frame
		_save(viewport,directory,index)
	var file: FileAccess = FileAccess.open(DIRECTORY + "manifest.json",FileAccess.WRITE)
	if file == null:
		push_error("Cannot save composition manifest: " + error_string(FileAccess.get_open_error()))
		_failed = true
	else:
		file.store_string(JSON.stringify({"fps":FPS,"size":[viewport.size.x,viewport.size.y],"clips":{"sequence":frames}},"  "))
	print("Rendered composition comparison: %s frames." % frames)
