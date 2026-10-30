extends Control

signal joint_selected(index: int, view: String)
signal view_selected(view: String)
signal anchor_started
signal anchor_moved(view: String, target: Vector2)
signal anchor_finished

const Model=preload("res://modules/character-rigging-editor/soma/rig_model.gd")
const MAIN=preload("res://modules/character-rigging-editor/soma/canvas.gd").MAIN
var state: Dictionary={}
var textures: Dictionary={}
var masks: Dictionary={}
var projections: Dictionary={}
var selected:=0
var paired_joint:=-1
var editing_mode:="Free"
var active_view:="south-west"
var full:=false
var show_masks:=false
var skeleton:=true
var anchor_tool:=false
var focused:=""
var zoom:=1.0
var pans: Dictionary={}
var dragging:=""
var panning:=""
var last_hit:=-1

func configure(value: Dictionary) -> void:
	state=value
	if textures.is_empty():
		for view in Model.ORDER:
			var item: Dictionary=state.images[view]
			textures[view]=load_image(item.source,item.mirror_x)
			masks[view]=load_image(item.chunks,item.mirror_x)
			pans[view]=Vector2.ZERO
	for view in Model.ORDER:projections[view]=Model.projection(state,view)
	queue_redraw()

func load_image(path: String, mirror: bool) -> ImageTexture:
	var image:=Image.new()
	assert(image.load_png_from_buffer(FileAccess.get_file_as_bytes(path))==OK,"Required sprite missing: "+path)
	if mirror:image.flip_x()
	return ImageTexture.create_from_image(image)

func cell(view: String) -> Rect2:
	if not focused.is_empty():return Rect2(Vector2(6,6),size-Vector2(12,12)) if focused==view else Rect2()
	var index: int=Model.ORDER.find(view)
	var extent:=Vector2(size.x/3,size.y/2)
	return Rect2(Vector2(index%3,index/3)*extent+Vector2(4,4),extent-Vector2(8,8))

func image_transform(view: String) -> Transform2D:
	var r:=cell(view)
	var native: Vector2=textures[view].get_size()
	var fit:=INF
	for name in Model.ORDER:
		var extent: Vector2=textures[name].get_size()
		fit=minf(fit,minf((r.size.x-22)/extent.x,(r.size.y-75)/extent.y))
	var z: float=fit*zoom
	var origin: Vector2=r.position+Vector2(r.size.x/2,(r.size.y+35)/2)-native*z/2+pans[view]
	return Transform2D(0,Vector2(z,z),0,origin)

func hit_view(p: Vector2) -> String:
	for view in Model.ORDER:
		if cell(view).has_point(p):return view
	return ""

func _draw() -> void:
	if state.is_empty():return
	var font:=ThemeDB.fallback_font
	for view in Model.ORDER:
		var r:=cell(view)
		if r.size==Vector2.ZERO:continue
		draw_rect(r,Color("1d2633"))
		draw_rect(r,Color("6cd4fa") if view==active_view else Color("39495b"),false,2)
		var image: Dictionary=state.images[view]
		var lens: Dictionary=Model.lens(state,view)
		var cam: Dictionary=Model.camera(state,view)
		var status: String="linked NW" if Model.linked(state,view) else "derived" if not image.independent else "provisional" if "provisional" in cam.status else "working" if "working" in cam.status else "manual" if "manual" in cam.status else "calibrated"
		var header: String=view+" | "+status
		draw_string(font,r.position+Vector2(9,20),header,HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color("cee4f5"))
		draw_string(font,r.position+Vector2(9,40),"Lens %s: %d joint(s)"%["ON" if lens.enabled else "OFF",lens.joints.size()],HORIZONTAL_ALIGNMENT_LEFT,-1,12,Color("a9b7c8"))
		var t:=image_transform(view)
		draw_set_transform_matrix(t)
		draw_texture(textures[view],Vector2.ZERO)
		if show_masks:draw_texture(masks[view],Vector2.ZERO,Color(1,1,1,.35))
		if skeleton:
			var p: Array=projections[view]
			var names: Array=state.canonical.joint_names
			for i in range(77):
				if not full and names[i] not in MAIN and i!=selected and i!=paired_joint:continue
				var parent: int=state.canonical.parents[i]
				var related: bool=i==selected or parent==selected or state.canonical.parents[selected]==i
				var color:=Color("ffd26b") if related else Color("61d9cd")
				if i==paired_joint:color=Color("c392ff")
				if parent>=0:
					if names[i].ends_with("Shoulder"):draw_dashed_line(p[parent],p[i],color,1.0,2.0)
					else:draw_line(p[parent],p[i],color,1.1,true)
				var filled: bool=i!=paired_joint or editing_mode!="Free"
				draw_circle(p[i],2.5 if i==selected or i==paired_joint else 1.3,Color("ff627e") if i==selected else color,filled,-1.0 if filled else 1.0)
		var a: Dictionary=Model.anchor(state,view)
		var target:=Vector2(a.target_px[0],a.target_px[1])
		draw_circle(target,4.0,Color("8bb3ff"),false,1.1)
		draw_line(target-Vector2(6,0),target+Vector2(6,0),Color("8bb3ff"),.8)
		draw_line(target-Vector2(0,6),target+Vector2(0,6),Color("8bb3ff"),.8)
		draw_set_transform_matrix(Transform2D.IDENTITY)
		var caption: String=state.canonical.joint_names[selected]+(" / "+state.canonical.joint_names[paired_joint] if paired_joint>=0 else "")
		draw_string(font,r.position+Vector2(9,r.size.y-9),caption,HORIZONTAL_ALIGNMENT_LEFT,r.size.x-18,12,Color("ffd26b"))

func _gui_input(event: InputEvent) -> void:
	if state.is_empty():return
	if event is InputEventMouseButton:
		var view:=hit_view(event.position)
		if event.button_index==MOUSE_BUTTON_LEFT and not event.pressed and not dragging.is_empty():
			dragging="";anchor_finished.emit();accept_event();return
		if event.button_index==MOUSE_BUTTON_MIDDLE and not event.pressed:panning=""
		if view.is_empty():return
		if event.pressed and event.button_index in [MOUSE_BUTTON_WHEEL_UP,MOUSE_BUTTON_WHEEL_DOWN]:
			var before: Vector2=image_transform(view).affine_inverse()*event.position
			zoom=clampf(zoom*(1.15 if event.button_index==MOUSE_BUTTON_WHEEL_UP else 1/1.15),.4,8)
			pans[view]+=event.position-image_transform(view)*before
			queue_redraw();accept_event()
		if event.button_index==MOUSE_BUTTON_MIDDLE and event.pressed:panning=view;accept_event()
		if event.button_index==MOUSE_BUTTON_LEFT and event.pressed:
			active_view=view;view_selected.emit(view)
			if Model.linked(state,view):anchor_tool=false
			if event.double_click and not anchor_tool:
				focused="" if focused==view else view;queue_redraw();accept_event();return
			var native: Vector2=image_transform(view).affine_inverse()*event.position
			if anchor_tool:
				dragging=view;anchor_started.emit();anchor_moved.emit(view,native)
			else:
				var candidates: Array=[]
				for i in range(77):
					if (full or state.canonical.joint_names[i] in MAIN or i==selected or i==paired_joint) and (image_transform(view)*projections[view][i]).distance_to(event.position)<10:candidates.append(i)
				if not candidates.is_empty():
					selected=candidates[(candidates.find(last_hit)+1)%candidates.size()];last_hit=selected
					joint_selected.emit(selected,view)
			queue_redraw();accept_event()
	if event is InputEventMouseMotion:
		if not dragging.is_empty():anchor_moved.emit(dragging,image_transform(dragging).affine_inverse()*event.position);accept_event()
		if not panning.is_empty():pans[panning]+=event.relative;queue_redraw();accept_event()
