extends RefCounted

const ROOT := "res://modules/character-rigging-editor/"
const Session = preload("res://modules/character-rigging-editor/session.gd")
const Motion = preload("res://modules/character-rigging-editor/motion.gd")

static func capture(viewport: SubViewport, path: String, tree: SceneTree) -> void:
	await tree.process_frame
	await RenderingServer.frame_post_draw
	assert(viewport.get_texture().get_image().save_png(path)==OK,"PNG export failed: "+path)

static func endpoints(editor: Control, view: String, name: String) -> Dictionary:
	editor.open_transition(name,view)
	var viewport: SubViewport=editor.get_node("Viewport")
	var reference: Sprite2D=viewport.get_node("Reference")
	reference.modulate=Color.WHITE
	var result: Dictionary={}
	for end in [0,1]:
		editor.scrub(float(end)*editor.session.transition.duration)
		await editor.get_tree().process_frame
		await RenderingServer.frame_post_draw
		var actual:=viewport.get_texture().get_image()
		var pose: Dictionary=editor.session.source if end==0 else editor.session.target
		reference.texture=editor.rig.texture_file(pose.texture)
		reference.texture_filter=CanvasItem.TEXTURE_FILTER_NEAREST
		reference.position=Vector2(75,90)-Vector2(pose.joints[0][0],pose.joints[0][1])+Vector2(pose.root_offset[0],pose.root_offset[1])
		editor.rig.visible=false
		viewport.get_node("Target").visible=false
		reference.visible=true
		await editor.get_tree().process_frame
		await RenderingServer.frame_post_draw
		var expected:=viewport.get_texture().get_image()
		var differences:=0
		var alpha_differences:=0
		for y in range(150):
			for x in range(150):
				var a:=actual.get_pixel(x,y)
				var b:=expected.get_pixel(x,y)
				if a!=b: differences+=1
				if a.a!=b.a: alpha_differences+=1
		result[str(end)]={"gpu_reference_rgba_different_pixels":differences,"alpha_different_pixels":alpha_differences}
		assert(differences==0,"Endpoint differs from registered source: "+view+"/"+name+"/"+str(end))
		reference.visible=false
		editor.rig.visible=true
		viewport.get_node("Target").visible=true
	return result

static func export_transition(editor: Control, view: String, name: String, prefix: String) -> Dictionary:
	editor.open_transition(name,view)
	var folder:=ROOT+prefix+"/"+view+"/"+name
	DirAccess.make_dir_recursive_absolute(folder)
	var frame_count:=int(roundf(float(editor.session.transition.duration)*30))+1
	var logs: Array=[]
	for index in range(frame_count):
		editor.scrub(minf(index/30.0,float(editor.session.transition.duration)))
		await capture(editor.get_node("Viewport"),folder+"/frame-%04d.png"%index,editor.get_tree())
		logs.append(editor.session.frame.duplicate(true))
	var file:=FileAccess.open(folder+"/frames.json",FileAccess.WRITE)
	file.store_string(JSON.stringify({"version":"1.0.0","fps":30,"size":[150,150],"gpu":RenderingServer.get_video_adapter_name(),"frames":logs}))
	return {"frame_count":frame_count,"folder":folder}

static func run(editor: Control, action: String) -> void:
	var checks: Dictionary={}
	var views: Array=["south-west"] if action=="stage-d" else ["south-west","north-west"]
	var endpoint_results: Dictionary={}
	for view in views:
		for pose in ["idle","walk","aim-pistol"]:
			var data: Dictionary=editor.session.pose(pose,view)
			assert(data.joints.size()==12 and data.vertices.size()==12)
			assert(data.bone_names[4]=="ArmL" and data.group_bones["10"]==4)
			assert(data.group_bones["3"]==5 and data.group_bones["4"]==9)
			var copy: Dictionary=JSON.parse_string(JSON.stringify(data))
			assert(copy.joints==data.joints)
			checks["loading/"+view+"/"+pose]=true
		var names:=DirAccess.get_files_at(ROOT+"transitions/"+view)
		assert(names.size()==6,"Expected exactly six directed transitions")
		for filename in names:
			if not filename.ends_with(".json"): continue
			var name:=filename.get_basename()
			endpoint_results[view+"/"+name]=await endpoints(editor,view,name)
			if action in ["export","stage-d"]:
				checks["export/"+view+"/"+name]=await export_transition(editor,view,name,"exports" if action=="export" else "proof-d")
	var test_session:=Session.new()
	test_session.open_transition("idle_to_aim_pistol","south-west")
	var target_before:=JSON.stringify(test_session.target)
	test_session.source.joints[4][0]+=1
	assert(JSON.stringify(test_session.target)==target_before)
	checks["independent_rest"]=true
	test_session=Session.new()
	test_session.open_transition("idle_to_aim_pistol","south-west")
	test_session.transition.interpolation="Linear"
	var first:=Motion.rest_frame(test_session.source)
	var last:=Motion.rest_frame(test_session.target)
	var middle:=test_session.evaluate(test_session.transition.duration*.5)
	assert(absf(middle.joints[4][0]-(first.joints[4][0]+last.joints[4][0])/2)<.00001)
	assert(absf(angle_difference(deg_to_rad(179),lerp_angle(deg_to_rad(179),deg_to_rad(-179),.5)))<.03)
	checks["global_interpolation_shortest_angles"]=true
	test_session.evaluate(.37*test_session.transition.duration)
	test_session.frame.joints[4][0]+=7
	var edited_x: float=test_session.frame.joints[4][0]
	assert(test_session.add_key(.37*test_session.transition.duration))
	assert(absf(test_session.evaluate(.37*test_session.transition.duration).joints[4][0]-edited_x)<.00001)
	checks["intermediate_keys"]=true
	var reverse: Dictionary=test_session.resource("transitions/south-west/aim_pistol_to_idle.json")
	var reverse_before:=JSON.stringify(reverse)
	test_session.transition.whole.switch_time=.2
	assert(JSON.stringify(reverse)==reverse_before)
	checks["independent_reverse"]=true
	var schedule: Dictionary={"switch_time":.4,"blend_enabled":false,"blend_duration":0.0}
	assert(Motion.texture_alpha(.39,schedule)==0 and Motion.texture_alpha(.4,schedule)==1)
	schedule.blend_enabled=true
	schedule.blend_duration=.2
	assert(absf(Motion.texture_alpha(.4,schedule)-.5)<.00001)
	assert(Motion.texture_alpha(0,schedule)==0 and Motion.texture_alpha(1,schedule)==1)
	test_session.transition.switch_mode="Per part"
	test_session.transition.parts[0].switch_time=.2
	test_session.transition.parts[1].switch_time=.8
	var per_part:=test_session.evaluate(.5*test_session.transition.duration)
	assert(per_part.alpha[0]==1 and per_part.alpha[1]==0)
	checks["whole_part_blend_switches"]=true
	DirAccess.make_dir_recursive_absolute(ROOT+"cache")
	test_session.changed.clear()
	for path in ["cache/keypose-roundtrip.json","cache/transition-roundtrip.json"]:
		test_session.resources[path]=test_session.source if path.contains("keypose") else test_session.transition
		test_session.changed[path]=true
	test_session.save_all()
	var reloaded:=Session.new()
	assert(reloaded.resource("cache/keypose-roundtrip.json").joints==test_session.source.joints)
	var loaded_keys: Array=reloaded.resource("cache/transition-roundtrip.json").keys
	assert(loaded_keys.size()==test_session.transition.keys.size())
	for i in range(loaded_keys.size()):
		var expected: Dictionary=test_session.transition.keys[i]
		assert(absf(loaded_keys[i].time-expected.time)<1e-12)
		for bone in range(12):
			assert(absf(loaded_keys[i].angles[bone]-expected.angles[bone])<1e-12)
			for axis in range(2):
				assert(absf(loaded_keys[i].joints[bone][axis]-expected.joints[bone][axis])<1e-10)
	checks["pose_transition_disk_roundtrip"]=true
	editor.get_node("Sequence").setup(editor.session.resources)
	var sequence=editor.get_node("Sequence")
	for i in range(6):
		assert(sequence.locate(i+.5).index==i)
	assert(sequence.locate(6).fraction==1)
	checks["sequence_all_six_intervals"]=true
	# Exercise the actual editor clock, loop and mode preservation, not just evaluator math.
	editor.open_transition("idle_to_walk","south-west")
	editor.toggle_play()
	await editor.get_tree().create_timer(.25).timeout
	assert(editor.playhead>.05 and editor.playhead<.8,"AnimationPlayer must advance continuous time")
	editor.pause()
	var duration_before: float=editor.session.transition.duration
	editor.session.transition.duration=.1
	editor.get_node("Timeline").max_value=.1
	editor.build_clock()
	editor.scrub(0)
	editor.get_node("Loop").button_pressed=true
	editor.toggle_play()
	await editor.get_tree().create_timer(.36).timeout
	assert(editor.get_node("AnimationPlayer").is_playing(),"Loop must resume after AnimationPlayer finishes")
	editor.pause()
	editor.get_node("Loop").button_pressed=false
	editor.session.transition.duration=duration_before
	editor.get_node("Timeline").max_value=duration_before
	editor.build_clock()
	editor.scrub(.4*duration_before)
	editor.move_joint(4,Vector2(editor.session.frame.joints[4][0]+2,editor.session.frame.joints[4][1]))
	assert(editor.session.transition.keys.size()==1)
	var keys_before:=JSON.stringify(editor.session.transition.keys)
	editor.mode_changed(0)
	editor.mode_changed(2)
	assert(JSON.stringify(editor.session.transition.keys)==keys_before,"Modes must preserve unsaved keys")
	# Test edits are intentionally kept in memory and excluded from disk writes.
	editor.session.transition.keys=[]
	editor.session.changed.clear()
	checks["editor_clock_loop_mode_preservation"]=true
	if action in ["export","stage-d"]:
		var folder:=ROOT+("exports/comparison" if action=="export" else "proof-d/sequence")
		DirAccess.make_dir_recursive_absolute(folder)
		var logs: Array=[]
		for index in range(181):
			var frames: Array=sequence.present(index/30.0)
			await capture(editor.get_node("Comparison"),folder+"/frame-%04d.png"%index,editor.get_tree())
			logs.append(frames)
		var file:=FileAccess.open(folder+"/frames.json",FileAccess.WRITE)
		file.store_string(JSON.stringify({"version":"1.0.0","fps":30,"size":[300,150],"frames":logs}))
		checks["gpu_sequence_export"]=181
	var file:=FileAccess.open(ROOT+action+"-validation.json",FileAccess.WRITE)
	file.store_string(JSON.stringify({"version":"1.0.0","engine":Engine.get_version_info().string,"gpu":RenderingServer.get_video_adapter_name(),"checks":checks,"endpoints":endpoint_results},"  "))
	print("VALIDATION PASSED: ",action,"; endpoints ",endpoint_results.size(),"; checks ",checks.size())
	editor.get_tree().quit()

static func diagnostics(editor: Control) -> void:
	for view in ["south-west","north-west"]:
		for filename in DirAccess.get_files_at(ROOT+"transitions/"+view):
			if not filename.ends_with(".json"): continue
			var name:=filename.get_basename()
			editor.open_transition(name,view)
			var folder: String=ROOT+"diagnostics/"+view+"/"+name
			DirAccess.make_dir_recursive_absolute(folder)
			editor.scrub(editor.session.transition.duration*.5)
			var held: Dictionary=editor.session.frame.duplicate(true)
			for side in [0,1]:
				held.alpha=[]
				for bone in range(12): held.alpha.append(float(side))
				Motion.render_pair(editor.rig,editor.get_node("Viewport/Target"),held)
				await capture(editor.get_node("Viewport"),folder+("/held-source.png" if side==0 else "/held-target.png"),editor.get_tree())
			var file:=FileAccess.open(folder+"/frame.json",FileAccess.WRITE)
			file.store_string(JSON.stringify(held,"  "))
	print("Held-skeleton texture source diagnostics exported: 12 transitions")
	editor.get_tree().quit()
