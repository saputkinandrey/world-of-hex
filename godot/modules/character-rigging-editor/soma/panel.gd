extends Panel

const ROOT := "res://modules/character-rigging-editor/soma/"
const PYTHON := "C:/Users/Public/motionbricks-runtime/motionbricks/.venv/Scripts/python.exe"
var catalog: Dictionary = {}
var model: Dictionary = {}
var data: Dictionary = {}
var patch: Dictionary = {}
var dirty := false
var selected_chunk := 0
var selected_joint := 0
var step_index := 0
var refreshing := false
var job := ""
var process_id := -1
var request_key := ""
var overrides_root := ROOT+"overrides/"

static func read_json(path: String) -> Dictionary:
	if not FileAccess.file_exists(path): return {}
	var result = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not result is Dictionary:
		push_error("Invalid SOMA JSON: " + path)
		return {}
	return result

static func write_json(path: String, value: Dictionary) -> bool:
	var folder := path.get_base_dir()
	if DirAccess.make_dir_recursive_absolute(folder) != OK: return false
	var file := FileAccess.open(path + ".tmp", FileAccess.WRITE)
	if file == null: return false
	file.store_string(JSON.stringify(value,"  ") + "\n")
	file.close()
	return DirAccess.rename_absolute(path + ".tmp",path) == OK

func _ready() -> void:
	visible=false
	if not FileAccess.file_exists(ROOT+"catalog.json"):
		$Status.text="SOMA inputs unavailable. Run run.ps1 soma-build."
		return
	catalog=read_json(ROOT+"catalog.json")
	model=read_json(ROOT+"canonical.json")
	$Character.add_item(catalog.character)
	for value in catalog.cases: $Case.add_item(value.key)
	for name in ["Source","Chunks","Placement","Canonical SOMA","Calibrated SOMA","Pose Difference","View Difference"]:
		$Layer.add_item(name)
	for name in ["Baseline Projection","Camera Only","Shared Geometry","Pose Delta","Art Delta","Final Comparison"]:
		$Layer.add_item("MV: "+name)
	for name in model.joint_names: $Joint.add_item(name)
	$Case.item_selected.connect(case_selected)
	$Layer.item_selected.connect(layer_selected)
	$Chunks.item_selected.connect(select_chunk)
	$Joint.item_selected.connect(select_joint)
	$ApplyMapping.pressed.connect(apply_mapping)
	$Exclude.toggled.connect(exclude_chunk)
	$Save.pressed.connect(save_edits)
	$Reload.pressed.connect(func():
		if process_id>0: return
		if dirty and not save_edits(): return
		open_case(current_key()))
	$Refit.pressed.connect(refit)
	$Accumulated.toggled.connect(show_accumulated)
	$ArtConfirm.pressed.connect(confirm_art)
	$ArtClear.pressed.connect(func():
		patch.art_corrections.erase(model.joint_names[selected_joint]); mark_dirty(); select_joint(selected_joint))
	$Previous.pressed.connect(func(): change_step(-1))
	$Next.pressed.connect(func(): change_step(1))
	$Pin.pressed.connect(func(): set_pin(selected_joint,Vector2($PinX.value,$PinY.value)))
	$Unpin.pressed.connect(func():
		patch.pins.erase(model.joint_names[selected_joint]); mark_dirty())
	$Semantics.toggled.connect(func(value):
		if not refreshing: patch.verified_semantics=value; mark_dirty())
	$Registration.toggled.connect(func(value):
		if not refreshing: patch.verified_registration=value; mark_dirty())
	$Canvas.joint_moved.connect(set_pin)
	$Canvas.joint_selected.connect(select_joint)
	$FullSkeleton.toggled.connect(func(value):
		$Canvas.full_skeleton=value
		if value: $ShoulderFocus.button_pressed=false
		$Canvas.queue_redraw())
	$Evidence.toggled.connect(func(value): $Canvas.show_evidence=value; $Canvas.queue_redraw())
	$ShoulderFocus.toggled.connect(func(value):
		if value:$FullSkeleton.button_pressed=false
		$Canvas.focus_shoulders(value))
	select_case_key("idle/south")
	if "--soma" in OS.get_cmdline_user_args() or "--soma-proof-check" in OS.get_cmdline_user_args():
		call_deferred("activate_mode")
	if "--soma-proof-check" in OS.get_cmdline_user_args(): call_deferred("proof")
	if "--mv-open" in OS.get_cmdline_user_args() or "--mv-proof-check" in OS.get_cmdline_user_args():
		call_deferred("activate_multiview")
	if "--mv-proof-check" in OS.get_cmdline_user_args():call_deferred("multiview_proof")

func current_key() -> String:
	return $Case.get_item_text($Case.selected)

func select_case_key(key: String) -> void:
	for i in range($Case.item_count):
		if $Case.get_item_text(i)==key:
			$Case.select(i)
			open_case(key)
			return
	$Status.text="No matching source case: "+key

func case_selected(_i: int) -> void:
	if process_id>0 or (dirty and not save_edits()):
		for i in range($Case.item_count):
			if $Case.get_item_text(i)==data.key: $Case.select(i)
		return
	open_case(current_key())

func open_case(key: String) -> void:
	var saved_path:=ROOT+"cases/"+key+".json"
	var saved:=read_json(saved_path if FileAccess.file_exists(saved_path) else ROOT+"observations/"+key+".json")
	if saved.is_empty():
		$Status.text="Required source missing: "+key
		return
	var patch_path:=overrides_root+key+".json"
	var saved_patch:=read_json(patch_path)
	if FileAccess.file_exists(patch_path) and saved_patch.is_empty():
		$Status.text="ERROR: invalid manual override file; current edits retained: "+patch_path
		return
	if saved_patch.has("calibration_identity") and saved_patch.calibration_identity!=saved.source.get("calibration_identity"):
		$Status.text="ERROR: saved edits refer to a different mask revision; explicit reconciliation required."
		return
	if saved_patch.has("source_signature") and saved_patch.source_signature!=saved.source.signature:
		$Status.text="ERROR: saved edits refer to different source images; explicit reconciliation required."
		return
	data=saved
	patch=saved_patch
	if patch.is_empty(): patch={"version":"1.0.0","key":key,"pins":{},"mapping":{},"excluded_chunks":[],"verified_semantics":false,"verified_registration":false,"art_corrections":{}}
	patch.source_signature=data.source.signature
	patch.calibration_identity=data.source.get("calibration_identity")
	dirty=false
	step_index=0
	$Canvas.configure(data,model,patch)
	$Accumulated.set_pressed_no_signal(false)
	$Chunks.clear()
	for chunk in data.chunks:
		$Chunks.add_item("%02d %-17s %-10s %.3f"%[chunk.id,chunk.name,chunk.status,chunk.score])
	refreshing=true
	$Semantics.button_pressed=patch.verified_semantics
	$Registration.button_pressed=patch.verified_registration
	refreshing=false
	select_chunk(0)
	select_joint(0)
	change_step(0)
	$Status.text=key+" | "+data.source.mask_source+" | "+data.source.review.status+" | "+("Fit available; 3D is prior-regularized, not identified" if data.has("geometry") else "Source available; run Joint refit")

func select_chunk(index: int) -> void:
	selected_chunk=index
	$Chunks.select(index)
	var chunk: Dictionary=data.chunks[index]
	$Mapping.text=",".join(patch.mapping.get(str(chunk.id),chunk.mapping))
	refreshing=true
	$Exclude.button_pressed=chunk.id in patch.excluded_chunks
	refreshing=false
	$Canvas.selected_chunk=chunk.id
	show_details()
	$Canvas.queue_redraw()

func select_joint(index: int) -> void:
	selected_joint=index
	$Joint.select(index)
	$Canvas.selected_joint=index
	var joint_name: String=model.joint_names[index]
	var default_point: Array=data.get("projected_joints",[])[index] if data.has("projected_joints") else [0,0]
	if $Layer.selected==2 and not data.get("placement",[]).is_empty():
		default_point=data.placement[mini(step_index,data.placement.size()-1)].after.get(joint_name,{}).get("point",[0,0])
	var point: Array=patch.pins.get(joint_name,default_point)
	$PinX.value=point[0]
	$PinY.value=point[1]
	var art: Dictionary=patch.art_corrections.get(joint_name,{})
	$ArtScale.value=art.get("multiplier",1.0)
	$ArtReason.text=art.get("reason","")
	show_details()
	$Canvas.queue_redraw()

func show_details() -> void:
	if data.is_empty(): return
	if data.has("multiview"):
		var mv: Dictionary=data.multiview
		var camera: Dictionary=data.camera
		var text: String="%s\nYaw %.3f / pitch %.3f deg\nScale %.4f px/m | shift %.3f, %.3f\n"%[mv.stage,mv.camera_degrees.yaw,mv.camera_degrees.pitch,camera.pixels_per_metre,camera.tx,camera.ty]
		text+="Delta counts: "+str(mv.delta_counts)+"\n"+mv.reason+"\nSelected: "+str(model.joint_names[selected_joint])+"\n"
		text+="South projection change: %.6f px\n"%mv.south_projection_max_change_px
		for row in mv.metrics.joints:
			if row.joint==model.joint_names[selected_joint]:text+="Interval disagreement %.3f px (hypothesis, not ground truth)\n"%row.outside_interval_px
		text+="Chest->Shoulder is a kinematic connector. Hidden roots/depth remain unconfirmed."
		$Details.text=text
		return
	var chunk: Dictionary=data.chunks[selected_chunk]
	var text: String=chunk.name+"\n"+"\n".join(chunk.reasons)+"\n"
	if $Layer.selected==2 and not data.get("placement",[]).is_empty():
		var current: Dictionary=data.placement[mini(step_index,data.placement.size()-1)]
		var name: String=model.joint_names[selected_joint]
		var local: Dictionary=current.after.get(name,{})
		$Details.text=current.name+"\n"+current.why+"\n"+("Not reconstructed at this step; no final coordinates substituted." if local.is_empty() else name+"\nPoint: "+str(local.point)+"\nSources: "+str(local.get("sources",[]))+"\nInterval: "+str(local.heuristic_radius_px)+" px")+"\n3D depth remains unobserved.\n"+str(current.get("conflicts",[]))
		return
	text+="Joint: "+str(model.joint_names[selected_joint])+"\nDepth: unobserved canonical prior\n"
	if data.has("joint_status"):
		var evidence: Dictionary=data.joint_status[selected_joint]
		text="%s | %s | interval %s px\nSources: %s\n"%[evidence.joint,evidence.status,str(evidence.get("heuristic_radius_px")),str(evidence.get("sources",[]))]+text
	var display: Dictionary=$Canvas.data
	if display.has("spatial_joints_m"):
		text+="XYZ metres: "+str(display.spatial_joints_m[selected_joint])+"\n"
	if data.has("metrics"):
		text+="Conflicts: "+str(data.metrics.conflicts)+" | outside interval mean: %.2f px\n"%data.metrics.mean_outside_interval_px
	if $Layer.selected>=5:
		for row in data.get("comparison",[]):
			if row.bone==model.joint_names[selected_joint]:
				var comparison: String="%s | baseline 3D %.4f m (prior gauge)\n"%[row.bone,row.baseline_length_m]
				comparison+="Visible endpoints / predicted px: "+str(row.observed_projection_px)+" / "+str(row.predicted_projection_px)+"\nResidual px: "+str(row.residual_px)+" | heuristic reliability: %.3f\n"%row.reliability+row.classification+"\n"+row.reason+"\n\n"
				text=comparison+text
	$Details.text=text

func layer_selected(index: int) -> void:
	if index>=7:
		open_multiview(index-7)
		return
	$ShoulderFocus.visible=false
	$Canvas.shoulder_focused=false
	if data.has("multiview"):
		$Case.disabled=false
		$Refit.disabled=false
		set_editing_enabled(true)
		open_case(current_key())
	if index==5 and data.get("key","")=="idle/south":
		if dirty and not save_edits(): return
		select_case_key("walk/south")
	elif index==6 and data.get("view","")=="south":
		if dirty and not save_edits(): return
		select_case_key("idle/south-west")
	$Canvas.layer=index
	if index>=5 and selected_joint==0:
		select_joint(model.joint_names.find("LeftForeArm"))
	show_details()
	$Canvas.queue_redraw()

func change_step(delta: int) -> void:
	if data.has("multiview"):
		var index: int=clampi(int(data.multiview.index)+delta,0,5)
		$Layer.select(index+7)
		open_multiview(index)
		return
	var steps: Array=data.get("placement",[])
	if steps.is_empty():
		$Step.text="No placement yet; run Joint refit"
		return
	step_index=clampi(step_index+delta,0,steps.size()-1)
	var current: Dictionary=steps[step_index]
	$Step.text="%d/%d %s | known joints %d | priority %.3f"%[step_index+1,steps.size(),current.name,current.after.size(),current.priority]
	$Step.tooltip_text=current.why+"\nJoints: "+str(current.constrained_joints)+"\n"+current.unknown_depth
	$Canvas.step_index=step_index
	select_joint(selected_joint)
	$Canvas.queue_redraw()

func apply_mapping() -> void:
	var values: Array=[]
	for item in $Mapping.text.split(","):
		var name: String=item.strip_edges()
		if not name in model.joint_names:
			$Status.text="Unknown original SOMA joint: "+name
			return
		values.append(name)
	var chunk: Dictionary=data.chunks[selected_chunk]
	if values.size()!=chunk.mapping.size():
		$Status.text="This chunk requires %d ordered joint names"%chunk.mapping.size()
		return
	patch.mapping[str(chunk.id)]=values
	mark_dirty()

func exclude_chunk(value: bool) -> void:
	if refreshing: return
	var id: int=data.chunks[selected_chunk].id
	patch.excluded_chunks.erase(id)
	if value: patch.excluded_chunks.append(id)
	mark_dirty()

func set_pin(index: int, point: Vector2) -> void:
	if process_id>0: return
	patch.pins[model.joint_names[index]]=[point.x,point.y]
	mark_dirty()
	select_joint(index)

func mark_dirty() -> void:
	dirty=true
	$Canvas.patch=patch
	$Canvas.queue_redraw()
	$Status.text="Manual edits pending refit. Save preserves them separately from source masks."

func save_edits() -> bool:
	if data.is_empty(): return true
	if not write_json(overrides_root+data.key+".json",patch):
		$Status.text="ERROR: could not save manual overrides; edits retained in memory"
		return false
	dirty=false
	$Status.text="Saved manual overrides for "+data.key+"; Joint refit applies constraints."
	return true

func refit() -> void:
	request_fit(false)

func request_fit(validation_only: bool) -> void:
	if process_id>0 or data.is_empty(): return
	job=str(Time.get_unix_time_from_system())+"-"+str(Time.get_ticks_msec())
	request_key=data.key
	var request: Dictionary={"job":job,"key":request_key,"overrides":patch,"validation_only":validation_only}
	if not write_json(ROOT+"cache/refit-request.json",request):
		$Status.text="ERROR: could not write refit request"
		return
	var script:=ProjectSettings.globalize_path("res://modules/character-rigging-editor/tools/soma_build.py")
	process_id=OS.create_process(PYTHON,PackedStringArray(["-B",script,"refit"]),false)
	if process_id<0:
		$Status.text="ERROR: could not launch CPU solver: "+PYTHON
		return
	$Refit.disabled=true
	$Case.disabled=true
	set_editing_enabled(false)
	$Status.text="CPU joint fit running for "+request_key+". Source masks remain read-only."

func _process(_delta: float) -> void:
	if process_id<0: return
	var status:=read_json(ROOT+"cache/refit-status.json")
	if status.get("job","")==job:
		process_id=-1
		$Refit.disabled=false
		$Case.disabled=false
		set_editing_enabled(true)
		if status.success:
			open_case(request_key)
			$Status.text="Joint fit saved: "+request_key+" | "+status.message
		else:
			$Status.text="Refit failed. Manual edits retained; see full error in tooltip."
			$Status.tooltip_text=status.message
			push_error(status.message)
	elif not OS.is_process_running(process_id):
		process_id=-1
		$Refit.disabled=false
		$Case.disabled=false
		set_editing_enabled(true)
		$Status.text="ERROR: solver exited without matching result. Inspect SOMA cache and Python runtime."

func proof() -> void:
	var relative_folder: String="soma/anatomy/gpu/run-"+str(Time.get_unix_time_from_system()).replace(".","-")+"/"
	var folder: String="res://modules/character-rigging-editor/"+relative_folder
	DirAccess.make_dir_recursive_absolute(folder)
	for view in [0,1,2,3,4,5,6]:
		$Layer.select(view)
		layer_selected(view)
		await get_tree().process_frame
		await get_tree().process_frame
		var error:=get_viewport().get_texture().get_image().save_png(folder+str(view)+".png")
		assert(error==OK)
	select_case_key("idle/south")
	$Layer.select(2)
	layer_selected(2)
	var placement_folder:=folder+"placement/"
	DirAccess.make_dir_recursive_absolute(placement_folder)
	for index in range(data.placement.size()):
		step_index=index
		change_step(0)
		assert($Canvas.data.placement[index].after.size()==data.placement[index].after.size())
		await get_tree().process_frame
		await get_tree().process_frame
		assert(get_viewport().get_texture().get_image().save_png(placement_folder+"step-%02d.png"%index)==OK)
	$Layer.select(4)
	layer_selected(4)
	$FullSkeleton.button_pressed=true
	await get_tree().process_frame
	await get_tree().process_frame
	assert(get_viewport().get_texture().get_image().save_png(folder+"full-77.png")==OK)
	$FullSkeleton.button_pressed=false
	# Exercise the actual panel save/switch/reload path in an isolated override store.
	overrides_root=ROOT+"cache/proof-overrides-"+str(Time.get_ticks_usec())+"/"
	select_case_key("idle/south")
	step_index=0
	change_step(1)
	assert(step_index==1)
	change_step(-1)
	var before: Array=data.projected_joints[0].duplicate()
	set_pin(0,Vector2(before[0]+1.25,before[1]-.5))
	assert(dirty)
	assert(save_edits())
	select_case_key("walk/south")
	select_case_key("idle/south")
	assert(Vector2(patch.pins.Hips[0],patch.pins.Hips[1]).is_equal_approx(Vector2(before[0]+1.25,before[1]-.5)))
	assert(not dirty)
	get_parent().mode_changed(0)
	assert(not visible)
	get_parent().mode_changed(4)
	assert(visible and patch.pins.has("Hips"))
	request_fit(true)
	assert(process_id>0)
	var deadline:=Time.get_ticks_msec()+120000
	while process_id>0 and Time.get_ticks_msec()<deadline:
		await get_tree().process_frame
	assert(process_id<0,"CPU fit did not finish")
	var fitted:=read_json(ROOT+"cache/solver-validation/result.json")
	assert(fitted.get("manual",{}).get("pins",{}).has("Hips"))
	assert(fitted.get("metrics",{}).get("solver_success",false))
	assert(write_json(ROOT+"proof/latest.json",{"folder":relative_folder,"placement_folder":relative_folder+"placement/","full_skeleton":relative_folder+"full-77.png"}),"Cannot publish successful GPU capture manifest")
	assert(write_json(ROOT+"proof/ui-validation.json",{"save_reload_switch":true,"manual_pin":true,"legacy_mode_return":true,"screenshot_layers":7,"override_store":"isolated cache","gui_cpu_refit":true}),"Cannot save GPU validation record")
	get_tree().quit()

func activate_mode() -> void:
	Engine.max_fps=30
	get_parent().get_node("Mode").select(4)
	get_parent().mode_changed(4)

func set_editing_enabled(value: bool) -> void:
	for name in ["Save","Reload","ApplyMapping","Pin","Unpin","Semantics","Registration","Exclude","ArtConfirm","ArtClear"]:
		get_node(name).disabled=not value
	$Mapping.editable=value
	$ArtReason.editable=value

func activate_multiview() -> void:
	activate_mode()
	$Layer.select(8)
	open_multiview(1)

func open_multiview(index: int) -> void:
	if process_id>0:
		$Status.text="Wait for the current refit before switching calibration workflow."
		$Layer.select($Canvas.layer)
		return
	if dirty and not save_edits():return
	var path:=ROOT+"multiview/stages/%02d.json"%index
	var staged:=read_json(path)
	if staged.is_empty():
		$Canvas.data={}
		$Canvas.queue_redraw()
		$Status.text="Multi-view stages unavailable. Run run.ps1 mv-build."
		return
	data=staged
	patch={"pins":{},"mapping":{},"excluded_chunks":[],"art_corrections":{}}
	dirty=false
	for i in range($Case.item_count):
		if $Case.get_item_text(i)=="idle/south-west":$Case.select(i)
	$Case.disabled=true
	$Refit.disabled=true
	set_editing_enabled(false)
	$ShoulderFocus.visible=true
	$Canvas.configure(data,model,patch)
	$Canvas.layer=index+7
	$Canvas.focus_shoulders($ShoulderFocus.button_pressed)
	$Chunks.clear()
	for chunk in data.chunks:$Chunks.add_item("%02d %-17s %-10s %.3f"%[chunk.id,chunk.name,chunk.status,chunk.score])
	selected_chunk=0
	select_joint(model.joint_names.find("Chest"))
	$Step.text=data.multiview.stage+" | changes "+str(data.multiview.delta_counts)
	$Status.text="Read-only staged projection from immutable South Idle. "+data.multiview.reason

func multiview_proof() -> void:
	var relative: String="soma/multiview/proof/run-"+str(Time.get_ticks_usec())+"/"
	var folder: String="res://modules/character-rigging-editor/"+relative
	DirAccess.make_dir_recursive_absolute(folder)
	for i in range(6):
		$Layer.select(i+7)
		open_multiview(i)
		assert(data.projected_joints.size()==77)
		await get_tree().process_frame
		await get_tree().process_frame
		assert(get_viewport().get_texture().get_image().save_png(folder+str(i)+".png")==OK)
	$ShoulderFocus.button_pressed=true
	await get_tree().process_frame
	await get_tree().process_frame
	assert(get_viewport().get_texture().get_image().save_png(folder+"shoulders.png")==OK)
	$ShoulderFocus.button_pressed=false
	$FullSkeleton.button_pressed=true
	await get_tree().process_frame
	await get_tree().process_frame
	assert(get_viewport().get_texture().get_image().save_png(folder+"full-77.png")==OK)
	$FullSkeleton.button_pressed=false
	change_step(-1)
	assert(data.multiview.index==4)
	change_step(1)
	assert(data.multiview.index==5)
	$Layer.select(0)
	layer_selected(0)
	assert(not data.has("multiview"))
	assert(not $Case.disabled and not $Refit.disabled)
	get_parent().mode_changed(0)
	assert(not visible)
	assert(write_json(ROOT+"multiview/ui-validation.json",{"success":true,"stages":6,"read_only":true,"return_to_editor":true,"shoulder_focus":true,"full_77":true,"folder":relative}))
	get_tree().quit()

func confirm_art() -> void:
	if data.key=="idle/south":
		$Status.text="South Idle defines baseline geometry; art corrections belong to another pose/view."
		return
	if model.parents[selected_joint]<0:
		$Status.text="Hips is the root; select a child bone for a length correction."
		return
	if $ArtReason.text.strip_edges().is_empty():
		$Status.text="Art correction requires explicit evidence / confirmation reason."
		return
	patch.art_corrections[model.joint_names[selected_joint]]={"confirmed":true,"multiplier":$ArtScale.value,"reason":$ArtReason.text.strip_edges()}
	mark_dirty()

func show_accumulated(value: bool) -> void:
	if not value:
		$Canvas.configure(data,model,patch)
		show_details()
		return
	var accumulated:=read_json(ROOT+"accumulation.json")
	if not accumulated.get("geometry_updated",false) or not accumulated.get("projected_by_case",{}).has(data.key):
		$Accumulated.set_pressed_no_signal(false)
		$Status.text="Accumulation unavailable for this case: verified same-pose anatomical correspondence and camera registration required."
		return
	var refined:=data.duplicate(true)
	refined.geometry=accumulated.geometry
	refined.spatial_joints_m=accumulated.spatial_joints_m
	refined.projected_joints=accumulated.projected_by_case[data.key]
	$Canvas.configure(refined,model,patch)
	show_details()
	$Status.text="Accumulated shared Idle model: conditional on verified cameras. Information gain is heuristic, not statistical confidence."
