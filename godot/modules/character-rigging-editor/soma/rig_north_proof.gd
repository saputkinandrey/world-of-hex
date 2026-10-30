extends RefCounted

const Model=preload("res://modules/character-rigging-editor/soma/rig_model.gd")
const North=preload("res://modules/character-rigging-editor/soma/rig_north.gd")
const Proof=preload("res://modules/character-rigging-editor/soma/rig_proof.gd")
const OUT="res://modules/character-rigging-editor/soma/rig-editor/north-west/"

static func choose(p: Panel, name: String) -> void:
	for i in range(p.get_node("NorthProfile").item_count):
		if p.get_node("NorthProfile").get_item_text(i)==name:
			p.get_node("NorthProfile").select(i)
			p.get_node("NorthProfile").item_selected.emit(i)
			return
	assert(false,"Missing North calibration profile: "+name)

static func mirror_check(s: Dictionary) -> void:
	var a:=Model.projection(s,"north-west")
	var b:=Model.projection(s,"north-east")
	for i in range(77):
		assert(absf(a[i].x+b[i].x-150)<.0001 and absf(a[i].y-b[i].y)<.0001,"Linked North mirror differs")

static func dump(points: Dictionary) -> Dictionary:
	var result: Dictionary={}
	for view in points:
		result[view]=[]
		for point: Vector2 in points[view]:result[view].append([point.x,point.y])
	return result

static func write(path: String, data: Dictionary) -> void:
	var file:=FileAccess.open(path,FileAccess.WRITE)
	assert(file!=null,"Cannot write North proof: "+path)
	file.store_string(JSON.stringify(data,"  ",true,true));file.close()

static func run(p: Panel) -> void:
	DirAccess.make_dir_recursive_absolute(OUT)
	var folder: String=OUT+"proof-"+str(Time.get_ticks_msec())+"/"
	DirAccess.make_dir_recursive_absolute(folder)
	var baseline: Dictionary=p.state.duplicate(true)
	var original:=Proof.all_points(baseline)
	var stages: Dictionary={}
	p.view="north-west"
	p.get_node("Canvas").focused="north-west"
	p.selected=p.seed.canonical.joint_names.find("LeftHand")
	p.get_node("Scope").select(2)
	p.get_node("Parameter").select(2)
	var index:=0
	for name in Model.read(North.PATH).profiles:
		choose(p,name)
		assert(p.state.geometry==baseline.geometry and p.state.base_pose==baseline.base_pose,"North correction modified shared South geometry or pose")
		for view in ["south-west","south","south-east","north"]:assert(Proof.max_change(original[view],Model.projection(p.state,view))<.0001,"Unrelated view modified: "+view)
		if name!="Provisional":mirror_check(p.state)
		stages[name]={"camera":Model.camera(p.state,"north-west"),"anchor":Model.anchor(p.state,"north-west"),"lens":Model.lens(p.state,"north-west").duplicate(true),"projection":dump({"north-west":Model.projection(p.state,"north-west")})["north-west"]}
		await Proof.capture(p,folder+"%02d-%s.png"%[index,name.replace(" / ","-").replace(" ","-")])
		if index==0:
			p.get_node("Masks").button_pressed=true
			await Proof.capture(p,folder+"00-provisional-chunks.png")
			p.get_node("Masks").button_pressed=false
		index+=1
	var working: Dictionary=p.state.duplicate(true)
	var corrected:=Proof.all_points(working)
	p.view="north-east";p.get_node("Canvas").focused="north-east";p.refresh()
	assert(p.get_node("Apply").disabled and p.get_node("ApplyCamera").disabled and p.get_node("Enabled").disabled)
	await Proof.capture(p,folder+"06-linked-north-east.png")
	p.get_node("All").pressed.emit()
	await Proof.capture(p,folder+"07-final-six.png")
	p.view="north-west";p.refresh()
	p.get_node("Enabled").button_pressed=false
	for view in ["north-west","north-east"]:assert(Proof.max_change(corrected[view],Model.projection(p.state,view))>1)
	mirror_check(p.state)
	await Proof.capture(p,folder+"08-lens-disabled.png")
	p.get_node("Enabled").button_pressed=true
	for view in Model.ORDER:assert(Proof.max_change(corrected[view],Model.projection(p.state,view))<.0001)
	# Edits use the same existing joint tool; the live reflected view follows.
	var joint: int=p.seed.canonical.joint_names.find("LeftHand")
	p.selected=joint;p.refresh()
	p.get_node("X").value+=.005;p.get_node("Apply").pressed.emit()
	mirror_check(p.state)
	assert(Proof.max_change(corrected["north-west"],Model.projection(p.state,"north-west"))>.001)
	p.history.undo()
	for view in Model.ORDER:assert(Proof.max_change(corrected[view],Model.projection(p.state,view))<.0001)
	p.get_node("DetachNorth").pressed.emit()
	assert(not Model.linked(p.state,"north-east"))
	for view in Model.ORDER:assert(Proof.max_change(corrected[view],Model.projection(p.state,view))<.0001,"Detaching must preserve appearance")
	p.view="north-east";p.refresh()
	p.get_node("X").value+=.005;p.get_node("Apply").pressed.emit()
	assert(Proof.max_change(corrected["north-west"],Model.projection(p.state,"north-west"))<.0001)
	assert(Proof.max_change(corrected["north-east"],Model.projection(p.state,"north-east"))>.001)
	p.history.undo();p.history.undo()
	assert(Model.linked(p.state,"north-east"));mirror_check(p.state)
	p.view="north-west";p.refresh()
	assert(p.save_session())
	assert(Model.save(OUT+"working.json",p.state,p.seed).is_empty())
	choose(p,"Provisional")
	p.reload_session()
	assert(Model.linked(p.state,"north-east"))
	for view in Model.ORDER:assert(Proof.max_change(corrected[view],Model.projection(p.state,view))<.0001,"Saved North working profile differs")
	var checks: Array=["shared geometry / Base Pose unchanged", "four unrelated views unchanged", "six camera/registration/lens comparison stages in real Godot UI", "all 77 mirrored NorthEast joints exact", "linked NE editing locked until explicit detach", "lens disable/enable restores both North views without accumulation", "manual joint edit propagates through live reflection link", "detach preserves appearance; subsequent NE edit isolated; undo restores link", "separate working profile and normal session saved / reloaded"]
	write(OUT+"validation.json",{"success":true,"restart_verified":false,"folder":folder,"checks":checks,"stages":stages,"expected_projections":dump(corrected)})
	print("NORTH WORKING CALIBRATION: ",checks.size()," checks passed; ",folder)
	p.get_tree().quit()

static func reload_run(p: Panel) -> void:
	var validation:=Model.read(OUT+"validation.json")
	assert(p.state.get("north_profile")=="Working" and Model.linked(p.state,"north-east"))
	for view in Model.ORDER:
		var actual:=Model.projection(p.state,view)
		for i in range(77):
			var expected: Array=validation.expected_projections[view][i]
			assert(actual[i].distance_to(Vector2(expected[0],expected[1]))<.0001,"North restart replay mismatch")
	mirror_check(p.state)
	validation.restart_verified=true
	write(OUT+"validation.json",validation)
	await Proof.capture(p,validation.folder+"09-restarted-working.png")
	print("NORTH RESTART: working calibration and linked NorthEast restored")
	p.get_tree().quit()
