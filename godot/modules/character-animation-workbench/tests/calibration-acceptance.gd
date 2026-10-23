extends "res://modules/character-animation-workbench/tests/hand-rigidity-acceptance.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")
const Composition = preload("res://modules/character-animation-workbench/region-compositor.gd")
const VIEW_KEYS: Array[String] = ["south", "north", "south-west", "north-west"]
const LEG_CLIPS: Array[String] = ["walk_loop", "run_loop", "idle_to_walk", "walk_to_idle", "walk_to_run", "run_to_walk", "idle_to_run", "run_to_idle"]

func _joint(skeleton: Skeleton2D, node: Node2D) -> Vector2:
	return skeleton.to_local(node.global_position)

func _world_joint(skeleton: Skeleton2D, node: Bone2D, animation: Animation, time: float, forward: Vector2) -> Vector3:
	var depths: PackedFloat32Array = animation.get_meta("leg_depths")[str(node.name)]
	var key: float = clampf(time/animation.length,0,1)*(depths.size()-1)
	var depth: float = lerpf(depths[floori(key)],depths[mini(ceili(key),depths.size()-1)],fposmod(key,1))
	var point: Vector2 = _joint(skeleton,node)-forward*depth
	return Vector3(point.x,point.y,depth)

func _run() -> void:
	var calibration: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://modules/character-animation-workbench/rig-calibration.json")).views
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var max_length_error: float = 0.0
	var worst_length_sample: String = ""
	var max_contact_error: float = 0.0
	for view_index: int in VIEW_KEYS.size():
		var workbench: Node2D = scene.get_node("Viewport/"+scene.VIEWS[view_index])
		var rig: Node2D = workbench._active_rig
		var skeleton: Skeleton2D = rig.get_node("Skeleton2D")
		var surface: Polygon2D = rig.get_node("Layers/BodyBase/Surface")
		var player: AnimationPlayer = workbench.get_node("AnimationPlayer")
		var points: Dictionary = calibration[VIEW_KEYS[view_index]]
		var forward: Vector2 = Vector2(points.forward[0],points.forward[1])
		var size: Vector2 = Vector2(surface.get_meta("frame_size"))
		_sample(player,"RESET",0)
		_check(skeleton.get_bone_count() == 14, "Fourteen calibrated bones: "+VIEW_KEYS[view_index])
		for index: int in surface.get_bone_count():
			var bone: Bone2D = skeleton.get_node(surface.get_bone_path(index))
			var pixel: Array = points[bone.name]
			_check(_joint(skeleton,bone).distance_to(Vector2(pixel[0],pixel[1])-size*.5) < .001, "Rest joint agrees with source landmark: "+str(bone.name))
		var regions: PackedByteArray = surface.get_meta("cell_regions")
		var children: PackedByteArray = surface.get_meta("cell_ligament_child")
		var source: Image = surface.texture.get_image()
		for side: String in ["L","R"]:
			_sample(player,"RESET",0)
			var hip: Bone2D = skeleton.get_node("Pelvis/Thigh"+side)
			var knee: Bone2D = hip.get_node("Calf"+side)
			var ankle: Bone2D = knee.get_node("Foot"+side)
			var toe: Marker2D = ankle.get_node("Toe"+side)
			var upper: float = _joint(skeleton,hip).distance_to(_joint(skeleton,knee))
			var lower: float = _joint(skeleton,knee).distance_to(_joint(skeleton,ankle))
			var foot_index: int = Composition.BONES.find("Foot"+side)
			var flesh: int = 0
			var ligaments: int = 0
			for cell: int in regions.size():
				var pixel: Vector2i = Vector2i(cell%int(size.x),int(cell/size.x))
				if source.get_pixelv(pixel).a < .99:
					continue
				if int(regions[cell]/4) == foot_index and regions[cell]%4 == Composition.FLESH:
					var weights: PackedFloat32Array = _weights_at(surface,Vector2(pixel)+Vector2(.5,.5)-size*.5)
					_check(is_equal_approx(weights[foot_index],1.0), "Foot flesh is rigidly owned by its foot")
					flesh += 1
				if regions[cell]%4 == Composition.LIGAMENT and children[cell] == foot_index:
					ligaments += 1
			_check(flesh >= 3 and ligaments >= 1, "Foot has visible flesh and an ankle ligament: "+VIEW_KEYS[view_index]+side)
			for clip: String in LEG_CLIPS:
				var animation: Animation = player.get_animation(clip)
				var duration: float = animation.length
				for frame: int in 241:
					var time: float = duration*frame/240.0
					_sample(player,clip,time)
					var hip_world: Vector3 = _world_joint(skeleton,hip,animation,time,forward)
					var knee_world: Vector3 = _world_joint(skeleton,knee,animation,time,forward)
					var ankle_world: Vector3 = _world_joint(skeleton,ankle,animation,time,forward)
					var error: float = maxf(absf(hip_world.distance_to(knee_world)-upper),absf(knee_world.distance_to(ankle_world)-lower))
					if error > max_length_error:
						max_length_error = error
						worst_length_sample = "%s %s %s %.6f upper %.5f/%.5f lower %.5f/%.5f" % [VIEW_KEYS[view_index],side,clip,time,hip_world.distance_to(knee_world),upper,knee_world.distance_to(ankle_world),lower]
			for clip: String in ["walk_loop","run_loop"]:
				var run: bool = clip == "run_loop"
				var duration: float = player.get_animation(clip).length
				var stance: float = .38 if run else .6
				var stride: float = 3.8 if run else 2.5
				var planted: Vector2
				for frame: int in 30:
					var phase: float = stance*(.05+.9*frame/29.0)
					var time: float = fposmod(phase-(0 if side == "L" else .5),1.0)*duration
					_sample(player,clip,time)
					# Native preview is in-place. Undo its backward ground travel
					# to measure planted contact in the moving character's world.
					var contact: Vector2 = _joint(skeleton,toe)+forward*(2*stride*phase/stance)
					if frame == 0:
						planted = contact
					max_contact_error = maxf(max_contact_error,contact.distance_to(planted))
		_sample(player,"RESET",0)
	_check(max_length_error < .025, "Spatial leg segment lengths stay fixed between projected keys")
	print("Maximum spatial length sample: "+worst_length_sample)
	_check(max_contact_error < .025, "Planted toes stay fixed relative to forward travel")
	print("Calibration: %s failure(s); max segment error %.5f px; max planted contact drift %.5f px." % [_failures,max_length_error,max_contact_error])
	scene.free()
	quit(1 if _failures else 0)
