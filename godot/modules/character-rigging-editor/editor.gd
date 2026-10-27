extends Control

const ROOT := "res://modules/character-rigging-editor/"
const Motion = preload("res://modules/character-rigging-editor/motion.gd")
const Session = preload("res://modules/character-rigging-editor/session.gd")
var session := Session.new()
var playhead := 0.0
var playing := false
var animation_active := false
var sequence_active := false
var pose_data: Dictionary = {}
var active_pose := "idle"
var direction := "south-west"
var selected := 0
var refreshing := false
var dirty := false
var pending: Callable
@onready var rig = $Viewport/Source
@onready var canvas = $Canvas

func ui(name: String) -> Node:
	return get_node(name)

static func read_json(path: String) -> Dictionary:
	assert(FileAccess.file_exists(path), "Missing required resource: " + path)
	var value = JSON.parse_string(FileAccess.get_file_as_string(path))
	assert(value is Dictionary, "Invalid JSON: " + path)
	return value

func _ready() -> void:
	get_window().title = "World of Hex - Rigging & Keyframe Animation Editor v1.0.0"
	get_window().size = Vector2i(1440,940)
	get_window().mode = Window.MODE_WINDOWED
	get_tree().auto_accept_quit=false
	get_window().close_requested.connect(func(): request_switch(func(): get_tree().quit()))
	canvas.rig = rig
	canvas.render_view = $Viewport
	for mode in ["Rig Setup", "Pose Preview", "Transition Editing", "Sequence Preview", "SOMA Calibration"]:
		$Mode.add_item(mode)
	for name in ["Pelvis","Spine","Chest","Head","ArmL","ForearmL","ArmR","ForearmR","ThighL","CalfL","ThighR","CalfR"]:
		$Bone.add_item(name)
	$FPS.add_item("30 FPS",30)
	$FPS.add_item("60 FPS",60)
	$FPS.item_selected.connect(func(_i): Engine.max_fps=$FPS.get_selected_id())
	$Deformation.min_value=0
	$Deformation.max_value=1
	$Deformation.step=.05
	for option in ["Whole pose","Per part"]:
		$SwitchMode.add_item(option)
	for option in ["Linear","Ease In","Ease Out","Ease In-Out"]:
		$Interpolation.add_item(option)
	for skin in range(5):
		$Skin.add_item("Skin "+str(skin+1),skin)
	$Skin.item_selected.connect(func(_i): update_display())
	$Length.min_value=1
	$Length.max_value=200
	$Z.step=1
	$Mode.item_selected.connect(mode_changed)
	for option in ["Both","south-west","north-west"]:
		$SingleView.add_item(option)
	$SingleView.item_selected.connect(func(_i):
		$Sequence.single_view=$SingleView.get_item_text($SingleView.selected)
		if sequence_active:
			$Comparison.size=Vector2i(300,150) if $SingleView.selected==0 else Vector2i(150,150)
			show_frame(playhead))
	$SwitchMode.item_selected.connect(func(_i): schedule_changed())
	$SwitchTime.value_changed.connect(func(_v): schedule_changed())
	$Blend.toggled.connect(func(_v): schedule_changed())
	$BlendDuration.value_changed.connect(func(_v): schedule_changed())
	$Interpolation.item_selected.connect(func(_i): schedule_changed())
	$Timeline.value_changed.connect(scrub)
	$Timeline.marker_moved.connect(timeline_marker_moved)
	$Play.pressed.connect(toggle_play)
	$Stop.pressed.connect(func(): pause(); scrub(0))
	$Start.pressed.connect(func(): pause(); scrub(0))
	$End.pressed.connect(func(): pause(); scrub($Timeline.max_value))
	$Next.pressed.connect(func(): pause(); scrub(minf($Timeline.max_value,playhead+1.0/$FPS.get_selected_id())))
	$Previous.pressed.connect(func(): pause(); scrub(maxf(0,playhead-1.0/$FPS.get_selected_id())))
	$Speed.value_changed.connect(func(v): $AnimationPlayer.speed_scale=v)
	$Duration.value_changed.connect(duration_changed)
	$AddKey.pressed.connect(add_key)
	$DeleteKey.pressed.connect(delete_key)
	$MoveKey.pressed.connect(move_key)
	build_catalog()
	$Bone.item_selected.connect(select_bone)
	canvas.joint_selected.connect(select_bone)
	canvas.joint_moved.connect(move_joint)
	$Save.pressed.connect(save_all)
	$Unsaved.confirmed.connect(func():
		if save_all(): pending.call())
	$Unsaved.canceled.connect(func(): $Status.text="Switch cancelled; edits retained")
	$Catalog.item_selected.connect(catalog_selected)
	for name in ["X","Y","Angle","Length","RootX","RootY","Z","Deformation"]:
		ui(name).value_changed.connect(func(_v): properties_changed(name))
	$Reset.pressed.connect(reset_bone)
	for name in ["Skeleton","Anatomy","Grid","Mesh","Chunks","Background","Texture","Sources","Seams","OriginalOverlay"]:
		ui(name).toggled.connect(func(_v): update_display())
	open_pose("idle","south-west")
	if OS.get_cmdline_user_args().is_empty(): Engine.max_fps=30
	if "--demo" in OS.get_cmdline_user_args():
		Engine.max_fps=30
		$Mode.select(3)
		mode_changed(3)
		$Loop.button_pressed=true
		toggle_play()
	if "--diagnostics-check" in OS.get_cmdline_user_args():
		await preload("res://modules/character-rigging-editor/validation.gd").diagnostics(self)
		return
	for action in ["stage-d","test","export"]:
		if "--"+action+"-check" in OS.get_cmdline_user_args():
			await preload("res://modules/character-rigging-editor/validation.gd").run(self,action)
			return
	if "--proof-check" in OS.get_cmdline_user_args():
		open_transition("idle_to_aim_pistol","south-west")
		var log: Array=[]
		DirAccess.make_dir_recursive_absolute(ROOT+"proof-c")
		for index in range(31):
			scrub(index/30.0)
			await get_tree().process_frame
			await RenderingServer.frame_post_draw
			assert($Viewport.get_texture().get_image().save_png(ROOT+"proof-c/frame-%03d.png"%index)==OK)
			log.append(session.frame.duplicate(true))
		var file:=FileAccess.open(ROOT+"proof-c/frames.json",FileAccess.WRITE)
		file.store_string(JSON.stringify(log))
		get_tree().quit()
	if "--stage-b-check" in OS.get_cmdline_user_args():
		for pose in ["idle","aim-pistol"]:
			open_pose(pose,"south-west")
			await get_tree().process_frame
			await get_tree().process_frame
			await RenderingServer.frame_post_draw
			assert($Viewport.get_texture().get_image().save_png(ROOT+"stage-b-"+pose+".png")==OK)
		get_tree().quit()
	if "--stage-a-check" in OS.get_cmdline_user_args():
		var before: String = JSON.stringify(pose_data)
		var copy: Dictionary = JSON.parse_string(before)
		assert(copy.joints == pose_data.joints)
		assert(rig.bones.size()==12)
		$Status.text="Stage A: 12 bones loaded; joint JSON roundtrip passed"
		await get_tree().process_frame
		await RenderingServer.frame_post_draw
		$Viewport.get_texture().get_image().save_png(ROOT+"stage-a.png")
		get_tree().quit()

func build_catalog() -> void:
	$Catalog.clear()
	var root = $Catalog.create_item()
	root.set_text(0,"Character1")
	for view in ["south-west","north-west"]:
		var branch = $Catalog.create_item(root)
		branch.set_text(0,view)
		for pose in ["idle","walk","aim-pistol"]:
			if FileAccess.file_exists(ROOT+"poses/"+view+"/"+pose+".json"):
				var item = $Catalog.create_item(branch)
				item.set_text(0,pose)
				item.set_metadata(0,[pose,view])
		var folder: String=ROOT+"transitions/"+view
		if DirAccess.dir_exists_absolute(folder):
			var animations=$Catalog.create_item(branch)
			animations.set_text(0,"Transitions")
			for filename in DirAccess.get_files_at(folder):
				if filename.ends_with(".json"):
					var item=$Catalog.create_item(animations)
					item.set_text(0,filename.get_basename().replace("aim_pistol","Aim").replace("_to_"," > "))
					item.set_tooltip_text(0,filename.get_basename())
					item.set_metadata(0,[filename.get_basename(),view,"transition"])

func catalog_selected() -> void:
	var meta = $Catalog.get_selected().get_metadata(0)
	if meta is Array:
		if meta.size()==3:
			request_switch(func(): open_transition(meta[0],meta[1]))
		else:
			request_switch(func(): open_pose(meta[0],meta[1]))

func request_switch(action: Callable) -> void:
	if dirty or not session.changed.is_empty() or $Soma.dirty:
		pending=action
		$Unsaved.popup_centered()
	else:
		action.call()

func open_pose(pose: String, view: String) -> void:
	pause()
	sequence_active=false
	canvas.render_view=$Viewport
	canvas.rig=rig
	canvas.overlay_rigs=[]
	animation_active=false
	active_pose=pose
	direction=view
	pose_data=session.pose(pose,view)
	rig.configure(pose_data)
	rig.position=Vector2(pose_data.root_offset[0],pose_data.root_offset[1])
	$Viewport/Target.visible=false
	$Mode.select(0)
	$SourceLabel.text=pose+" / "+view+" / "+pose_data.mask_source
	dirty=false
	select_bone(selected)
	update_display()
	var missing: Array=[]
	for i in range(12):
		if pose_data.vertices[i].is_empty(): missing.append(pose_data.bone_names[i])
	$Status.text="Rig Setup / "+pose_data.mask_source+" / joints estimated from own anatomy"
	if not missing.is_empty(): $Status.text+=" / NO GEOMETRY: "+", ".join(missing)

func select_bone(index: int) -> void:
	selected=index
	canvas.selected=index
	$Bone.select(index)
	$Timeline.selected_part=index
	refresh_properties()

func refresh_properties() -> void:
	refreshing=true
	var i:=selected
	var inspected: Node2D=canvas.rig
	var data: Dictionary=inspected.data
	var angle: float=inspected.bones[i].global_rotation-inspected.global_rotation
	$X.value=inspected.current[i][0]
	$Y.value=inspected.current[i][1]
	$Angle.value=rad_to_deg(angle)
	$Length.value=data.lengths[i]
	$RootX.value=data.root_offset[0]
	$RootY.value=data.root_offset[1]
	$Z.value=data.z_order[i]
	$Deformation.value=data.deformation[i]
	var parent:=int(data.parents[i])
	$Properties.text="Bone: %s / parent %s\nRest: %s @ %.1f deg\nCurrent: %s @ %.1f deg\nAnatomy: %s\nBand: 2 px / strength %.2f\nChunk z: %s / texels: %d" % [data.bone_names[i],data.bone_names[parent] if parent>=0 else "Skeleton2D",format_joint(data.joints[i]),rad_to_deg(data.angles[i]),format_joint(inspected.current[i]),rad_to_deg(angle),groups_for_bone(i,data),data.deformation[i],str(data.z_order[i]),data.vertices[i].size()/4]
	if data.vertices[i].is_empty(): $Properties.text+="\nWARNING: NO ANATOMICAL GEOMETRY"
	refreshing=false
	refresh_schedule()

static func format_joint(point: Array) -> String:
	return "[%.2f, %.2f]"%[point[0],point[1]]

func groups_for_bone(bone: int, data: Dictionary) -> String:
	if bone<3:
		return "Torso (Pelvis / Spine / Chest)"
	var names: Array[String]=[]
	for group in data.group_bones:
		if int(data.group_bones[group])==bone:
			names.append(data.groups[str(group)])
	return ", ".join(names)

func move_joint(index: int, point: Vector2) -> void:
	if animation_active and $Mode.selected==2:
		pause()
		if playhead<=0 or playhead>=float(session.transition.duration):
			$Status.text="Endpoint joints belong to KeyPose; choose Rig Setup"
			return
		session.frame.joints[index]=[point.x,point.y]
		Motion.render_pair(rig,$Viewport/Target,session.frame,$Sources.button_pressed)
		session.add_key(playhead)
		refresh_keys()
		$Status.text="Intermediate joint key updated; Save persists it"
		refresh_properties()
		return
	if $Mode.selected!=0:
		$Status.text="Choose Rig Setup or Transition Editing"
		return
	pose_data.joints[index]=[point.x,point.y]
	rig.bind_rest()
	dirty=true
	session.mark_pose(pose_data)
	refresh_properties()

func properties_changed(name: String) -> void:
	if refreshing:
		return
	if animation_active and $Mode.selected==2:
		if name in ["X","Y"]:
			move_joint(selected,Vector2($X.value,$Y.value))
		elif name=="Angle":
			pause()
			if playhead<=0 or playhead>=float(session.transition.duration):
				$Status.text="Endpoint rotations belong to KeyPose"
				refresh_properties()
				return
			session.frame.angles[selected]=deg_to_rad($Angle.value)
			Motion.render_pair(rig,$Viewport/Target,session.frame,$Sources.button_pressed)
			session.add_key(playhead)
			refresh_keys()
		else:
			refresh_properties()
		return
	if $Mode.selected != 0:
		refresh_properties()
		return
	if name in ["X","Y"]:
		move_joint(selected,Vector2($X.value,$Y.value))
	elif name=="Angle":
		pose_data.angles[selected]=deg_to_rad($Angle.value)
	elif name=="Length":
		pose_data.lengths[selected]=$Length.value
	elif name=="Z":
		pose_data.z_order[selected]=$Z.value
		rig.chunks[selected].z_index=int($Z.value)
	elif name=="Deformation":
		pose_data.deformation[selected]=$Deformation.value
		rig.rebind_weights()
	else:
		pose_data.root_offset=[$RootX.value,$RootY.value]
		rig.position=Vector2($RootX.value,$RootY.value)
	rig.bind_rest()
	dirty=true
	session.mark_pose(pose_data)
	refresh_properties()

func reset_bone() -> void:
	if $Mode.selected!=0: return
	pose_data.angles[selected]=pose_data.original_angles[selected]
	pose_data.lengths[selected]=pose_data.original_lengths[selected]
	move_joint(selected,Vector2(pose_data.original_joints[selected][0],pose_data.original_joints[selected][1]))

func save_all() -> bool:
	if $Soma.dirty and not $Soma.save_edits(): return false
	session.save_all()
	dirty=false
	$Status.text="Saved "+active_pose+" / "+direction
	return true

func update_display() -> void:
	canvas.show_skeleton=$Skeleton.button_pressed
	canvas.show_grid=$Grid.button_pressed
	canvas.show_mesh=$Mesh.button_pressed
	canvas.show_chunks=$Chunks.button_pressed
	canvas.show_seams=$Seams.button_pressed
	canvas.dark=not $Background.button_pressed
	$Viewport/Reference.visible=$OriginalOverlay.button_pressed and not sequence_active
	$Viewport/Reference.texture=rig.texture_file(pose_data.texture)
	$Viewport/Reference.modulate=Color(1,1,1,.35)
	$Viewport/Reference.position=Vector2(pose_data.root_offset[0],pose_data.root_offset[1])
	if animation_active:
		$Viewport/Reference.position+=Vector2(75,90)-Vector2(pose_data.joints[0][0],pose_data.joints[0][1])
	var visible_rigs: Array=$Sequence.rigs if sequence_active else [rig,$Viewport/Target]
	for pair_rig in visible_rigs:
		if pair_rig.data.is_empty():
			continue
		for chunk in pair_rig.chunks:
			chunk.visible=$Texture.button_pressed
			chunk.texture=pair_rig.texture_file(pair_rig.data.anatomy if $Anatomy.button_pressed else pair_rig.data.skins[$Skin.selected])
	if animation_active:
		if sequence_active:
			$Sequence.present(playhead,$Sources.button_pressed)
		else:
			Motion.render_pair(rig,$Viewport/Target,session.frame,$Sources.button_pressed)

func _process(_delta: float) -> void:
	if animation_active and playing:
		show_frame(playhead)
		if playhead>=$Timeline.max_value-.00001:
			if $Loop.button_pressed:
				$AnimationPlayer.play("transition")
				$AnimationPlayer.seek(0,true)
			else:
				pause()
	canvas.queue_redraw()

func open_transition(name: String, view: String) -> void:
	pause()
	sequence_active=false
	canvas.render_view=$Viewport
	canvas.rig=rig
	canvas.overlay_rigs=[]
	session.open_transition(name,view)
	direction=view
	active_pose=session.transition.source
	pose_data=session.source
	rig.configure(session.source)
	rig.position=Vector2.ZERO
	$Viewport/Target.configure(session.target)
	$Viewport/Target.visible=true
	canvas.overlay_rigs=[rig,$Viewport/Target]
	animation_active=true
	$Mode.select(2)
	refreshing=true
	$Duration.value=session.transition.duration
	refreshing=false
	$Timeline.max_value=session.transition.duration
	build_clock()
	scrub(0)
	refresh_schedule()
	refresh_keys()
	$SourceLabel.text=name+" / "+view+" / "+session.source.mask_source+" -> "+session.target.mask_source
	update_display()

func build_clock() -> void:
	var player: AnimationPlayer=$AnimationPlayer
	if player.has_animation_library(""):
		player.remove_animation_library("")
	var library:=AnimationLibrary.new()
	var animation:=Animation.new()
	animation.length=$Timeline.max_value
	var track:=animation.add_track(Animation.TYPE_VALUE)
	animation.track_set_path(track,NodePath(".:playhead"))
	animation.track_insert_key(track,0,0.0)
	animation.track_insert_key(track,animation.length,animation.length)
	library.add_animation("transition",animation)
	player.add_animation_library("",library)

func scrub(seconds: float) -> void:
	if not animation_active:
		return
	playhead=seconds
	if $AnimationPlayer.has_animation("transition"):
		$AnimationPlayer.seek(seconds,true)
	show_frame(seconds)

func show_frame(seconds: float) -> void:
	if sequence_active:
		var previous: int=$Sequence.previous_segment
		$Sequence.present(seconds,$Sources.button_pressed)
		if previous!=$Sequence.previous_segment: update_display()
		canvas.overlay_rigs=$Sequence.rigs
		canvas.rig=$Comparison/NWSource if $SingleView.selected==2 else $Comparison/SWSource
		refresh_properties()
		$Timeline.set_value_no_signal(seconds)
		$Status.text="Sequence %.3f / %.3f seconds | %s" % [seconds,$Timeline.max_value,$Sequence.sequence.transitions[$Sequence.locate(seconds).index]]
		return
	var frame:=session.evaluate(seconds)
	Motion.render_pair(rig,$Viewport/Target,frame,$Sources.button_pressed)
	$Timeline.set_value_no_signal(seconds)
	$Status.text="%.3f / %.3f seconds | %s -> %s | selected chunk target %.0f%%" % [seconds,session.transition.duration,session.transition.source,session.transition.target,frame.alpha[selected]*100]
	refresh_properties()

func pause() -> void:
	playing=false
	$AnimationPlayer.pause()

func toggle_play() -> void:
	if not animation_active:
		$Status.text="Select a transition from the catalog"
		return
	if playing:
		pause()
	else:
		if playhead>=$Timeline.max_value:
			scrub(0)
		$AnimationPlayer.play("transition")
		$AnimationPlayer.seek(playhead,true)
		playing=true

func mode_changed(index: int) -> void:
	pause()
	$Soma.visible=index==4
	$SourceLabel.visible=index!=4
	$SingleView.visible=index!=4
	if index==4:
		animation_active=false
		sequence_active=false
		return
	sequence_active=false
	canvas.render_view=$Viewport
	canvas.rig=rig
	canvas.overlay_rigs=[]
	if index<2:
		animation_active=false
		$Viewport/Target.visible=false
		rig.configure(pose_data)
	elif index==2 and not session.transition.is_empty():
		open_transition(session.transition.id,session.transition.direction)
	elif index==3:
		if not FileAccess.file_exists(ROOT+"sequences/demo.json"):
			$Status.text="Sequence is not prepared yet"
			return
		$Sequence.setup(session.resources)
		animation_active=true
		sequence_active=true
		canvas.render_view=$Comparison
		canvas.rig=$Comparison/SWSource
		$Timeline.max_value=$Sequence.duration()
		build_clock()
		scrub(0)
		$SourceLabel.text="SW + NW | independent KeyPoses"

func refresh_schedule() -> void:
	if sequence_active or session.transition.is_empty(): return
	refreshing=true
	var t:=session.transition
	$SwitchMode.select(0 if t.switch_mode=="Whole pose" else 1)
	var schedule: Dictionary=t.whole if $SwitchMode.selected==0 else t.parts[selected]
	$SwitchTime.value=schedule.switch_time
	$Blend.button_pressed=schedule.blend_enabled
	$BlendDuration.value=schedule.blend_duration
	for i in range($Interpolation.item_count):
		if $Interpolation.get_item_text(i)==t.interpolation:
			$Interpolation.select(i)
	refreshing=false

func schedule_changed() -> void:
	if refreshing or sequence_active or session.transition.is_empty(): return
	var t:=session.transition
	t.switch_mode=$SwitchMode.get_item_text($SwitchMode.selected)
	var schedule: Dictionary=t.whole if $SwitchMode.selected==0 else t.parts[selected]
	schedule.switch_time=$SwitchTime.value
	schedule.blend_enabled=$Blend.button_pressed
	schedule.blend_duration=$BlendDuration.value
	t.interpolation=$Interpolation.get_item_text($Interpolation.selected)
	session.mark_transition()
	refresh_keys()
	if animation_active:
		scrub(playhead)

func duration_changed(value: float) -> void:
	if refreshing or sequence_active or session.transition.is_empty(): return
	pause()
	session.transition.duration=value
	session.mark_transition()
	$Timeline.max_value=value
	build_clock()
	scrub(minf(playhead,value))

func add_key() -> void:
	if not animation_active or sequence_active: return
	if session.add_key(playhead):
		refresh_keys()
		$Status.text="Intermediate bone key saved in memory; Save persists resource"
	else:
		$Status.text="Intermediate key must be inside the transition"

func refresh_keys() -> void:
	$Keys.clear()
	$Timeline.marks=[0.0,1.0]
	for key in session.transition.keys:
		$Keys.add_item("Key @ %.4f"%key.time)
		$Timeline.marks.append(key.time)
	$Timeline.switch_marks=[]
	if session.transition.switch_mode=="Whole pose":
		$Timeline.switch_marks.append(session.transition.whole.switch_time)
	else:
		for part in session.transition.parts:
			$Timeline.switch_marks.append(part.switch_time)
	$Timeline.queue_redraw()

func delete_key() -> void:
	if sequence_active or $Keys.selected<0: return
	session.transition.keys.remove_at($Keys.selected)
	session.mark_transition()
	refresh_keys()
	scrub(playhead)

func move_key() -> void:
	if sequence_active or $Keys.selected<0 or playhead<=0 or playhead>=float(session.transition.duration): return
	var t:=playhead/float(session.transition.duration)
	for i in range(session.transition.keys.size()):
		if i!=$Keys.selected and absf(session.transition.keys[i].time-t)<.00001:
			$Status.text="A key already exists at this time"
			return
	session.transition.keys[$Keys.selected].time=t
	session.transition.keys.sort_custom(func(a,b): return a.time<b.time)
	session.mark_transition()
	refresh_keys()
	scrub(playhead)

func timeline_marker_moved(kind: String, index: int, time: float) -> void:
	if not animation_active or sequence_active: return
	pause()
	if kind=="key":
		for i in range(session.transition.keys.size()):
			if i!=index and absf(float(session.transition.keys[i].time)-time)<.00001: return
		session.transition.keys[index].time=time
	else:
		var schedule: Dictionary=session.transition.whole if session.transition.switch_mode=="Whole pose" else session.transition.parts[index]
		schedule.switch_time=time
	session.mark_transition()
	refresh_keys()
	scrub(time*float(session.transition.duration))
