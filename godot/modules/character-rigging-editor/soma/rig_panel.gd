extends Panel

const Model=preload("res://modules/character-rigging-editor/soma/rig_model.gd")
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
	state=seed.duplicate(true)
	if FileAccess.file_exists(save_path):
		var loaded:=Model.load_session(save_path,seed)
		var message:=Model.validate(loaded,seed)
		if not message.is_empty():$Status.text="ERROR: "+message;return
		state=loaded
	for name in seed.canonical.joint_names:$Joint.add_item(name);$AnchorJoint.add_item(name)
	for name in Model.ORDER:$View.add_item(name)
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
		var correction: Dictionary=state.overrides["idle/"+view].joints.get(joint,{})
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
	var c: Dictionary=state.cameras[view]
	$Yaw.value=rad_to_deg(c.yaw);$Pitch.value=rad_to_deg(c.pitch);$Scale.value=c.pixels_per_metre
	var anchor: Dictionary=state.anchors["idle/"+view]
	$AnchorJoint.select(seed.canonical.joint_names.find(anchor.joint))
	$AnchorX.value=anchor.target_px[0];$AnchorY.value=anchor.target_px[1]
	$Enabled.button_pressed=state.overrides["idle/"+view].enabled
	$CameraStatus.text="Camera: "+c.status+"\n"+("Reflected source basis: "+c.source_view+"; anatomical names retained" if c.mirror_x else "Independent source image")
	$Details.text="Selected: "+seed.canonical.joint_names[selected]+" | "+$Scope.get_item_text(scope)+"\n"+("Length X: multiplier (1 = base)." if scope==2 else "Geometry length X: metres.")+"\nRotation XYZ: axis-angle degrees. Offset: local metres.\nOrder: offset * length + delta; Qcanonical * Qbase * Qlens.\nBlue cross: anchor. Red: joint. Gold: parent / children.\nWheel: zoom. Middle drag: pan. Double click: focus.\nRepeated clicks cycle overlapping joints."
	$Undo.disabled=not history.has_undo();$Redo.disabled=not history.has_redo()
	$Status.text=("Unsaved changes | " if dirty else "Saved / baseline | ")+view+" | "+str(state.overrides["idle/"+view].joints.size())+" corrected joints"
	updating=false

func apply_parameter() -> void:
	var next:=state.duplicate(true)
	var parameter: int=$Parameter.selected
	var scope: int=$Scope.selected
	if scope==3:return
	var v: Array=[$X.value,$Y.value,$Z.value]
	if parameter==0:v=[deg_to_rad(v[0]),deg_to_rad(v[1]),deg_to_rad(v[2])]
	if scope==0:
		if parameter==3:next.base_pose.root_translation_m=v
		else:next.base_pose.local_rotation_vectors[selected]=v
	elif scope==1:
		if parameter==1:
			var offset:=Model.vec(next.geometry.local_offsets_m[selected])
			if offset.length()<1e-9 or v[0]<=0:$Status.text="ERROR: length requires a nonzero segment and positive metres";return
			next.geometry.local_offsets_m[selected]=Model.array3(offset.normalized()*float(v[0]))
		else:next.geometry.local_offsets_m[selected]=v
	else:Model.put_override(next,view,seed.canonical.joint_names[selected],["rotation_delta","length_multiplier","local_offset_delta"][parameter],v[0] if parameter==1 else v)
	commit("Edit "+$Scope.get_item_text(scope)+" / "+$Parameter.get_item_text(parameter),next)

func apply_camera() -> void:
	var next:=state.duplicate(true)
	next.cameras[view].yaw=deg_to_rad($Yaw.value)
	next.cameras[view].pitch=deg_to_rad($Pitch.value)
	next.cameras[view].pixels_per_metre=$Scale.value
	next.cameras[view].status="manually adjusted"
	commit("Edit view camera",next)

func apply_anchor() -> void:
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
