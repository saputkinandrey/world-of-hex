extends Control

signal joint_moved(index: int, point: Vector2)
signal joint_selected(index: int)
var data: Dictionary={}
var model: Dictionary={}
var patch: Dictionary={}
var source: ImageTexture
var chunks: ImageTexture
var layer:=0
var step_index:=0
var selected_joint:=0
var selected_chunk:=1
var zoom:=4.0
var pan:=Vector2(110,40)
var dragging:=-1

static func point(value: Array) -> Vector2:
	return Vector2(value[0],value[1])

func configure(value: Dictionary, skeleton: Dictionary, edits: Dictionary) -> void:
	data=value
	model=skeleton
	patch=edits
	var root: String="res://modules/character-rigging-editor/soma/assets/"+data.key+"/"
	source=texture(root+"source.png")
	chunks=texture(root+"chunks.png")
	zoom=4.0
	pan=Vector2(80,35)
	queue_redraw()

static func texture(path: String) -> ImageTexture:
	var image:=Image.new()
	var error:=image.load_png_from_buffer(FileAccess.get_file_as_bytes(path))
	assert(error==OK,"Required native PNG unreadable: "+path)
	return ImageTexture.create_from_image(image)

func screen(value: Array) -> Vector2:
	return pan+point(value)*zoom

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO,size),Color("151b24"))
	if data.is_empty() or source==null: return
	var native:=Vector2(source.get_size())
	draw_texture_rect(chunks if layer==1 else source,Rect2(pan,native*zoom),false)
	if layer==1:
		var chunk: Dictionary=data.chunks[selected_chunk-1]
		for landmark in chunk.get("landmarks",[]):
			draw_circle(screen(landmark),4,Color.YELLOW)
	if layer>=2:
		if data.has("projected_joints"):
			var points: Array=data.canonical_projection if layer==3 else data.projected_joints
			if layer==2:
				draw_skeleton(data.projected_joints,Color(0.2,0.9,0.7,.25))
				var steps: Array=data.placement
				if not steps.is_empty():
					var step: Dictionary=steps[mini(step_index,steps.size()-1)]
					for name in step.after:
						var observed: Dictionary=step.after[name]
						draw_arc(screen(observed.point),minf(70,observed.heuristic_radius_px*zoom),0,TAU,32,Color("d5a944"),1.0)
						draw_circle(screen(observed.point),3,Color.YELLOW)
			else:
				draw_skeleton(points,Color("4adbc2") if layer!=3 else Color("f0bd58"))
				for c in data.get("constraints",[]):
					if c.conflict:
						var index: int=model.joint_names.find(c.joint)
						draw_line(screen(points[index]),screen(c.target),Color("f35d6b"),2)
			draw_3d()
		for name in patch.get("pins",{}):
			var pin:=screen(patch.pins[name])
			draw_line(pin-Vector2(5,0),pin+Vector2(5,0),Color.MAGENTA,2)
			draw_line(pin-Vector2(0,5),pin+Vector2(0,5),Color.MAGENTA,2)
	draw_string(ThemeDB.fallback_font,Vector2(12,22),"Native image: %d x %d | display zoom %.1fx"%[native.x,native.y,zoom],HORIZONTAL_ALIGNMENT_LEFT,-1,14,Color.WHITE)
	if layer>=5:
		draw_string(ThemeDB.fallback_font,Vector2(12,43),"Shared baseline geometry | camera / pose fitted first | select a bone for residuals",HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color("d5a944"))
	if data.has("geometry"):
		draw_string(ThemeDB.fallback_font,Vector2(12,size.y-22),"77 SOMA joints | red = conflicting interval | magenta = manual pin | grey = prior only",HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color.WHITE)

func draw_skeleton(points: Array, color: Color) -> void:
	for i in range(points.size()):
		var parent: int=model.parents[i]
		var prior: bool=data.get("joint_status",[]).size()==77 and data.joint_status[i].status=="canonical-prior-only"
		var tint:=Color(.6,.65,.75,.3) if prior else color
		if parent>=0: draw_line(screen(points[parent]),screen(points[i]),tint,1.4)
		if not prior: draw_circle(screen(points[i]),2.5,tint)
	draw_circle(screen(points[selected_joint]),5,Color.MAGENTA,false,1.5)

func draw_3d() -> void:
	var points: Array=model.rest_positions_m if layer==3 else data.spatial_joints_m
	var origin:=Vector2(size.x-130,430)
	draw_string(ThemeDB.fallback_font,origin+Vector2(-105,-270),"3D prior / fitted hypothesis",HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color("c5ccd8"))
	for i in range(points.size()):
		var parent: int=model.parents[i]
		if parent<0: continue
		var a: Array=points[parent]
		var b: Array=points[i]
		var ap:=origin+Vector2(a[0]*.85+a[2]*.5,-a[1]+a[2]*.25)*170
		var bp:=origin+Vector2(b[0]*.85+b[2]*.5,-b[1]+b[2]*.25)*170
		draw_line(ap,bp,Color("7696c9"),1.2)

func _gui_input(event: InputEvent) -> void:
	if data.is_empty(): return
	if event is InputEventMouseButton:
		if event.pressed and event.button_index in [MOUSE_BUTTON_WHEEL_UP,MOUSE_BUTTON_WHEEL_DOWN]:
			var old:=zoom
			zoom=clampf(zoom*(1.25 if event.button_index==MOUSE_BUTTON_WHEEL_UP else .8),1,20)
			pan=event.position-(event.position-pan)*(zoom/old)
			queue_redraw()
		if event.button_index==MOUSE_BUTTON_LEFT:
			if event.pressed and layer>=2 and layer!=3 and data.has("projected_joints"):
				var best:=20.0
				for i in range(77):
					var position: Array=patch.pins.get(model.joint_names[i],data.projected_joints[i])
					var distance:=screen(position).distance_to(event.position)
					if distance<best: best=distance; dragging=i
				if dragging>=0: joint_selected.emit(dragging)
			else: dragging=-1
	elif event is InputEventMouseMotion:
		if event.button_mask & MOUSE_BUTTON_MASK_MIDDLE:
			pan+=event.relative
			queue_redraw()
		elif dragging>=0 and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
			joint_moved.emit(dragging,(event.position-pan)/zoom)
