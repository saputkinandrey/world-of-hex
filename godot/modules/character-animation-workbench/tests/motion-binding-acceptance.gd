extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const FIXTURE = preload("res://modules/character-animation-workbench/tests/motion-binding-fixture.tscn")
const SET = preload("res://modules/character-animation-workbench/animations/bone-set-south.tres")

func _run() -> void:
	var scene: Node = FIXTURE.instantiate()
	root.add_child(scene)
	await process_frame
	var source: Skeleton2D = scene.get_node("Skeleton2D")
	var target: Skeleton2D = scene.get_node("Other/AlternateSkeleton")
	var original: AnimationLibrary = SET.bind_to(source,scene)
	var bound: AnimationLibrary = SET.bind_to(target,scene)
	_check(original == SET.library,"Original rig plays the saved resource directly")
	_check(bound != null and bound != original,"Same resource binds to another skeleton and hierarchy")
	_check(str(SET.validate(scene.get_node("Incomplete"))).contains("FootR"),"Missing foot fails with the missing bone name")
	var source_player: AnimationPlayer = scene.get_node("SourcePlayer")
	var target_player: AnimationPlayer = scene.get_node("TargetPlayer")
	source_player.add_animation_library("",original)
	target_player.add_animation_library("",bound)
	for clip: StringName in original.get_animation_list():
		for frame: int in 17:
			var time: float = original.get_animation(clip).length*frame/16.0
			_sample(source_player,clip,time)
			_sample(target_player,clip,time)
			for index: int in source.get_bone_count():
				var first: Bone2D = source.get_bone(index)
				var second: Bone2D = target.get_bone(index)
				_check(second.position.distance_to(first.position*1.4) < .0001,"Position retargets to target proportions: "+str(first.name))
				_check(absf(second.rotation-first.rotation) < .0001,"Rotation reuses native keys: "+str(first.name))
	var editable: Animation = original.get_animation("run_loop").duplicate(true)
	var track: int = editable.find_track(NodePath("Skeleton2D/Pelvis/Spine:rotation"),Animation.TYPE_VALUE)
	_check(track >= 0,"Upper body remains an editable native rotation track")
	editable.track_set_key_value(track,0,.123)
	var path: String = "res://../tmp/animation-workbench/edited-native-animation.tres"
	_check(ResourceSaver.save(editable,path) == OK,"Edited animation saves as native Resource")
	var reloaded: Animation = ResourceLoader.load(path,"Animation",ResourceLoader.CACHE_MODE_IGNORE)
	_check(is_equal_approx(float(reloaded.track_get_key_value(track,0)),.123),"Human key edit survives save and reload")
	var edited_set: Resource = SET.duplicate()
	edited_set.library = original.duplicate()
	edited_set.library.remove_animation("run_loop")
	edited_set.library.add_animation("run_loop",reloaded)
	var edited_library: AnimationLibrary = edited_set.bind_to(target,scene)
	target_player.remove_animation_library("")
	target_player.add_animation_library("",edited_library)
	_sample(target_player,"run_loop",0)
	_check(is_equal_approx(target.get_node("Pelvis/Spine").rotation,.123),"Saved human edit plays on a different compatible skeleton")
	_check(not is_equal_approx(float(original.get_animation("run_loop").track_get_key_value(track,0)),.123),"Binding edited resources leaves the original library unchanged")
	_check(is_equal_approx(float(bound.get_animation("run_loop").get_meta("stride")),float(original.get_animation("run_loop").get_meta("stride"))*1.4),"Travel metadata follows target proportions")
	var design: Resource = load("res://modules/character-animation-workbench/animations/design/locomotion.tres")
	for view: String in ["south","north","south-west","north-west"]:
		var animation: Animation = design.poses.get_animation(view+"--run_loop")
		for bone: String in ["Spine","Chest","Head","ForearmL","ForearmR"]:
			var upper_track: int = animation.find_track(NodePath(bone+":rotation"),Animation.TYPE_VALUE)
			_check(upper_track >= 0,"Authored upper-body curve exists: "+view+" "+bone)
			var low: float = INF
			var high: float = -INF
			for key: int in animation.track_get_key_count(upper_track):
				var value: float = animation.track_get_key_value(upper_track,key)
				low = minf(low,value)
				high = maxf(high,value)
			_check(high-low > .005,"Expressive upper-body motion survives: "+view+" "+bone)
	print("Native animation reuse, renamed hierarchy, proportions and saved human edits: %s failure(s)." % _failures)
	scene.free()
	quit(1 if _failures else 0)
