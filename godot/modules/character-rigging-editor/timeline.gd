extends HSlider

signal marker_moved(kind: String, index: int, normalized_time: float)
var marks: Array=[]
var switch_marks: Array=[]
var selected_part := 0
var dragged := ""
var dragged_index := -1

func _draw() -> void:
	for t in marks:
		var x:=8.0+float(t)*(size.x-16)
		draw_colored_polygon(PackedVector2Array([Vector2(x,0),Vector2(x+5,5),Vector2(x,10),Vector2(x-5,5)]),Color("ffce63"))
	for t in switch_marks:
		var x:=8.0+float(t)*(size.x-16)
		draw_line(Vector2(x,12),Vector2(x,28),Color("ee9afe"),2)

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
		if not event.pressed:
			dragged=""
			return
		if event.position.y<12:
			for i in range(2,marks.size()):
				if absf(event.position.x-(8+float(marks[i])*(size.x-16)))<8:
					dragged="key"
					dragged_index=i-2
		else:
			var index:=0 if switch_marks.size()==1 else selected_part
			if index<switch_marks.size() and absf(event.position.x-(8+float(switch_marks[index])*(size.x-16)))<8:
				dragged="switch"
				dragged_index=index
	if event is InputEventMouseMotion and not dragged.is_empty():
		var t:=clampf((event.position.x-8)/maxf(1,size.x-16),.00001,.99999)
		marker_moved.emit(dragged,dragged_index,t)
		accept_event()
