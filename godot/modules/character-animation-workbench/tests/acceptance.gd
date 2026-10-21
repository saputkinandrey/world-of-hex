extends SceneTree

const Adapter = preload("res://modules/character-animation-workbench/source-adapter.gd")
const TEST_SCENE = preload("res://modules/character-animation-workbench/tests/acceptance.tscn")
const LIBRARY_PATH = "res://modules/character-animation-workbench/animations/demo-library.tres"
const WEAPON_PATH = "Preview/Mirror/WeaponBase/PivotOrigin/MotionPivot"
var _failures: int = 0

func _initialize() -> void:
	call_deferred("_run")

func _check(condition: bool, message: String) -> void:
	if not condition:
		_failures += 1
		push_error("FAIL: %s" % message)

func _sample(player: AnimationPlayer, clip: String, time: float) -> void:
	player.play(clip)
	player.seek(time, true)
	player.pause()

func _run() -> void:
	var fixture: Node = TEST_SCENE.instantiate()
	root.add_child(fixture)
	var source_scene: Node = fixture.get_node("SourceViewport/Source")
	var source: CharacterSpriteEntity = Adapter.source_entity(source_scene)
	source.reparent(fixture.get_node("SourceViewport/Origin"), false)
	source.position = Vector2.ZERO
	source.show_formation_reference = false
	source_scene.visible = false
	var rig: Node2D = fixture.get_node("RigViewport/Workbench")
	rig.preview_zoom = 1.0
	rig.get_node("Preview").position = Vector2(256, 320)
	rig.get_node("UI").visible = false
	var player: AnimationPlayer = rig.get_node("AnimationPlayer")
	var weapon: Node2D = rig.get_node(WEAPON_PATH)
	var body: Node2D = rig.get_node("Preview/Mirror/BodyMotion")
	_check(player.has_animation("idle_breathe") and player.has_animation("weapon_swing"), "Both saved clips exist")
	var library: AnimationLibrary = ResourceLoader.load(LIBRARY_PATH, "", ResourceLoader.CACHE_MODE_IGNORE)
	_check(library.get_animation("weapon_swing").get_track_count() == 4, "Clips survive independent disk reload")
	var clip: Animation = player.get_animation("weapon_swing")
	var original_track_count: int = clip.get_track_count()
	_sample(player, "weapon_swing", 0.2)
	_check(is_equal_approx(weapon.rotation, -0.45), "Exact rotation key")
	_sample(player, "weapon_swing", 0.325)
	_check(is_equal_approx(weapon.rotation, 0.2), "Rotation interpolates between keys")
	_check(weapon.position.is_equal_approx(Vector2(3.5, -1)), "Position interpolates between keys")
	_check(not is_zero_approx(body.rotation), "Second independent group is animated")
	rig.reset_motion()
	_check(weapon.transform.is_equal_approx(Transform2D.IDENTITY), "RESET clears weapon motion")
	_check(body.transform.is_equal_approx(Transform2D.IDENTITY), "RESET clears body motion")
	var tree_slots: Array[String] = []
	for base: Node in get_nodes_in_group("animation_workbench_base"):
		if rig.is_ancestor_of(base):
			tree_slots.append(base.get_meta("slot"))
	_check(tree_slots == CharacterSpriteEntity.LAYER_NODE_PATH.keys(), "Equal-z traversal order matches source")
	var pivot_base: Node2D = rig.get_node("Preview/Mirror/WeaponBase")
	var before: Transform2D = pivot_base.get_node("PivotOrigin/MotionPivot/CounterPivot/Visual").global_transform
	pivot_base.pivot_offset = Vector2(-12, 18)
	_check(before.is_equal_approx(pivot_base.get_node("PivotOrigin/MotionPivot/CounterPivot/Visual").global_transform), "Pivot editing preserves resting registration")
	pivot_base.pivot_offset = Vector2.ZERO
	var full: Dictionary = load("res://modules/character-animation-workbench/source-settings.tres").get_meta("outfits")["Full layers"]
	var saved_properties: Dictionary = {}
	for property: String in full:
		saved_properties[property] = source.get(property)
		source.set(property, full[property])
	rig.outfit = 3
	rig.apply_source()
	_compare_neutral(source, rig)
	if DisplayServer.get_name() != "headless":
		await process_frame
		RenderingServer.force_draw(false)
		_check(fixture.get_node("SourceViewport").get_texture().get_image().get_data() == fixture.get_node("RigViewport").get_texture().get_image().get_data(), "Pixel-identical complete outfit")
	for property: String in saved_properties:
		source.set(property, saved_properties[property])
	# Full frontal source, incomplete diagonal source, and its reflected counterpart.
	for direction: int in [0, 2, 4]:
		source.direction = direction
		rig.outfit = 0
		rig.source_direction = direction
		rig.apply_source()
		_compare_neutral(source, rig)
		if DisplayServer.get_name() != "headless":
			await process_frame
			RenderingServer.force_draw(false)
			var expected: Image = fixture.get_node("SourceViewport").get_texture().get_image()
			var actual: Image = fixture.get_node("RigViewport").get_texture().get_image()
			_check(expected.get_data() == actual.get_data(), "Pixel-identical neutral composition direction %s" % direction)
			actual.save_png("res://modules/character-animation-workbench/tests/neutral-%s.png" % direction)
	# Reflection reverses the trajectory and angular handedness, once, around the base.
	rig.source_direction = 2
	rig.apply_source()
	_sample(player, "weapon_swing", 0.45)
	var west_transform: Transform2D = weapon.global_transform
	var west_base: Vector2 = pivot_base.global_position
	rig.source_direction = 4
	rig.apply_source()
	_sample(player, "weapon_swing", 0.45)
	var east_transform: Transform2D = weapon.global_transform
	var east_base: Vector2 = pivot_base.global_position
	_check(is_equal_approx(west_transform.origin.x - west_base.x, -(east_transform.origin.x - east_base.x)), "Mirror reverses motion X")
	_check(is_equal_approx(west_transform.origin.y - west_base.y, east_transform.origin.y - east_base.y), "Mirror preserves motion Y")
	_check(west_transform.determinant() * east_transform.determinant() < 0, "Mirror reverses rotation handedness")
	rig.source_direction = 0
	rig.outfit = 1
	rig.apply_source()
	_sample(player, "weapon_swing", 0.325)
	_check(is_equal_approx(weapon.rotation, 0.2), "Appearance changes preserve trajectory")
	_check(clip.get_track_count() == original_track_count, "Source reload preserves motion tracks")
	var base_position: Vector2 = pivot_base.position
	_sample(player, "weapon_swing", 0.45)
	_check(pivot_base.position == base_position, "Motion never writes base registration")
	rig.source_direction = 2
	rig.apply_source()
	_check(not rig._diagnostics.is_empty(), "Incomplete compositions have explicit diagnostics")
	_check(not player.is_playing() and weapon.transform.is_equal_approx(Transform2D.IDENTITY), "Source switch stops and resets deterministically")
	rig.source_pose = CharacterSpriteEntity.Pose.LONGARM
	rig.outfit = 2
	rig.apply_source()
	_check(not pivot_base.visible and pivot_base.get_node("PivotOrigin/MotionPivot/CounterPivot/Visual").texture == null, "Unsupported cutlass/longarm has no replacement weapon")
	_check("Unsupported weapon" in "\n".join(rig._diagnostics), "Unsupported combination reports why weapon is absent")
	rig.source_pose = CharacterSpriteEntity.Pose.IDLE
	rig.apply_source()
	_sample(player, "idle_breathe", 0.5)
	_check(is_equal_approx(body.position.y, -1.25), "Breathing interpolates natively")
	rig.reset_motion()
	pivot_base.pivot_offset = Vector2(-12, 18)
	var packed: PackedScene = PackedScene.new()
	_check(packed.pack(rig) == OK, "Scene with edited pivot can be packed")
	var roundtrip_path: String = "res://modules/character-animation-workbench/tests/roundtrip.tscn"
	_check(ResourceSaver.save(packed, roundtrip_path) == OK, "Scene can be saved")
	var reopened_scene: PackedScene = ResourceLoader.load(roundtrip_path, "", ResourceLoader.CACHE_MODE_IGNORE)
	var reopened: Node = reopened_scene.instantiate()
	root.add_child(reopened)
	_check(reopened.get_node("Preview/Mirror/WeaponBase").pivot_offset == Vector2(-12, 18), "Pivot survives save/reopen")
	_check(reopened.get_node("AnimationPlayer").get_animation("weapon_swing").get_track_count() == original_track_count, "Keys survive scene save/reopen")
	reopened.free()
	if DisplayServer.get_name() != "headless":
		rig.reparent(root)
		rig.preview_zoom = 3.0
		rig.get_node("Preview").position = Vector2(900, 620)
		rig.get_node("UI").visible = true
		rig.show_stage = true
		rig.outfit = 2
		rig.source_direction = 0
		rig.apply_source()
		root.size = Vector2i(1920, 1080)
		await process_frame
		RenderingServer.force_draw(false)
		root.get_texture().get_image().save_png("res://modules/character-animation-workbench/tests/workbench-preview.png")
		rig.free()
	fixture.free()
	print("Animation workbench acceptance: %s failure(s), renderer=%s" % [_failures, DisplayServer.get_name()])
	quit(1 if _failures else 0)

func _compare_neutral(source: CharacterSpriteEntity, rig: Node2D) -> void:
	for base: Node in get_nodes_in_group("animation_workbench_base"):
		if not rig.is_ancestor_of(base):
			continue
		var slot: String = base.get_meta("slot")
		var original: Sprite2D = source.get_node(source.LAYER_NODE_PATH[slot])
		var visual: Sprite2D = base.get_node("PivotOrigin/MotionPivot/CounterPivot/Visual")
		_check(base.visible == original.visible, "%s visibility" % slot)
		if not original.visible:
			_check(visual.texture == null, "%s absent layer has no stale texture" % slot)
			continue
		var relative: Transform2D = rig.get_node("Preview").global_transform.affine_inverse() * visual.global_transform
		_check(relative.origin.is_equal_approx(original.position), "%s base position" % slot)
		_check(relative.get_scale().abs().is_equal_approx(original.scale.abs()), "%s base scale" % slot)
		_check((visual.flip_h != (relative.determinant() < 0)) == original.flip_h, "%s effective image flip" % slot)
		_check(visual.texture == original.texture and visual.frame == original.frame, "%s texture/frame" % slot)
		_check(visual.z_index == original.z_index, "%s z order" % slot)
