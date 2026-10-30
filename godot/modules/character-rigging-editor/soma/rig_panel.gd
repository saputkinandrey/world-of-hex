extends Panel

const Model=preload("res://modules/character-rigging-editor/soma/rig_model.gd")
const North=preload("res://modules/character-rigging-editor/soma/rig_north.gd")
const Pairs=preload("res://modules/character-rigging-editor/soma/rig_pairs.gd")
const Settings=preload("res://modules/character-rigging-editor/soma/rig_settings.gd")
var editing_mode:="Free"
var settings_path:=Settings.PATH
var joint_pairs: Dictionary={}
var seed: Dictionary={}
var state: Dictionary={}
var history:=UndoRedo.new()
var selected:=0
var view:="south-west"
var updating:=false
var dirty:=false
var drag_before: Dictionary={}
var save_path:=Model.SAVE

func _exit_tree() -> void:
	history.free()

func _ready() -> void:
	visible=false
	if not FileAccess.file_exists(Model.SEED):
		$Status.text="Missing six-camera seed. Run run.ps1 rig-prepare."
		return
	seed=Model.read(Model.SEED)
	joint_pairs=Pairs.pairing(seed.canonical)
	if "--pairs-proof-check" in OS.get_cmdline_user_args() or "--pairs-reload-check" in OS.get_cmdline_user_args():
		var test_folder: String="res://modules/character-rigging-editor/soma/rig-editor/paired-editing/"
		DirAccess.make_dir_recursive_absolute(test_folder)
		settings_path=test_folder+"editor-settings.json"
	editing_mode=Settings.load_mode(settings_path)
	if "--rig-proof-check" in OS.get_cmdline_user_args() or "--north-proof-check" in OS.get_cmdline_user_args():editing_mode="Free"
	for mode in Pairs.MODES:
		get_node("Edit"+mode).toggled.connect(func(value):
			if value and not updating:select_editing_mode(mode))
	for name in ["X","Y","Z"]:get_node(name).value_changed.connect(func(_value):
		if not updating:update_pair_info())
	state=seed.duplicate(true)
	if FileAccess.file_exists(save_path):
		var loaded:=Model.load_session(save_path,seed)
		var message:=Model.validate(loaded,seed)
		if not message.is_empty():$Status.text="ERROR: "+message;return
		state=loaded
	for name in seed.canonical.joint_names:$Joint.add_item(name);$AnchorJoint.add_item(name)
	for name in Model.ORDER:$View.add_item(name)
	if FileAccess.file_exists(North.PATH):
		for name in Model.read(North.PATH).profiles:$NorthProfile.add_item(name)
	$NorthProfile.item_selected.connect(func(i):
		view="north-west"
		commit("Load North pair / "+$NorthProfile.get_item_text(i),North.apply_profile(state,$NorthProfile.get_item_text(i))))
	$DetachNorth.pressed.connect(func():
		var next:=state.duplicate(true)
		Model.detach(next,"north-east")
		commit("Explicitly detach NorthEast",next))
	for name in ["Base Pose","Character Geometry","View Override","Camera / Anchor"]:$Scope.add_item(name)
	for name in ["Rotation (axis-angle vector, degrees)","Length (parent -> selected joint)","Local Offset (metres)","Pose root translation (metres)"]:$Parameter.add_item(name)
	$Joint.item_selected.connect(func(i):selected=i;refresh())
	$View.item_selected.connect(func(i):view=Model.ORDER[i];refresh())
	$Scope.item_selected.connect(func(_i):refresh())
	$Parameter.item_selected.connect(func(_i):refresh())
	$Apply.pressed.connect(apply_parameter)
	$ApplyCamera.pressed.connect(apply_camera)
	$ApplyAnchor.pressed.connect(apply_anchor)
	$AnchorJoint.item_selected.connect(func(i):
		var next:=state.duplicate(true)
		next.anchors["idle/"+view].joint=seed.canonical.joint_names[i]
		commit("Select anchor joint",next))
	$ResetAnchor.pressed.connect(func():
		var next:=state.duplicate(true)
		next.anchors["idle/"+view]=seed.anchors["idle/"+view].duplicate(true)
		commit("Reset image anchor",next))
	$Enabled.toggled.connect(func(value):
		if updating:return
		var next:=state.duplicate(true)
		next.overrides["idle/"+view].enabled=value
		commit("Enable / disable view lens",next))
	$ResetJoint.pressed.connect(func():
		var next:=state.duplicate(true)
		next.overrides["idle/"+view].joints.erase(seed.canonical.joint_names[selected])
		commit("Reset selected joint override",next))
	$ResetView.pressed.connect(func():
		var next:=state.duplicate(true)
		next.overrides["idle/"+view].joints={}
		commit("Clear view overrides",next))
	$Undo.pressed.connect(func():history.undo())
	$Redo.pressed.connect(func():history.redo())
	$Save.pressed.connect(save_session)
	$Reload.pressed.connect(reload_session)
	$Back.pressed.connect(func():
		if dirty and not save_session():return
		visible=false)
	$Full.toggled.connect(func(value):$Canvas.full=value;$Canvas.queue_redraw())
	$Masks.toggled.connect(func(value):$Canvas.show_masks=value;$Canvas.queue_redraw())
	$Skeleton.toggled.connect(func(value):$Canvas.skeleton=value;$Canvas.queue_redraw())
	$AnchorTool.toggled.connect(func(value):$Canvas.anchor_tool=value)
	$All.pressed.connect(func():$Canvas.focused="";$Canvas.queue_redraw())
	$Focus.pressed.connect(func():$Canvas.focused=view;$Canvas.queue_redraw())
	$Center.pressed.connect(func():
		$Canvas.zoom=1.0
		for name in Model.ORDER:$Canvas.pans[name]=Vector2.ZERO
		$Canvas.queue_redraw())
	$Canvas.joint_selected.connect(func(i,v):selected=i;view=v;refresh())
	$Canvas.view_selected.connect(func(v):view=v;refresh())
	$Canvas.anchor_started.connect(func():drag_before=state.duplicate(true))
	$Canvas.anchor_moved.connect(func(v,target):
		Model.set_anchor_target(state,v,target);refresh())
	$Canvas.anchor_finished.connect(func():
		var next:=state.duplicate(true)
		state=drag_before.duplicate(true)
		commit("Drag sprite anchor",next))
	refresh()
	if "--rig-open" in OS.get_cmdline_user_args() or "--rig-proof-check" in OS.get_cmdline_user_args() or "--rig-reload-check" in OS.get_cmdline_user_args():call_deferred("activate")
	if "--rig-proof-check" in OS.get_cmdline_user_args():call_deferred("proof")
	if "--rig-reload-check" in OS.get_cmdline_user_args():call_deferred("reload_proof")
	if "--north-proof-check" in OS.get_cmdline_user_args() or "--north-reload-check" in OS.get_cmdline_user_args():
		call_deferred("activate")
		call_deferred("north_proof")
	if "--pairs-proof-check" in OS.get_cmdline_user_args() or "--pairs-reload-check" in OS.get_cmdline_user_args():
		call_deferred("activate")
		call_deferred("pairs_proof")

func activate() -> void:
	var editor=get_parent().get_parent()
	editor.get_node("Mode").select(4)
	editor.mode_changed(4)
	visible=true

func restore(value: Dictionary) -> void:
	state=value.duplicate(true)
	dirty=true
	refresh()

func commit(title: String, next: Dictionary) -> void:
	Model.sync_anchor_targets(next)
	var message:=Model.validate(next,seed)
	if not message.is_empty():$Status.text="ERROR: "+message;return
	if next==state:return
	history.create_action(title)
	history.add_do_method(restore.bind(next.duplicate(true)))
	history.add_undo_method(restore.bind(state.duplicate(true)))
	history.commit_action()

func values() -> Array:
	var joint: String=seed.canonical.joint_names[selected]
	var parameter: int=$Parameter.selected
	var scope: int=$Scope.selected
	if parameter==3:return state.base_pose.root_translation_m
	if scope==2:
		var correction: Dictionary=Model.lens(state,view).joints.get(joint,{})
		if parameter==1:return [correction.get("length_multiplier",1.0),0,0]
		return correction.get("rotation_delta" if parameter==0 else "local_offset_delta",[0,0,0])
	if scope==0:return state.base_pose.local_rotation_vectors[selected]
	if parameter==1:return [Model.vec(state.geometry.local_offsets_m[selected]).length(),0,0]
	return state.geometry.local_offsets_m[selected]

func refresh() -> void:
	if state.is_empty():return
	updating=true
	Model.sync_anchor_targets(state)
	$Joint.select(selected);$View.select(Model.ORDER.find(view))
	$Canvas.selected=selected;$Canvas.active_view=view
	$Canvas.paired_joint=joint_pairs.get(selected,-1)
	$Canvas.editing_mode=editing_mode
	$Canvas.configure(state)
	var scope: int=$Scope.selected
	$Parameter.set_item_disabled(0,scope==1)
	$Parameter.set_item_disabled(1,scope==0)
	$Parameter.set_item_disabled(2,scope==0)
	$Parameter.set_item_disabled(3,scope!=0)
	if scope==0 and $Parameter.selected in [1,2]:$Parameter.select(0)
	if scope in [1,2] and $Parameter.selected==3:$Parameter.select(2)
	if scope==1 and $Parameter.selected==0:$Parameter.select(2)
	$Parameter.disabled=scope==3
	var a:=values()
	var degrees: bool=$Parameter.selected==0 and scope in [0,2]
	for i in range(3):get_node(["X","Y","Z"][i]).value=rad_to_deg(a[i]) if degrees else a[i]
	$Y.editable=$Parameter.selected!=1 and scope!=3
	$Z.editable=$Parameter.selected!=1 and scope!=3
	$X.editable=scope!=3
	$Apply.disabled=scope==3
	var c: Dictionary=Model.camera(state,view)
	$Yaw.value=rad_to_deg(c.yaw);$Pitch.value=rad_to_deg(c.pitch);$Scale.value=c.pixels_per_metre
	var anchor: Dictionary=Model.anchor(state,view)
	$AnchorJoint.select(seed.canonical.joint_names.find(anchor.joint))
	$AnchorX.value=anchor.target_px[0];$AnchorY.value=anchor.target_px[1]
	$Enabled.button_pressed=Model.lens(state,view).enabled
	$CameraStatus.text="Camera: "+c.status+"\n"+("Reflected source basis: "+c.source_view+"; anatomical names retained" if c.mirror_x else "Independent source image")
	if Model.linked(state,view):$CameraStatus.text="Camera: linked NorthWest reflection\nEdit NorthWest or explicitly Detach NE"
	$Details.text="Rotation XYZ: axis-angle degrees, not Euler.\nOffsets: parent-local m. Length: incoming segment.\nRed: selected; violet: pair; blue: image anchor.\nWheel: zoom; middle drag: pan; double click: focus."
	$Undo.disabled=not history.has_undo();$Redo.disabled=not history.has_redo()
	$Status.text=("Unsaved changes | " if dirty else "Saved / baseline | ")+view+" | "+str(Model.lens(state,view).joints.size())+" corrected joints"+(" | Linked to NorthWest; edit source or Detach NE" if Model.linked(state,view) else "")
	$DetachNorth.disabled=not Model.linked(state,"north-east")
	for i in range($NorthProfile.item_count):
		if $NorthProfile.get_item_text(i)==state.get("north_profile","Provisional"):$NorthProfile.select(i)
	var locked:=Model.linked(state,view)
	for name in ["Apply","ApplyCamera","ApplyAnchor","ResetAnchor","ResetJoint","ResetView"]:get_node(name).disabled=locked or (name=="Apply" and scope==3)
	$AnchorJoint.disabled=locked
	$Enabled.disabled=locked
	$Canvas.anchor_tool=$AnchorTool.button_pressed and not locked
	for mode in Pairs.MODES:get_node("Edit"+mode).button_pressed=editing_mode==mode
	update_pair_info()
	updating=false

func input_value() -> Variant:
	var parameter: int=$Parameter.selected
	var v: Array=[$X.value,$Y.value,$Z.value]
	if parameter==0:v=[deg_to_rad(v[0]),deg_to_rad(v[1]),deg_to_rad(v[2])]
	return v[0] if parameter==1 else v

func select_editing_mode(mode: String) -> void:
	var error:=Settings.save_mode(settings_path,mode)
	if error!=OK:
		refresh();$Status.text="Cannot save editor preference: "+str(error);return
	editing_mode=mode
	refresh()

func segment_name(joint: int) -> String:
	var parent: int=seed.canonical.parents[joint]
	return (seed.canonical.joint_names[parent] if parent>=0 else "Root")+" -> "+seed.canonical.joint_names[joint]

func update_pair_info() -> void:
	var other: int=joint_pairs.get(selected,-1)
	$PairNames.text="No paired joint - editing selected joint only" if other<0 else seed.canonical.joint_names[selected]+" / "+seed.canonical.joint_names[other]+(" | selected only" if editing_mode=="Free" else " | inverse mirrored delta" if editing_mode=="Inverted" else " | mirrored delta")
	$PairPreview.text=""
	if $Scope.selected==3:return
	if $Parameter.selected==3:
		$PairNames.text="Pose root translation - independent in all modes"
		return
	var preview:=Pairs.edit(state,view,$Scope.selected,$Parameter.selected,selected,input_value(),editing_mode)
	if preview.has("error"):$PairPreview.text=preview.error;return
	if $Parameter.selected==1:
		$PairPreview.text=length_summary(state,preview.state,$Scope.selected,other)
	elif other>=0:
		var label: String="Mirrored change" if editing_mode=="Symmetric" else "Inverse mirrored change" if editing_mode=="Inverted" else "Paired joint stays unchanged"
		var after: Array=Pairs.field_value(preview.state,view,$Scope.selected,$Parameter.selected,other)
		if $Parameter.selected==0:after=after.map(func(x):return rad_to_deg(x))
		$PairPreview.text=label+"\n"+seed.canonical.joint_names[other]+": (%.3f, %.3f, %.3f)"%after

func length_summary(before: Dictionary, after: Dictionary, scope: int, other: int) -> String:
	var text: String="%s: %.4f -> %.4f m"%[segment_name(selected),Pairs.segment(before,view,scope,selected).length(),Pairs.segment(after,view,scope,selected).length()]
	if other>=0:text+="\n%s: %.4f -> %.4f m"%[segment_name(other),Pairs.segment(before,view,scope,other).length(),Pairs.segment(after,view,scope,other).length()]
	return text

func apply_parameter() -> void:
	if $Scope.selected==3:return
	var result:=Pairs.edit(state,view,$Scope.selected,$Parameter.selected,selected,input_value(),editing_mode)
	if result.has("error"):$Status.text="ERROR: "+result.error;return
	var summary: String=length_summary(state,result.state,$Scope.selected,result.partner) if $Parameter.selected==1 else ""
	commit("Edit "+$Scope.get_item_text($Scope.selected)+" / "+$Parameter.get_item_text($Parameter.selected)+" / "+editing_mode,result.state)
	if not summary.is_empty():$PairPreview.text=summary

func apply_camera() -> void:
	if Model.linked(state,view):$Status.text="Edit NorthWest or explicitly Detach NE first";return
	var next:=state.duplicate(true)
	next.cameras[view].yaw=deg_to_rad($Yaw.value)
	next.cameras[view].pitch=deg_to_rad($Pitch.value)
	next.cameras[view].pixels_per_metre=$Scale.value
	next.cameras[view].status="manually adjusted"
	commit("Edit view camera",next)

func apply_anchor() -> void:
	if Model.linked(state,view):$Status.text="Edit NorthWest or explicitly Detach NE first";return
	var next:=state.duplicate(true)
	Model.set_anchor_target(next,view,Vector2($AnchorX.value,$AnchorY.value))
	commit("Edit sprite anchor",next)

func save_session() -> bool:
	var message:=Model.save(save_path,state,seed)
	if not message.is_empty():$Status.text="ERROR: "+message;return false
	dirty=false;refresh();return true

func reload_session() -> void:
	if not FileAccess.file_exists(save_path):$Status.text="No saved session yet";return
	var loaded:=Model.load_session(save_path,seed)
	var message:=Model.validate(loaded,seed)
	if not message.is_empty():$Status.text="ERROR: "+message;return
	commit("Reload saved session",loaded)
	dirty=false;refresh()

func _unhandled_key_input(event: InputEvent) -> void:
	if not is_visible_in_tree() or not event is InputEventKey or not event.pressed:return
	if event.ctrl_pressed:
		if event.keycode==KEY_Z:history.undo();get_viewport().set_input_as_handled()
		if event.keycode==KEY_Y:history.redo();get_viewport().set_input_as_handled()
		if event.keycode==KEY_S:save_session();get_viewport().set_input_as_handled()

func proof() -> void:
	await preload("res://modules/character-rigging-editor/soma/rig_proof.gd").run(self)

func reload_proof() -> void:
	await preload("res://modules/character-rigging-editor/soma/rig_proof.gd").reload_run(self)

func north_proof() -> void:
	var proof_script=preload("res://modules/character-rigging-editor/soma/rig_north_proof.gd")
	if "--north-reload-check" in OS.get_cmdline_user_args():await proof_script.reload_run(self)
	else:await proof_script.run(self)

func pairs_proof() -> void:
	var proof_script=preload("res://modules/character-rigging-editor/soma/rig_pairs_proof.gd")
	if "--pairs-reload-check" in OS.get_cmdline_user_args():await proof_script.reload_run(self)
	else:await proof_script.run(self)
