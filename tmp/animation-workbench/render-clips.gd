extends SceneTree

const FIXTURE = preload("res://modules/character-animation-workbench/tests/acceptance.tscn")
const FPS: int = 50
const OUTPUT: String = "res://../tmp/animation-workbench/renders"

func _initialize() -> void:
	call_deferred("_render")

func _render() -> void:
	var fixture: Node = FIXTURE.instantiate()
	root.add_child(fixture)
	fixture.get_node("SourceViewport").render_target_update_mode = SubViewport.UPDATE_DISABLED
	var viewport: SubViewport = fixture.get_node("RigViewport")
	viewport.transparent_bg = false
	RenderingServer.set_default_clear_color(Color(0.10, 0.12, 0.15))
	var rig: Node2D = viewport.get_node("Workbench")
	rig.get_node("UI").visible = false
	rig.show_stage = false
	rig.preview_zoom = 3.5
	rig.get_node("Preview").position = Vector2(240, 210)
	rig.outfit = 2
	rig.source_pose = 0
	rig.source_direction = 0
	rig.apply_source()
	await process_frame
	var player: AnimationPlayer = rig.get_node("AnimationPlayer")
	for clip: String in ["idle_breathe", "weapon_swing"]:
		var animation: Animation = player.get_animation(clip)
		var duration: float = animation.length + (0.5 if clip == "weapon_swing" else 0.0)
		var count: int = roundi(duration * FPS)
		var directory: String = "%s/%s" % [OUTPUT, clip]
		var result: Error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(directory))
		if result != OK:
			push_error("Cannot create frame directory: %s" % error_string(result))
			quit(1)
			return
		rig.reset_motion()
		for frame: int in count:
			player.play(clip)
			player.seek(minf(float(frame) / FPS, animation.length), true)
			player.pause()
			RenderingServer.force_draw(false)
			var image: Image = viewport.get_texture().get_image()
			result = image.save_png("%s/frame-%04d.png" % [directory, frame])
			if result != OK:
				push_error("Cannot save frame %s: %s" % [frame, error_string(result)])
				quit(1)
				return
		print("Rendered %s: %s frames, %s FPS, 512x512" % [clip, count, FPS])
	fixture.free()
	quit()
