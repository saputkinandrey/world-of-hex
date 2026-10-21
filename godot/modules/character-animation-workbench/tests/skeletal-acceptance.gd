extends SceneTree

const FIXTURE = preload("res://modules/character-animation-workbench/tests/skeletal-acceptance.tscn")
const Adapter = preload("res://modules/character-animation-workbench/source-adapter.gd")
const Overlay = preload("res://modules/character-animation-workbench/skin-overlay.gd")
var _failures: int = 0

func _initialize() -> void:
	call_deferred("_run")

func _check(condition: bool, message: String) -> void:
	if not condition:
		_failures += 1
		push_error("FAIL: %s" % message)

func _sample(player: AnimationPlayer, time: float) -> void:
	player.play("rig_lean")
	player.seek(time, true)
	player.pause()

func _run() -> void:
	var fixture: Node = FIXTURE.instantiate()
	root.add_child(fixture)
	var original: Node = fixture.get_node("SourceViewport/Source")
	var source: CharacterSpriteEntity = Adapter.source_entity(original)
	source.reparent(fixture.get_node("SourceViewport/Origin"), false)
	source.position = Vector2.ZERO
	source.show_formation_reference = false
	original.visible = false
	var workbench: Node2D = fixture.get_node("RigViewport/Workbench")
	workbench.preview_zoom = 1.0
	workbench.get_node("Preview").position = Vector2(256, 320)
	workbench.get_node("UI").visible = false
	var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
	_check(player.has_animation("rig_lean"), "Saved native skeletal clip is available")
	_check(player.get_animation("rig_lean").track_get_key_count(0) >= 3, "Skeletal clip has rest/deformation/rest keys")
	workbench.outfit = 0
	workbench.apply_source()
	for direction: int in 6:
		source.direction = direction
		workbench.source_direction = direction
		workbench.apply_source()
		var clips: OptionButton = workbench.get_node("UI/Panel/Margin/Controls/Clip")
		_check(clips.selected >= 0 and clips.get_item_text(clips.selected) == "rig_lean", "Direction switch preserves compatible selected clip")
		var rig: Node2D = workbench._active_rig
		var skeleton: Skeleton2D = rig.get_node("Skeleton2D")
		_check(skeleton.get_bone_count() == 12, "Twelve explicit bones in direction %s" % direction)
		for base: Node2D in rig.get_node("Layers").get_children():
			var slot: String = base.get_meta("slot")
			var sprite: Sprite2D = source.get_node(source.LAYER_NODE_PATH[slot])
			_check(base.visible == sprite.visible, "%s/%s source visibility" % [direction, slot])
			if base.has_node("Surface") and base.visible:
				var surface: Polygon2D = base.get_node("Surface")
				_check(surface.texture == sprite.texture, "%s/%s original texture" % [direction, slot])
				_check(surface.internal_vertex_count > 0 and surface.polygons.size() > 100, "Internal mesh vertices and triangles")
				for vertex: int in surface.polygon.size():
					var total: float = 0.0
					var influences: int = 0
					for bone: int in surface.get_bone_count():
						var weight: float = surface.get_bone_weights(bone)[vertex]
						total += weight
						influences += int(weight > 0.0)
					_check(absf(total - 1.0) < 0.00001 and influences <= 4, "Normalized GPU-compatible weights")
		if DisplayServer.get_name() != "headless":
			# Compare the intentional North presentation correction on both the
			# Sprite2D reference and the skinned rig. The layer regression test
			# independently verifies that the corrected shirt has no body halo.
			var source_body: Sprite2D = source.get_node(source.LAYER_NODE_PATH.body)
			var source_shirt: Sprite2D = source.get_node(source.LAYER_NODE_PATH.shirts)
			var old_material: Material = source_body.material
			var old_shirt_position: Vector2 = source_shirt.position
			if direction == 1:
				source_body.material = rig.get_node("Layers/BodyBase/Surface").material
				source_shirt.position.y -= .6
			await process_frame
			RenderingServer.force_draw(false)
			_compare_images(fixture, "neutral direction %s" % direction)
			source_body.material = old_material
			source_shirt.position = old_shirt_position
	var full: Dictionary = load("res://modules/character-animation-workbench/source-settings.tres").get_meta("outfits")["Full layers"]
	var original_properties: Dictionary = {}
	source.direction = 0
	for property: String in full:
		original_properties[property] = source.get(property)
		source.set(property, full[property])
	workbench.source_direction = 0
	workbench.outfit = 3
	workbench.apply_source()
	if DisplayServer.get_name() != "headless":
		await process_frame
		RenderingServer.force_draw(false)
		_compare_images(fixture, "complete frontal outfit")
	for property: String in original_properties:
		source.set(property, original_properties[property])
	workbench.source_direction = 0
	workbench.outfit = 1
	workbench.apply_source()
	var rig: Node2D = workbench._active_rig
	var skeleton: Skeleton2D = rig.get_node("Skeleton2D")
	var mesh: Polygon2D = rig.get_node("Layers/BodyBase/Surface")
	var shirt: Polygon2D = rig.get_node("Layers/ShirtsBase/Surface")
	var base_transform: Transform2D = mesh.get_parent().transform
	var vertices: PackedVector2Array = mesh.polygon.duplicate()
	var weights: PackedFloat32Array = shirt.get_bone_weights(1).duplicate()
	var rest: PackedVector2Array = Overlay.deformed_vertices(mesh, skeleton)
	_sample(player, 0.5)
	_check(is_equal_approx(skeleton.get_node("Pelvis/Spine").rotation, 0.06), "Bone rotation interpolates at arbitrary middle time")
	_sample(player, 1.0)
	_check(is_equal_approx(skeleton.get_node("Pelvis/Spine").rotation, 0.12), "Bone rotation reaches exact key")
	var bent: PackedVector2Array = Overlay.deformed_vertices(mesh, skeleton)
	var shape_changed: bool = false
	for index: int in rest.size() - 1:
		if absf(rest[index].distance_to(rest[index + 1]) - bent[index].distance_to(bent[index + 1])) > 0.02:
			shape_changed = true
	_check(shape_changed, "Within-image distances change: deformation is not a rigid PNG transform")
	_check(mesh.polygon == vertices and mesh.get_parent().transform == base_transform, "Skinning preserves immutable base geometry and registration")
	_check(mesh.get_node(mesh.skeleton) == shirt.get_node(shirt.skeleton), "Body and clothing share one skeleton")
	_check(mesh.get_bone_weights(1) == shirt.get_bone_weights(1), "Compatible body and clothing share weight template")
	workbench.outfit = 0
	workbench.apply_source()
	_check(shirt.get_bone_weights(1) == weights and mesh.polygon == vertices, "Appearance switch preserves painted weights and geometry")
	_sample(player, 0.5)
	_check(is_equal_approx(skeleton.get_node("Pelvis/Spine").rotation, 0.06), "The same saved keys animate both clothing colours")
	workbench.source_direction = 2
	workbench.apply_source()
	_sample(player, 1.0)
	var west_bone: Bone2D = workbench._active_rig.get_node("Skeleton2D/Pelvis/Spine/Chest/Head")
	var west: Vector2 = west_bone.global_position
	workbench.reset_motion()
	var west_rest: Vector2 = west_bone.global_position
	workbench.source_direction = 4
	workbench.apply_source()
	var east_bone: Bone2D = workbench._active_rig.get_node("Skeleton2D/Pelvis/Spine/Chest/Head")
	var east_rest: Vector2 = east_bone.global_position
	_sample(player, 1.0)
	var east: Vector2 = east_bone.global_position
	_check(is_equal_approx(west.x - west_rest.x, -(east.x - east_rest.x)), "One reflection reverses skeletal trajectory X")
	_check(is_equal_approx(west.y - west_rest.y, east.y - east_rest.y), "One reflection preserves skeletal trajectory Y")
	workbench.source_pose = 1
	workbench.apply_source()
	_check(not workbench._active_rig.get_node("Layers").visible and "No authored skeletal template" in "\n".join(workbench._diagnostics), "Unauthored source poses are rejected explicitly")
	workbench.source_pose = 0
	workbench.source_direction = 0
	workbench.apply_source()
	_check(not player.is_playing() and is_zero_approx(skeleton.get_node("Pelvis/Spine").rotation), "Source changes stop and reset the rig")
	var edited: PackedFloat32Array = weights.duplicate()
	edited[0] = 0.125
	shirt.set_bone_weights(1, edited)
	workbench.outfit = 1
	workbench.apply_source()
	_check(shirt.get_bone_weights(1)[0] == 0.125, "Source refresh preserves manual weight painting")
	shirt.set_bone_weights(1, weights)
	var old_uv: PackedVector2Array = shirt.uv.duplicate()
	var edited_uv: PackedVector2Array = old_uv.duplicate()
	edited_uv[0] += Vector2(0.25, 0.5)
	shirt.uv = edited_uv
	workbench.outfit = 0
	workbench.apply_source()
	workbench.outfit = 1
	workbench.apply_source()
	_check(shirt.uv[0].is_equal_approx(edited_uv[0]), "Native UV edits survive atlas-frame changes")
	shirt.uv = old_uv
	var source_state: Dictionary = Adapter.capture(source).layers.shirts
	rig._bind_mesh(shirt, source_state, Transform2D(0, Vector2(3, 0)))
	_check(not shirt.get_parent().visible and "Incompatible rig registration" in "\n".join(rig.diagnostics), "Changed layer anchors are rejected with a visible diagnostic")
	workbench.apply_source()
	_roundtrip(workbench)
	var reset: Animation = player.get_animation("RESET")
	var reset_track: int = reset.find_track(NodePath("Skeleton2D/Pelvis/Spine:rotation"), Animation.TYPE_VALUE)
	reset.track_set_key_value(reset_track, 0, 0.035)
	workbench.reset_motion()
	_check(is_equal_approx(skeleton.get_node("Pelvis/Spine").rotation, 0.035), "Stop evaluates the animator's authored RESET keys")
	workbench.outfit = 0
	workbench.apply_source()
	_check(is_equal_approx(skeleton.get_node("Pelvis/Spine").rotation, 0.035), "Outfit switching preserves authored RESET pose")
	reset.track_set_key_value(reset_track, 0, 0.0)
	fixture.free()
	print("Skeletal acceptance: %s failure(s), renderer=%s" % [_failures, DisplayServer.get_name()])
	quit(1 if _failures else 0)

func _compare_images(fixture: Node, label: String) -> void:
	var expected: PackedByteArray = fixture.get_node("SourceViewport").get_texture().get_image().get_data()
	var actual: PackedByteArray = fixture.get_node("RigViewport").get_texture().get_image().get_data()
	var changed: int = 0
	var maximum: int = 0
	for index: int in expected.size():
		var difference: int = absi(int(expected[index]) - int(actual[index]))
		maximum = maxi(maximum, difference)
		changed += int(difference > 0)
	print("RGBA comparison %s: %s differing channels, max delta %s/255" % [label, changed, maximum])
	_check(maximum <= 2, "Neutral pixels match source within 2/255 rasterization tolerance: %s" % label)

func _roundtrip(workbench: Node2D) -> void:
	var library: AnimationLibrary = AnimationLibrary.new()
	var clip: Animation = Animation.new()
	var track: int = clip.add_track(Animation.TYPE_VALUE)
	clip.track_set_path(track, "Skeleton2D/Pelvis/Spine:rotation")
	clip.track_insert_key(track, 0.0, 0.03)
	clip.track_insert_key(track, 0.5, 0.09)
	library.add_animation("probe", clip)
	workbench.get_node("AnimationPlayer").add_animation_library("roundtrip", library)
	var shirt: Polygon2D = workbench.get_node("Preview/Mirror/South/Layers/ShirtsBase/Surface")
	var weights: PackedFloat32Array = shirt.get_bone_weights(1).duplicate()
	weights[0] = 0.125
	shirt.set_bone_weights(1, weights)
	var uv: PackedVector2Array = shirt.uv.duplicate()
	uv[0] += Vector2(0.25, 0.5)
	shirt.uv = uv
	var packed: PackedScene = PackedScene.new()
	_check(packed.pack(workbench) == OK, "Edited skeletal scene can be packed")
	var path: String = "res://modules/character-animation-workbench/tests/roundtrip-skeletal-%s.tscn" % DisplayServer.get_name()
	_check(ResourceSaver.save(packed, path) == OK, "Edited skeletal scene can be saved")
	var saved: PackedScene = ResourceLoader.load(path, "", ResourceLoader.CACHE_MODE_IGNORE)
	var reopened: Node = saved.instantiate()
	root.add_child(reopened)
	_check(reopened.get_node("AnimationPlayer").get_animation("roundtrip/probe").track_get_key_count(0) == 2, "New bone keys survive scene reopening")
	_check(reopened.get_node("Preview/Mirror/South/Layers/ShirtsBase/Surface").get_bone_weights(1)[0] == 0.125, "Manual painted weight survives scene reopening")
	_check(reopened.get_node("Preview/Mirror/South/Layers/ShirtsBase/Surface").uv[0].is_equal_approx(uv[0]), "Native UV edit survives scene reopening")
	reopened.free()
