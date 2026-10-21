extends SceneTree

const FIXTURE = preload("res://modules/character-animation-workbench/tests/skeletal-acceptance.tscn")
const Adapter = preload("res://modules/character-animation-workbench/source-adapter.gd")
const OUTPUT = "res://../tmp/animation-workbench/north-layers/"
const TORSO = Rect2i(140, 215, 235, 105)
var _failed: bool = false

func _initialize() -> void:
	call_deferred("_run")

func _capture(viewport: SubViewport) -> Image:
	RenderingServer.force_draw(false)
	return viewport.get_texture().get_image()

func _exposed(full: Image, covered: Image, region: Rect2i = TORSO) -> int:
	var count: int = 0
	for y: int in range(region.position.y, region.end.y):
		for x: int in range(region.position.x, region.end.x):
			var first: Color = full.get_pixel(x, y)
			var last: Color = covered.get_pixel(x, y)
			if maxf(absf(first.r - last.r), maxf(absf(first.g - last.g), absf(first.b - last.b))) > .01:
				count += 1
	return count

func _save(image: Image, name: String) -> void:
	var error: Error = image.save_png(OUTPUT + name + ".png")
	if error != OK:
		push_error("Cannot save %s layer diagnostic: %s" % [name, error_string(error)])
		_failed = true

func _require(condition: bool, message: String) -> void:
	if not condition:
		_failed = true
		push_error(message)

func _run() -> void:
	var fixture: Node = FIXTURE.instantiate()
	root.add_child(fixture)
	var original: Node = fixture.get_node("SourceViewport/Source")
	var source: CharacterSpriteEntity = Adapter.source_entity(original)
	source.reparent(fixture.get_node("SourceViewport/Origin"), false)
	source.position = Vector2.ZERO
	source.scale = Vector2(3.5, 3.5)
	source.direction = 1
	source.shirt_color = 2
	source.show_weapon = false
	source.show_formation_reference = false
	original.hide()
	fixture.get_node("SourceViewport/Origin").position = Vector2(228, 215)
	var workbench: Node2D = fixture.get_node("RigViewport/Workbench")
	workbench.outfit = 1
	workbench.source_direction = 1
	workbench.preview_zoom = 3.5
	workbench.get_node("Preview").position = Vector2(228, 215)
	workbench.get_node("UI").hide()
	workbench.apply_source()
	await process_frame
	await process_frame
	var directory_error: Error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUTPUT))
	if directory_error != OK:
		push_error("Cannot create North layer diagnostics: " + error_string(directory_error))
		fixture.free()
		quit(1)
		return
	var rig: Node2D = workbench._active_rig
	for slot: String in ["WeaponBase", "WeaponSecondaryBase"]:
		rig.get_node("Layers/%s/PivotOrigin/MotionPivot/CounterPivot/Surface" % slot).hide()
	await process_frame
	var original_image: Image = _capture(fixture.get_node("SourceViewport"))
	var rig_image: Image = _capture(fixture.get_node("RigViewport"))
	_save(original_image, "source-full")
	_save(rig_image, "rig-full")
	source.get_node(source.LAYER_NODE_PATH.body).hide()
	workbench._active_rig.get_node("Layers/BodyBase").hide()
	await process_frame
	var original_without_body: Image = _capture(fixture.get_node("SourceViewport"))
	var rig_without_body: Image = _capture(fixture.get_node("RigViewport"))
	_save(original_without_body, "source-without-body")
	_save(rig_without_body, "rig-without-body")
	var source_exposed: int = _exposed(original_image, original_without_body)
	var rig_exposed: int = _exposed(rig_image, rig_without_body)
	print("North torso body exposure: source=%s pixels; rig=%s pixels." % [source_exposed, rig_exposed])
	_require(rig_exposed == 0, "Body is visible through/around the North shirt inside the covered torso region.")
	_require(_exposed(rig_image, rig_without_body, Rect2i(170, 335, 170, 45)) > 0, "Occlusion must preserve exposed hands")
	rig.get_node("Layers/BodyBase").show()
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	var maximum_exposure: int = 0
	for outfit: int in [0, 1]:
		workbench.outfit = outfit
		workbench.apply_source()
		await process_frame
		for clip: String in ["walk_loop", "run_loop", "idle_to_walk", "walk_to_idle", "walk_to_run", "run_to_walk", "idle_to_run", "run_to_idle"]:
			for fraction: float in [.0, .25, .5, .75]:
				player.play(clip)
				player.seek(player.get_animation(clip).length * fraction, true)
				player.pause()
				rig.get_node("Layers/BodyBase").show()
				await process_frame
				var full: Image = _capture(fixture.get_node("RigViewport"))
				rig.get_node("Layers/BodyBase").hide()
				await process_frame
				var covered: Image = _capture(fixture.get_node("RigViewport"))
				var exposed: int = _exposed(full, covered)
				maximum_exposure = maxi(maximum_exposure, exposed)
				_require(exposed == 0, "North torso exposure in %s / outfit %s / phase %s: %s pixels" % [clip, outfit, fraction, exposed])
	rig.get_node("Layers/BodyBase").show()
	rig.get_node("Layers/ShirtsBase/Surface").hide()
	_require(not rig.get_node("Layers/BodyBase/Surface").material.get_shader_parameter("occlusion_enabled"), "Hiding the shirt disables body occlusion")
	rig.get_node("Layers/ShirtsBase/Surface").show()
	rig.body_only = true
	_require(not rig.get_node("Layers/BodyBase/Surface").material.get_shader_parameter("occlusion_enabled"), "Body-only mode disables garment occlusion")
	print("North animated layer checks: maximum torso exposure %s pixels." % maximum_exposure)
	fixture.free()
	quit(1 if _failed else 0)
