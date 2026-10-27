extends Control

signal joint_moved(index: int, point: Vector2)
signal joint_selected(index: int)
var rig: Node2D
var zoom_value := 4.0
var pan := Vector2.ZERO
var selected := 0
var dragging := false
var panning := false
var show_skeleton := true
var show_grid := false
var show_mesh := false
var show_chunks := false
var dark := true
var render_view: SubViewport
var show_seams := false
var overlay_rigs: Array=[]

func image_origin() -> Vector2:
	var native_size:=Vector2(render_view.size) if render_view else Vector2(150,150)
	return size / 2.0 - native_size/2.0 * zoom_value + pan

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO,size), Color("20242c") if dark else Color("b8bcc4"))
	if rig == null or rig.data.is_empty():
		return
	var origin := image_origin()
	if render_view:
		draw_texture_rect(render_view.get_texture(),Rect2(origin,Vector2(render_view.size)*zoom_value),false)
	if show_grid:
		for x in range(151):
			draw_line(origin+Vector2(x,0)*zoom_value,origin+Vector2(x,150)*zoom_value,Color(1,1,1,.10))
		for y in range(151):
			draw_line(origin+Vector2(0,y)*zoom_value,origin+Vector2(150,y)*zoom_value,Color(1,1,1,.10))
	for target in ([rig] if overlay_rigs.is_empty() else overlay_rigs):
		if target.visible and not target.data.is_empty(): draw_overlay(origin,target)

func draw_overlay(origin: Vector2, target: Node2D) -> void:
	if show_mesh or show_chunks or show_seams:
		for b in range(12):
			var chunk: Polygon2D = target.chunks[b]
			if chunk.modulate.a==0: continue
			if show_mesh:
				for p in chunk.polygons:
					for j in range(3):
						draw_skin_edge(target,origin,b,p[j],p[(j+1)%3],Color(0,1,1,.22))
			if show_chunks or show_seams:
				for edge in target.data.edges[b]:
					if show_chunks or edge[2]:
						draw_skin_edge(target,origin,b,int(edge[0]),int(edge[1]),Color("ff5f85") if edge[2] else Color("6fffe0"))
	if show_skeleton and (target==rig or target.name in ["SWSource","NWSource"]):
		for i in range(12):
			var p := origin + (Vector2(target.current[i][0],target.current[i][1])+target.position)*zoom_value
			var parent := int(target.data.parents[i])
			if parent >= 0:
				draw_line(origin+(Vector2(target.current[parent][0],target.current[parent][1])+target.position)*zoom_value,p,Color("6fffe0"),2)
			draw_circle(p,5 if i==selected else 3,Color("ffce63") if i==selected else Color.WHITE)

func _gui_input(event: InputEvent) -> void:
	if rig == null:
		return
	if event is InputEventMouseButton:
		if event.button_index in [MOUSE_BUTTON_WHEEL_UP,MOUSE_BUTTON_WHEEL_DOWN] and event.pressed:
			zoom_value = clampf(zoom_value * (2 if event.button_index==MOUSE_BUTTON_WHEEL_UP else .5),2,32)
			queue_redraw()
		if event.button_index == MOUSE_BUTTON_MIDDLE:
			panning = event.pressed
		if event.button_index == MOUSE_BUTTON_LEFT:
			dragging = false
			if event.pressed:
				for i in range(12):
					if (image_origin()+(Vector2(rig.current[i][0],rig.current[i][1])+rig.position)*zoom_value).distance_to(event.position)<10:
						selected=i
						dragging=true
						joint_selected.emit(i)
						break
	if event is InputEventMouseMotion:
		if panning:
			pan += event.relative
		if dragging:
			joint_moved.emit(selected,(event.position-image_origin())/zoom_value-rig.position)
		queue_redraw()

func draw_skin_edge(target: Node2D, origin: Vector2, chunk: int, a: int, b: int, color: Color) -> void:
	draw_line(origin+deformed(target,chunk,a)*zoom_value,origin+deformed(target,chunk,b)*zoom_value,color)

func deformed(target: Node2D, chunk: int, index: int) -> Vector2:
	var point:=Vector2.ZERO
	for bone in range(12):
		var weight: float=target.effective_weights[chunk][index][bone]
		if weight==0: continue
		var transform: Transform2D=target.global_transform.affine_inverse()*target.bones[bone].global_transform*target.bones[bone].get_skeleton_rest().affine_inverse()
		point+=transform*target.chunks[chunk].polygon[index]*weight
	return point+target.position
