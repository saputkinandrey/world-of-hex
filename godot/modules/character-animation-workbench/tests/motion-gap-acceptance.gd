extends "res://modules/character-animation-workbench/tests/render-walk.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")
const GAP: Rect2i = Rect2i(1753,400,13,11)
const CROP: Rect2i = Rect2i(1640,150,300,320)
const DIRECTORY: String = "res://../tmp/animation-workbench/"

func _image(viewport: SubViewport) -> Image:
	RenderingServer.force_draw(false)
	return viewport.get_texture().get_image()

func _background_pixels(image: Image) -> int:
	var background: Color = image.get_pixel(0,0)
	var count: int = 0
	for y: int in range(GAP.position.y,GAP.end.y):
		for x: int in range(GAP.position.x,GAP.end.x):
			if image.get_pixel(x,y).is_equal_approx(background):
				count += 1
	return count

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var workbench: Node2D = scene.get_node("Viewport/NorthWest")
	var surface: Polygon2D = workbench._active_rig.get_node("Layers/BodyBase/Surface")
	var viewport: SubViewport = scene.get_node("Viewport")
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	_sample(player,"run_loop",0.0)
	await process_frame
	surface.material.set_shader_parameter("motion_gap_repairs_enabled",false)
	var before: Image = _image(viewport)
	surface.material.set_shader_parameter("motion_gap_repairs_enabled",true)
	var after: Image = _image(viewport)
	var old_count: int = _background_pixels(before)
	var new_count: int = _background_pixels(after)
	if old_count < 100 or new_count > 8:
		push_error("NW visible calf gap must reproduce and leave at most 8 background pixels; before=%s after=%s" % [old_count,new_count])
		_failed = true
	for entry: Array in [[before,"NW-run-before.png"],[after,"NW-run-after.png"]]:
		var error: Error = entry[0].get_region(CROP).save_png(DIRECTORY+entry[1])
		if error != OK:
			push_error("Cannot save motion gap proof: "+error_string(error))
			_failed = true
	_sample(player,"RESET",0.0)
	await process_frame
	surface.material.set_shader_parameter("motion_gap_repairs_enabled",false)
	var rest: PackedByteArray = _image(viewport).get_data()
	surface.material.set_shader_parameter("motion_gap_repairs_enabled",true)
	if rest != _image(viewport).get_data():
		push_error("Pose-activated gap repair changes RESET")
		_failed = true
	print("Visible NW calf gap: before=%s, after=%s background pixels; RESET unchanged." % [old_count,new_count])
	scene.free()
	quit(1 if _failed else 0)
