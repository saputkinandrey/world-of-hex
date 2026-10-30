extends RefCounted

const Model=preload("res://modules/character-rigging-editor/soma/rig_model.gd")
const Pairs=preload("res://modules/character-rigging-editor/soma/rig_pairs.gd")
const Settings=preload("res://modules/character-rigging-editor/soma/rig_settings.gd")
const Proof=preload("res://modules/character-rigging-editor/soma/rig_proof.gd")
const NorthProof=preload("res://modules/character-rigging-editor/soma/rig_north_proof.gd")
const OUT="res://modules/character-rigging-editor/soma/rig-editor/paired-editing/"

static func edited(s: Dictionary,scope: int,parameter: int,joint: int,value: Variant,mode: String) -> Dictionary:
	var result:=Pairs.edit(s,"north-west",scope,parameter,joint,value,mode)
	assert(not result.has("error"),str(result.get("error")))
	return result.state

static func qworld(s: Dictionary, scope: int) -> Array:
	var result: Array=[]
	for i in range(77):
		var q: Array=s.canonical.local_quaternions_xyzw[i]
		var local:=Quaternion(q[0],q[1],q[2],q[3]).normalized()*Model.rot(s.base_pose.local_rotation_vectors[i])
		if scope==2:local=local*Model.rot(Model.lens(s,"north-west").joints.get(s.canonical.joint_names[i],{}).get("rotation_delta",[0,0,0]))
		var parent: int=s.canonical.parents[i]
		result.append(local.normalized() if parent<0 else (result[parent]*local).normalized())
	return result

static func normal(s: Dictionary, scope: int) -> Vector3:
	var root: Array=s.canonical.local_quaternions_xyzw[0]
	var bind:=Quaternion(root[0],root[1],root[2],root[3]).normalized()
	var left: int=s.canonical.joint_names.find("LeftArm")
	var right: int=s.canonical.joint_names.find("RightArm")
	var lateral: Vector3=(Model.vec(s.canonical.rest_positions_m[right])-Model.vec(s.canonical.rest_positions_m[left])).normalized()
	return (qworld(s,scope)[0]*bind.inverse()*lateral).normalized()

static func reflected(v: Vector3, n: Vector3) -> Vector3:
	return v-2*n*v.dot(n)

static func assert_basis(a: Basis,b: Basis,label: String) -> void:
	assert(a.x.distance_to(b.x)<.000006 and a.y.distance_to(b.y)<.000006 and a.z.distance_to(b.z)<.000006,label)

static func check_offset(s: Dictionary,scope: int,joint: int,mode: String,delta: Vector3) -> void:
	var pair: int=Pairs.pairing(s.canonical)[joint]
	var before:=Model.world(s,"north-west",scope==2)
	var value: Array=Pairs.field_value(s,"north-west",scope,2,joint)
	var after:=edited(s,scope,2,joint,Model.array3(Model.vec(value)+delta),mode)
	var world_after:=Model.world(after,"north-west",scope==2)
	var source_delta: Vector3=world_after[joint]-before[joint]
	var pair_delta: Vector3=world_after[pair]-before[pair]
	var expected:=reflected(source_delta,normal(s,scope))*( -1.0 if mode=="Inverted" else 1.0)
	assert(pair_delta.distance_to(expected)<.000004,"Spatial mirrored offset / "+mode)
	if scope==2:
		assert(after.geometry==s.geometry and after.base_pose==s.base_pose)
		for view in ["south-west","south","south-east","north"]:assert(Proof.max_change(Model.projection(s,view),Model.projection(after,view))<.0001)
		NorthProof.mirror_check(after)
	var reversed_state:=edited(after,scope,2,joint,value,mode)
	assert(Model.vec(Pairs.field_value(reversed_state,"north-west",scope,2,pair)).distance_to(Model.vec(Pairs.field_value(s,"north-west",scope,2,pair)))<.000004)

static func check_rotation(s: Dictionary,scope: int,joint: int,mode: String) -> void:
	var pair: int=Pairs.pairing(s.canonical)[joint]
	var old: Array=Pairs.field_value(s,"north-west",scope,0,joint)
	var new_q:=Model.rot(old)*Quaternion(Vector3(.3,.8,-.2).normalized(),.19)
	var after:=edited(s,scope,0,joint,Pairs.rotation_vector(new_q),mode)
	var before_world:=qworld(s,scope)
	var after_world:=qworld(after,scope)
	var source_change: Basis=Basis(after_world[joint]*before_world[joint].inverse())
	var pair_change: Basis=Basis(after_world[pair]*before_world[pair].inverse())
	var n:=normal(s,scope)
	var mirror:=Basis(reflected(Vector3.RIGHT,n),reflected(Vector3.UP,n),reflected(Vector3.BACK,n))
	var expected:=mirror*source_change*mirror
	if mode=="Inverted":expected=expected.transposed()
	assert_basis(pair_change,expected,"Quaternion spatial conjugation / "+mode)
	var restored:=edited(after,scope,0,joint,old,mode)
	assert_basis(Basis(qworld(restored,scope)[pair]),Basis(before_world[pair]),"Quaternion inverse edit must restore paired orientation")
	if scope==2:assert(after.geometry==s.geometry and after.base_pose==s.base_pose);NorthProof.mirror_check(after)

static func check_length(s: Dictionary,scope: int,joint: int,mode: String,value: float) -> void:
	var pair: int=Pairs.pairing(s.canonical)[joint]
	var old=Pairs.field_value(s,"north-west",scope,1,joint)
	var before: float=Pairs.segment(s,"north-west",scope,joint).length()
	var paired_before: float=Pairs.segment(s,"north-west",scope,pair).length()
	var after:=edited(s,scope,1,joint,value,mode)
	var ratio: float=Pairs.segment(after,"north-west",scope,joint).length()/before
	var expected: float=paired_before*(1.0/ratio if mode=="Inverted" else ratio)
	assert(absf(Pairs.segment(after,"north-west",scope,pair).length()-expected)<.000001,"Paired actual segment length / "+mode)
	var restored:=edited(after,scope,1,joint,old,mode)
	assert(absf(Pairs.segment(restored,"north-west",scope,pair).length()-paired_before)<.000001)
	if scope==2:
		assert(after.geometry==s.geometry and after.base_pose==s.base_pose)
		for i in [joint,pair]:assert(Model.lens(s,"north-west").joints.get(s.canonical.joint_names[i],{}).get("local_offset_delta")==Model.lens(after,"north-west").joints.get(s.canonical.joint_names[i],{}).get("local_offset_delta"))

static func reset_ui(p: Panel, baseline: Dictionary, mode: String, joint: int, scope: int, parameter: int) -> void:
	p.state=baseline.duplicate(true);p.history.clear_history()
	p.selected=joint;p.view="north-west"
	p.get_node("Scope").select(scope);p.get_node("Parameter").select(parameter)
	p.get_node("Edit"+mode).button_pressed=true
	p.editing_mode=mode;p.refresh()

static func run(p: Panel) -> void:
	var baseline: Dictionary=p.state.duplicate(true)
	var preserved_session: String=FileAccess.get_file_as_string(Model.SAVE).sha256_text()
	var folder: String=OUT+"proof-"+str(Time.get_ticks_msec())+"/"
	DirAccess.make_dir_recursive_absolute(folder)
	p.save_path=OUT+"replay-session.json"
	var names: Array=baseline.canonical.joint_names
	var arm: int=names.find("RightArm")
	var other_arm: int=names.find("LeftArm")
	var shoulder: int=names.find("RightShoulder")
	var left_shoulder: int=names.find("LeftShoulder")
	var hand: int=names.find("RightHand")
	var other_hand: int=names.find("LeftHand")
	var finger: int=names.find("RightHandIndex2")
	var checks: Array=[]
	assert(Pairs.pairing(baseline.canonical).size()==68)
	assert(Settings.load_mode(OUT+"absent-settings.json")=="Free")
	checks.append("Explicit 34 SOMA pairs / 68 joints; parent correspondence; default Free")
	var rotation: Array=baseline.base_pose.local_rotation_vectors[arm].duplicate()
	rotation[2]+=.2
	var free:=edited(baseline,0,0,arm,rotation,"Free")
	assert(free.base_pose.local_rotation_vectors[other_arm]==baseline.base_pose.local_rotation_vectors[other_arm])
	checks.append("A: Free edits RightArm only")
	# Deliberately asymmetric parents and root expose incorrect local sign flips.
	var asym:=baseline.duplicate(true)
	asym.base_pose.local_rotation_vectors[shoulder]=[.2,-.3,.1]
	asym.base_pose.local_rotation_vectors[left_shoulder]=[-.1,.25,-.2]
	asym.base_pose.local_rotation_vectors[0]=[.3,-.2,.4]
	Model.put_override(asym,"north-west","RightShoulder","rotation_delta",[.1,.2,-.1])
	Model.put_override(asym,"north-west","LeftShoulder","rotation_delta",[-.2,.1,.15])
	for mode in ["Symmetric","Inverted"]:
		for scope in [1,2]:
			for direction: Vector3 in [Vector3(.03,0,0),Vector3(0,.03,0),Vector3(0,0,.03)]:check_offset(asym,scope,arm,mode,direction)
			check_offset(asym,scope,finger,mode,Vector3(.004,-.002,.003))
		for scope in [0,2]:
			for pose_index in range(3):
				var posed:=asym.duplicate(true)
				posed.base_pose.local_rotation_vectors[arm]=[.15+pose_index*.2,-.6,.12]
				posed.base_pose.local_rotation_vectors[other_arm]=[-.32,.4+pose_index*.1,-.22]
				if scope==2:
					Model.put_override(posed,"north-west","RightArm","rotation_delta",[.12,-.2,.09])
					Model.put_override(posed,"north-west","LeftArm","rotation_delta",[-.31,.1,.2])
				check_rotation(posed,scope,arm,mode)
			check_rotation(asym,scope,finger,mode)
		var unequal:=asym.duplicate(true)
		unequal.geometry.local_offsets_m[hand]=Model.array3(Model.vec(unequal.geometry.local_offsets_m[hand])*1.2)
		unequal.geometry.local_offsets_m[other_hand]=Model.array3(Model.vec(unequal.geometry.local_offsets_m[other_hand])*.8)
		check_length(unequal,1,hand,mode,Pairs.segment(unequal,"north-west",1,hand).length()*1.15)
		check_length(unequal,2,hand,mode,1.12)
		var neutral:=baseline.duplicate(true)
		neutral.overrides["idle/north-west"].joints.erase("RightHand")
		neutral.overrides["idle/north-west"].joints.erase("LeftHand")
		var scaled:=edited(neutral,2,1,hand,1.2,mode)
		var paired_scale: float=Pairs.field_value(scaled,"north-west",2,1,other_hand)
		assert(absf(paired_scale-(1/1.2 if mode=="Inverted" else 1.2))<.000001)
	checks.append("B/C: reflected and inverse spatial offsets, XYZ, asymmetric parents / root, Geometry and NW lens")
	checks.append("D/E: unequal segment lengths; actual k / 1-k reciprocal; existing lens offsets retained; inverse edit restores")
	checks.append("F/G: quaternion conjugation in world space, 3 asymmetric starting poses, Base Pose and lens, inverse edits")
	checks.append("M: original Index2 finger pair supports spatial offsets and rotations")
	for scope in [0,1,2]:
		for parameter in ([0] if scope==0 else [1,2] if scope==1 else [0,1,2]):
			var no_change=Pairs.field_value(baseline,"north-west",scope,parameter,arm)
			var unchanged:=edited(baseline,scope,parameter,arm,no_change,"Inverted")
			assert(Pairs.field_value(unchanged,"north-west",scope,parameter,other_arm)==Pairs.field_value(baseline,"north-west",scope,parameter,other_arm),"No-op Apply must retain paired values exactly")
	for mode in Pairs.MODES:
		for central in ["Chest","Hips","Head","Jaw"]:
			var joint: int=names.find(central)
			var value: Array=baseline.base_pose.local_rotation_vectors[joint].duplicate();value[0]+=.1
			var central_edit:=edited(baseline,0,0,joint,value,mode)
			for i in range(77):
				if i!=joint:assert(central_edit.base_pose.local_rotation_vectors[i]==baseline.base_pose.local_rotation_vectors[i])
		var nw:=edited(baseline,2,0,arm,[0,.1,.05],mode)
		assert(nw.geometry==baseline.geometry and nw.base_pose==baseline.base_pose)
		NorthProof.mirror_check(nw)
	assert(Pairs.edit(baseline,"north-west",1,1,hand,0,"Symmetric").has("error"))
	assert(Pairs.edit(baseline,"north-west",2,1,hand,-1,"Inverted").has("error"))
	var impossible:=baseline.duplicate(true)
	var g:=Model.vec(impossible.geometry.local_offsets_m[other_hand])
	var perpendicular: Vector3=g.cross(Vector3(1,2,3)).normalized()
	Model.put_override(impossible,"north-west","LeftHand","local_offset_delta",Model.array3(perpendicular))
	Model.put_override(impossible,"north-west","RightHand","local_offset_delta",[0,0,0])
	assert(Pairs.edit(impossible,"north-west",2,1,hand,.1,"Symmetric").has("error"),"Unreachable paired length must fail atomically without dropping offset")
	var common_value: Array=baseline.base_pose.local_rotation_vectors[arm].duplicate();common_value[1]+=.1
	assert(Pairs.edit(baseline,"south",0,0,arm,common_value,"Symmetric").state==Pairs.edit(baseline,"north-west",0,0,arm,common_value,"Symmetric").state,"Shared edit must not depend on active camera / lens")
	checks.append("H/K: NW lens isolated from shared data and other 4 views; NE remains reflected; central joints edit once; invalid lengths rejected")
	var before_switch: Dictionary=p.state.duplicate(true)
	for mode in Pairs.MODES:p.get_node("Edit"+mode).button_pressed=true;assert(p.state==before_switch)
	checks.append("J: switching all modes does not change any calibration value or create lens records")
	for mode in Pairs.MODES:
		reset_ui(p,baseline,mode,shoulder,1,2)
		var before: Dictionary=p.state.duplicate(true)
		var frames:=qworld(before,1)
		var root: Array=before.canonical.local_quaternions_xyzw[0]
		var anatomical_up: Vector3=frames[0]*Quaternion(root[0],root[1],root[2],root[3]).normalized().inverse()*Vector3.UP
		var world_delta: Vector3=anatomical_up*.075+normal(before,1)*.035
		var parent: int=before.canonical.parents[shoulder]
		var target: Vector3=Model.vec(before.geometry.local_offsets_m[shoulder])+frames[parent].inverse()*world_delta
		for i in range(3):p.get_node(["X","Y","Z"][i]).value=target[i]
		p.get_node("Apply").pressed.emit()
		var after: Dictionary=p.state.duplicate(true)
		assert(p.history.get_history_count()==1,"Paired edit must be one action")
		p.history.undo();assert(p.state==before,"Undo must restore both sides exactly")
		p.history.redo();assert(p.state==after,"Redo must restore both sides exactly")
		var source_motion: Vector3=Model.world(after,"south",false)[shoulder]-Model.world(before,"south",false)[shoulder]
		var pair_motion: Vector3=Model.world(after,"south",false)[left_shoulder]-Model.world(before,"south",false)[left_shoulder]
		if mode=="Free":assert(pair_motion.length()<.000001)
		else:assert(pair_motion.distance_to(reflected(source_motion,normal(before,1))*(-1 if mode=="Inverted" else 1))<.000005)
		await Proof.capture(p,folder+mode.to_lower()+"-shoulders-six.png")
	checks.append("I: actual Apply button creates one UndoRedo action for both shoulders; 3 real six-view screenshots")
	reset_ui(p,baseline,"Inverted",hand,2,1)
	p.get_node("X").value=1.12
	assert("RightForeArm -> RightHand" in p.get_node("PairPreview").text and "LeftForeArm -> LeftHand" in p.get_node("PairPreview").text)
	p.get_node("Apply").pressed.emit()
	await Proof.capture(p,folder+"inverted-length-preview.png")
	assert(p.save_session())
	var expected:=NorthProof.dump(Proof.all_points(p.state))
	p.reload_session()
	assert(FileAccess.get_file_as_string(Model.SAVE).sha256_text()==preserved_session,"Working calibration was overwritten")
	NorthProof.write(OUT+"validation.json",{"success":true,"restart_verified":false,"checks":checks,"folder":folder,"expected_projections":expected,"preserved_working_sha256":preserved_session,"settings":"Inverted"})
	p.dirty=false
	print("PAIRED EDITING: ",checks.size()," checks passed; ",folder)
	p.get_tree().quit()

static func reload_run(p: Panel) -> void:
	var validation:=Model.read(OUT+"validation.json")
	assert(p.editing_mode=="Inverted" and Settings.load_mode(p.settings_path)=="Inverted")
	p.state=Model.load_session(OUT+"replay-session.json",p.seed)
	assert(Model.validate(p.state,p.seed).is_empty())
	p.refresh()
	for view in Model.ORDER:
		var points:=Model.projection(p.state,view)
		for i in range(77):
			var a: Array=validation.expected_projections[view][i]
			assert(points[i].distance_to(Vector2(a[0],a[1]))<.0001,"Pairing must not reapply during reload")
	assert(FileAccess.get_file_as_string(Model.SAVE).sha256_text()==validation.preserved_working_sha256)
	validation.restart_verified=true
	NorthProof.write(OUT+"validation.json",validation)
	print("PAIRED RESTART: preference and all six projections restored without replaying pair edits")
	p.dirty=false;p.get_tree().quit()
