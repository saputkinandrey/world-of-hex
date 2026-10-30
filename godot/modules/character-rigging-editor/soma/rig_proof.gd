extends RefCounted

const Model=preload("res://modules/character-rigging-editor/soma/rig_model.gd")
const OUT="res://modules/character-rigging-editor/soma/rig-editor/"

static func all_points(s: Dictionary) -> Dictionary:
	var out: Dictionary={}
	for view in Model.ORDER:out[view]=Model.projection(s,view)
	return out

static func max_change(a: Array,b: Array) -> float:
	var largest:=0.0
	for i in range(a.size()):largest=maxf(largest,a[i].distance_to(b[i]))
	return largest

static func only_view(before: Dictionary,after: Dictionary,view: String) -> void:
	for name in Model.ORDER:assert((max_change(before[name],after[name])>.001)==(name==view),"View isolation: "+name)

static func capture(p: Panel, path: String) -> void:
	await p.get_tree().process_frame
	await RenderingServer.frame_post_draw
	assert(p.get_viewport().get_texture().get_image().save_png(path)==OK)

static func reset(p: Panel) -> void:
	p.state=p.seed.duplicate(true)
	p.history.clear_history()
	p.selected=p.seed.canonical.joint_names.find("RightArm")
	p.view="south-west"
	p.get_node("Scope").select(0)
	p.get_node("Parameter").select(0)
	p.refresh()

static func edit(p: Panel,scope: int,parameter: int,v: Array) -> void:
	p.get_node("Scope").select(scope)
	p.get_node("Parameter").select(parameter)
	p.refresh()
	for i in range(3):p.get_node(["X","Y","Z"][i]).value=v[i]
	p.get_node("Apply").pressed.emit()

static func run(p: Panel) -> void:
	var checks: Array=[]
	var folder: String=OUT+"proof/run-"+str(Time.get_ticks_msec())+"/"
	DirAccess.make_dir_recursive_absolute(folder)
	p.save_path=OUT+"proof-session.json"
	reset(p)
	assert(Model.validate(p.state,p.seed).is_empty())
	var before_zoom: Dictionary=p.state.duplicate(true)
	var shared_scale: Vector2=p.get_node("Canvas").image_transform("south-west").get_scale()
	for v in Model.ORDER:
		assert(p.get_node("Canvas").image_transform(v).get_scale().is_equal_approx(shared_scale),"All six views must use the same native-pixel display zoom: "+v)
	var wheel:=InputEventMouseButton.new()
	wheel.button_index=MOUSE_BUTTON_WHEEL_UP;wheel.pressed=true
	wheel.position=p.get_node("Canvas").cell("south").get_center()
	p.get_node("Canvas")._gui_input(wheel)
	assert(p.get_node("Canvas").focused.is_empty(),"Shared zoom must retain the six-view grid")
	for v in Model.ORDER:
		assert(p.get_node("Canvas").image_transform(v).get_scale().is_equal_approx(shared_scale*1.15),"Wheel must zoom all six views together")
	p.get_node("Center").pressed.emit()
	for v in Model.ORDER:assert(p.get_node("Canvas").image_transform(v).get_scale().is_equal_approx(shared_scale))
	assert(p.state==before_zoom,"Display zoom must not change calibration")
	checks.append("Shared display zoom: identical native-pixel scale across six sizes; wheel changes all views; Center resets without editing calibration")
	var initial:=all_points(p.state)
	var source:=Model.read("res://modules/character-rigging-editor/soma/multiview/south-baseline.json")
	var south_world:=Model.world(p.state,"south")
	for i in range(77):assert(south_world[i].distance_to(Model.vec(source.positions_m[i]))<.00001,"Original South FK drift")
	for pair in [["south-west","south-east"],["north-west","north-east"]]:
		for i in range(77):
			assert(abs(initial[pair[0]][i].x+initial[pair[1]][i].x-p.seed.images[pair[0]].native_size[0])<.0001)
	checks.append("A: six cameras; frozen South FK; exact mirrored raster with unchanged anatomical identities")
	p.selected=0;p.refresh()
	await capture(p,folder+"01-six-views.png")
	p.selected=p.seed.canonical.joint_names.find("RightArm")
	p.get_node("Joint").select(p.selected)
	p.get_node("Joint").item_selected.emit(p.selected)
	await capture(p,folder+"02-selected-joint.png")
	var original: Dictionary=p.state.duplicate(true)
	var canvas=p.get_node("Canvas")
	# Deliberately misregister only the image anchor, then correct it by dragging.
	p.state.anchors["idle/south-west"].offset_px[0]-=9
	p.state.anchors["idle/south-west"].offset_px[1]+=4
	p.refresh()
	var anchor_initial:=all_points(p.state)
	await capture(p,folder+"06a-anchor-before.png")
	p.get_node("AnchorTool").button_pressed=true
	var native: Vector2=Vector2(p.state.anchors["idle/south-west"].target_px[0],p.state.anchors["idle/south-west"].target_px[1])
	var press:=InputEventMouseButton.new()
	press.button_index=MOUSE_BUTTON_LEFT;press.pressed=true;press.position=canvas.image_transform("south-west")*native
	canvas._gui_input(press)
	var motion:=InputEventMouseMotion.new()
	motion.position=canvas.image_transform("south-west")*(native+Vector2(9,-4))
	canvas._gui_input(motion)
	press.pressed=false;canvas._gui_input(press)
	var moved:=all_points(p.state)
	only_view(anchor_initial,moved,"south-west")
	for i in range(77):assert((moved["south-west"][i]-anchor_initial["south-west"][i]).distance_to(Vector2(9,-4))<.0001)
	assert(max_change(initial["south-west"],moved["south-west"])<.0001)
	assert(original.geometry==p.state.geometry and original.base_pose==p.state.base_pose and original.cameras==p.state.cameras)
	await capture(p,folder+"06-anchor-drag.png")
	p.history.undo();assert(max_change(anchor_initial["south-west"],Model.projection(p.state,"south-west"))<.0001)
	p.history.redo();assert(max_change(moved["south-west"],Model.projection(p.state,"south-west"))<.0001)
	checks.append("B: real canvas anchor drag moves all 77 points rigidly in one view; undo / redo")
	p.get_node("AnchorTool").button_pressed=false
	reset(p)
	var degrees: Array=p.values().map(func(x):return rad_to_deg(x))
	degrees[2]+=12
	edit(p,0,0,degrees)
	var base_changed:=all_points(p.state)
	for view in Model.ORDER:assert(max_change(initial[view],base_changed[view])>.01,"Base pose must affect "+view)
	assert(original.geometry==p.state.geometry)
	checks.append("C: shoulder Base Pose changes all six projections; geometry remains shared")
	await capture(p,folder+"03-base-pose.png")
	reset(p)
	edit(p,2,0,[0,0,12])
	only_view(initial,all_points(p.state),"south-west")
	assert(p.state.base_pose==original.base_pose and p.state.geometry==original.geometry)
	await capture(p,folder+"04-view-rotation.png")
	checks.append("D: relative rotation isolated to SouthWest")
	reset(p)
	p.selected=p.seed.canonical.joint_names.find("RightHand")
	p.refresh()
	var before_world:=Model.world(p.state,"south-west")
	edit(p,2,1,[1.18,0,0])
	var after_world:=Model.world(p.state,"south-west")
	var parent: int=p.seed.canonical.parents[p.selected]
	assert(abs(after_world[p.selected].distance_to(after_world[parent])/before_world[p.selected].distance_to(before_world[parent])-1.18)<.00001)
	var finger: int=p.seed.canonical.joint_names.find("RightHandIndex1")
	if finger<0:
		for i in range(77):
			if p.seed.canonical.parents[i]==p.selected:finger=i;break
	assert(finger>=0 and after_world[finger].distance_to(before_world[finger])>.001)
	only_view(initial,all_points(p.state),"south-west")
	assert(p.state.geometry==original.geometry)
	await capture(p,folder+"05-length-chain.png")
	checks.append("E: parent-to-selected forearm length scales by 1.18; hand children move; other views / base unchanged")
	reset(p)
	p.selected=p.seed.canonical.joint_names.find("RightShoulder")
	edit(p,2,2,[.02,.01,.015])
	only_view(initial,all_points(p.state),"south-west")
	checks.append("F: local shoulder offset moves its connected chain only in SouthWest")
	edit(p,2,0,[10,5,12])
	edit(p,2,1,[1.12,0,0])
	var composed:=Model.world(p.state,"south-west")
	parent=p.seed.canonical.parents[p.selected]
	var expected_length: float=(Model.vec(p.state.geometry.local_offsets_m[p.selected])*1.12+Vector3(.02,.01,.015)).length()
	assert(abs(composed[p.selected].distance_to(composed[parent])-expected_length)<.00001)
	# Independent explicit chain product verifies non-commuting rotation order.
	var lineage: Array=[]
	var ancestor: int=parent
	while ancestor>=0:lineage.push_front(ancestor);ancestor=p.seed.canonical.parents[ancestor]
	var parent_q:=Quaternion.IDENTITY
	for index: int in lineage:
		var q: Array=p.seed.canonical.local_quaternions_xyzw[index]
		parent_q=parent_q*Quaternion(q[0],q[1],q[2],q[3])*Model.rot(p.state.base_pose.local_rotation_vectors[index])
	var selected_q: Array=p.seed.canonical.local_quaternions_xyzw[p.selected]
	var effective_q:=parent_q*Quaternion(selected_q[0],selected_q[1],selected_q[2],selected_q[3])*Model.rot(p.state.base_pose.local_rotation_vectors[p.selected])*Model.rot([deg_to_rad(10),deg_to_rad(5),deg_to_rad(12)])
	var arm: int=p.seed.canonical.joint_names.find("RightArm")
	assert(p.seed.canonical.parents[arm]==p.selected)
	var expected_child: Vector3=composed[p.selected]+effective_q*Model.vec(p.state.geometry.local_offsets_m[arm])
	assert(expected_child.distance_to(composed[arm])<.00001,"Quaternion order canonical * base * lens")
	var lens_copy: Dictionary=p.state.overrides.duplicate(true)
	var before_pose_change:=all_points(p.state)
	var rot_degrees: Array=p.state.base_pose.local_rotation_vectors[p.selected].map(func(x):return rad_to_deg(x))
	rot_degrees[0]+=10
	edit(p,0,0,rot_degrees)
	assert(p.state.overrides==lens_copy)
	assert(max_change(before_pose_change["south-west"],Model.projection(p.state,"south-west"))>.001)
	checks.append("G/H: rotation + length + offset composed before FK; lens survives changed Base Pose")
	var enabled:=all_points(p.state)
	for iteration in range(8):
		p.get_node("Enabled").button_pressed=false
		var disabled:=all_points(p.state)
		var without_lens:=Model.project_world(Model.world(p.state,"south-west",false),p.state.cameras["south-west"])
		var shift: Array=p.state.anchors["idle/south-west"].offset_px
		for i in range(77):assert(disabled["south-west"][i].distance_to(without_lens[i]+Vector2(shift[0],shift[1]))<.0001)
		p.get_node("Enabled").button_pressed=true
		for v in Model.ORDER:assert(max_change(enabled[v],Model.projection(p.state,v))<.0001)
	checks.append("I: eight disable / enable cycles with no accumulation")
	var before_camera:=all_points(p.state)
	p.get_node("Yaw").value+=2;p.get_node("ApplyCamera").pressed.emit()
	only_view(before_camera,all_points(p.state),"south-west")
	p.get_node("AnchorX").value+=3;p.get_node("ApplyAnchor").pressed.emit()
	var saved:=all_points(p.state)
	assert(p.save_session())
	for iteration in range(12):p.reload_session();assert(p.save_session())
	p.get_node("ResetView").pressed.emit()
	p.reload_session()
	for v in Model.ORDER:
		var drift:=max_change(saved[v],Model.projection(p.state,v))
		assert(drift<.0001,"Reload "+v+" drift "+str(drift)+"; "+p.get_node("Status").text)
	var encoded: Dictionary={}
	for v in Model.ORDER:
		encoded[v]=[]
		for q: Vector2 in saved[v]:encoded[v].append([q.x,q.y])
	assert(Model.save(OUT+"proof-reload-input.json",p.state,p.seed).is_empty())
	var record: Dictionary={"success":true,"checks":checks,"folder":folder,"expected_projections":encoded,"restart_verified":false}
	var file:=FileAccess.open(OUT+"ui-validation.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(record,"  ",true,true));file.close()
	# General geometry edit / foot chain, reset tools, scope isolation and navigation.
	reset(p)
	p.selected=p.seed.canonical.joint_names.find("Spine1")
	var offset: Array=p.state.geometry.local_offsets_m[p.selected].duplicate()
	offset[0]+=.015
	edit(p,1,2,offset)
	for v in Model.ORDER:assert(max_change(initial[v],Model.projection(p.state,v))>.001)
	checks.append("Geometry: spine offset changes all six views without pose mutation")
	reset(p)
	edit(p,0,3,[.02,.01,.005])
	for v in Model.ORDER:assert(max_change(initial[v],Model.projection(p.state,v))>.001)
	assert(p.state.geometry==p.seed.geometry and p.state.overrides==p.seed.overrides)
	checks.append("Base Pose root translation is independent of image anchor and shared geometry")
	reset(p)
	p.selected=p.seed.canonical.joint_names.find("RightToeBase")
	edit(p,2,1,[1.15,0,0]);edit(p,2,2,[.005,0,.01])
	var toe_end: int=p.seed.canonical.joint_names.find("RightToeEnd")
	assert(Model.world(p.state,"south-west")[toe_end].distance_to(Model.world(p.seed,"south-west")[toe_end])>.001)
	p.get_node("ResetJoint").pressed.emit()
	assert(p.state.overrides["idle/south-west"].joints.is_empty())
	checks.append("Foot: ToeBase length / offset moves ToeEnd through connected FK; selected lens reset")
	p.get_node("Full").button_pressed=true
	p.get_node("Masks").button_pressed=true
	p.get_node("Focus").pressed.emit()
	await capture(p,folder+"07-full77-focus-masks.png")
	p.get_node("All").pressed.emit();p.get_node("Center").pressed.emit()
	p.get_node("Skeleton").button_pressed=false
	await capture(p,folder+"08-source-only.png")
	checks.append("Navigation: Full 77, masks, focus, all six, centering, source-only")
	record.checks=checks
	file=FileAccess.open(OUT+"ui-validation.json",FileAccess.WRITE);file.store_string(JSON.stringify(record,"  ",true,true));file.close()
	p.dirty=false
	print("RIG EDITOR CHECKS: ",checks.size()," passed; ",folder)
	p.get_tree().quit()

static func reload_run(p: Panel) -> void:
	var validation:=Model.read(OUT+"ui-validation.json")
	var loaded:=Model.load_session(OUT+"proof-reload-input.json",p.seed)
	assert(Model.validate(loaded,p.seed).is_empty())
	p.state=loaded;p.refresh()
	for view in Model.ORDER:
		var actual:=Model.projection(p.state,view)
		for i in range(77):
			var expected: Array=validation.expected_projections[view][i]
			assert(actual[i].distance_to(Vector2(expected[0],expected[1]))<.0001,"New process replay mismatch")
	validation.restart_verified=true
	var check: String="J: all six edited projections reproduced in a fresh Godot process"
	if check not in validation.checks:validation.checks.append(check)
	var file:=FileAccess.open(OUT+"ui-validation.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(validation,"  ",true,true));file.close()
	await capture(p,validation.folder+"09-restarted-session.png")
	print("RIG RESTART: six projections reproduced")
	p.get_tree().quit()
