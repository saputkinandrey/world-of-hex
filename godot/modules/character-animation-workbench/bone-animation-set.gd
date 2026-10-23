@tool
extends Resource

@export var library: AnimationLibrary
@export var reference_rest: Dictionary[StringName, Transform2D] = {}

func validate(skeleton: Skeleton2D) -> PackedStringArray:
	var errors: PackedStringArray = []
	var bones: Dictionary = _bones(skeleton)
	if library == null:
		errors.append("Animation set has no AnimationLibrary")
	if reference_rest.is_empty():
		errors.append("Animation set has no reference bones")
	for name: StringName in reference_rest:
		if not bones.has(name):
			errors.append("Missing required Bone2D: "+str(name))
		elif bones[name].size() != 1:
			errors.append("Ambiguous Bone2D name: "+str(name))
	return errors

func bind_to(skeleton: Skeleton2D, animation_root: Node) -> AnimationLibrary:
	var errors: PackedStringArray = validate(skeleton)
	if not errors.is_empty():
		push_error("Cannot bind animation set: "+"; ".join(errors))
		return null
	var bones: Dictionary = _bones(skeleton)
	var target_paths: Dictionary = {}
	var identical: bool = true
	var reference_size: float = 0.0
	var target_size: float = 0.0
	for name: StringName in reference_rest:
		var bone: Bone2D = bones[name][0]
		target_paths[name] = animation_root.get_path_to(bone)
		identical = identical and bone.rest.is_equal_approx(reference_rest[name])
		if bone.get_parent() is Bone2D:
			reference_size += reference_rest[name].origin.length()
			target_size += bone.rest.origin.length()
	for clip: StringName in library.get_animation_list():
		var animation: Animation = library.get_animation(clip)
		for track: int in animation.get_track_count():
			var source_path: NodePath = animation.track_get_path(track)
			var name: StringName = source_path.get_name(source_path.get_name_count()-1)
			if not target_paths.has(name):
				push_error("Animation track has no matching bone: "+str(source_path))
				return null
			identical = identical and str(source_path.get_concatenated_names()) == str(target_paths[name])
	if identical:
		return library
	if reference_size < .0001 or target_size < .0001:
		push_error("Cannot bind animation set to zero-length reference or target skeleton")
		return null
	var scale_ratio: float = target_size/reference_size
	var bound: AnimationLibrary = AnimationLibrary.new()
	for clip: StringName in library.get_animation_list():
		var animation: Animation = library.get_animation(clip).duplicate(true)
		for track: int in animation.get_track_count():
			var path: NodePath = animation.track_get_path(track)
			var name: StringName = path.get_name(path.get_name_count()-1)
			var property: String = str(path.get_concatenated_subnames())
			var bone: Bone2D = bones[name][0]
			var source: Transform2D = reference_rest[name]
			var target: Transform2D = bone.rest
			animation.track_set_path(track,NodePath(str(target_paths[name])+":"+property))
			for key: int in animation.track_get_key_count(track):
				var value: Variant = animation.track_get_key_value(track,key)
				if property == "rotation":
					value = target.get_rotation()+float(value)-source.get_rotation()
				elif property == "position":
					var ratio: float = scale_ratio
					var offset_angle: float = 0.0
					if bone.get_parent() is Bone2D and source.origin.length() > .0001:
						ratio = target.origin.length()/source.origin.length()
						offset_angle = target.origin.angle()-source.origin.angle()
					value = target.origin+(Vector2(value)-source.origin).rotated(offset_angle)*ratio
				else:
					push_error("Unsupported skeletal animation property: "+property)
					return null
				animation.track_set_key_value(track,key,value)
		if animation.has_meta("leg_depths"):
			var depths: Dictionary = animation.get_meta("leg_depths")
			for name: String in depths:
				var values: PackedFloat32Array = depths[name]
				for index: int in values.size():
					values[index] *= scale_ratio
				depths[name] = values
			animation.set_meta("leg_depths",depths)
		if animation.has_meta("stride"):
			animation.set_meta("stride",float(animation.get_meta("stride"))*scale_ratio)
		var error: Error = bound.add_animation(clip,animation)
		assert(error == OK,"Cannot add bound clip: "+error_string(error))
	return bound

func _bones(skeleton: Skeleton2D) -> Dictionary:
	var result: Dictionary = {}
	for index: int in skeleton.get_bone_count():
		var bone: Bone2D = skeleton.get_bone(index)
		if not result.has(bone.name):
			result[bone.name] = []
		result[bone.name].append(bone)
	return result
