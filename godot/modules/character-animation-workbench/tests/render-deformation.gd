extends SceneTree

const SCENE = preload("res://modules/character-animation-workbench/tests/skeletal-acceptance.tscn")
const OUTPUT = "res://../tmp/animation-workbench/deformation"

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene: Node = SCENE.instantiate()
	root.add_child(scene)
	scene.get_node("SourceViewport").render_target_update_mode = SubViewport.UPDATE_DISABLED
	var viewport: SubViewport = scene.get_node("RigViewport")
	viewport.transparent_bg = false
	var workbench: Node2D = viewport.get_node("Workbench")
	workbench.get_node("UI").visible = false
	workbench.preview_zoom = 3.5
	workbench.get_node("Preview").position = Vector2(235, 215)
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	RenderingServer.set_default_clear_color(Color(0.10, 0.12, 0.15))
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUTPUT))
	await process_frame
	for example: String in ["body", "white", "blue"]:
		workbench.outfit = 1 if example == "blue" else 0
		workbench.apply_source()
		var rig: Node2D = workbench._active_rig
		rig.body_only = example == "body"
		await process_frame
		rig.get_node("Layers/WeaponBase").visible = false
		var directory: String = "%s/%s" % [OUTPUT, example]
		DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
		for index: int in 60:
			player.play("rig_lean")
			player.seek(float(index) / 30.0, true)
			player.pause()
			await process_frame
			RenderingServer.force_draw(false)
			var result: Error = viewport.get_texture().get_image().save_png("%s/frame-%04d.png" % [directory, index])
			if result != OK:
				push_error("Cannot save frame: %s" % error_string(result))
				quit(1)
				return
		print("Rendered %s: 60 native skeletal frames, 512x512, 30 FPS." % example)
	workbench.show_mesh = true
	player.play("rig_lean")
	player.seek(1.0, true)
	player.pause()
	await process_frame
	RenderingServer.force_draw(false)
	viewport.get_texture().get_image().save_png("%s/mesh-overlay.png" % OUTPUT)
	workbench.reparent(root)
	workbench.get_node("UI").visible = true
	workbench.show_stage = true
	workbench.get_node("Preview").position = Vector2(900, 620)
	workbench.preview_zoom = 3.0
	root.size = Vector2i(1920, 1080)
	await process_frame
	RenderingServer.force_draw(false)
	root.get_texture().get_image().save_png("%s/workbench.png" % OUTPUT)
	workbench.free()
	scene.free()
	quit()
