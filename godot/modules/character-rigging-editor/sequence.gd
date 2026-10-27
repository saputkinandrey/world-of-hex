extends Node

const Session = preload("res://modules/character-rigging-editor/session.gd")
const Motion = preload("res://modules/character-rigging-editor/motion.gd")
var sessions: Array=[]
var sequence: Dictionary={}
var previous_segment := -1
var views: Array=[]
var single_view := "Both"
@onready var rigs: Array=[$"../Comparison/SWSource",$"../Comparison/SWTarget",$"../Comparison/NWSource",$"../Comparison/NWTarget"]

func setup(shared: Dictionary) -> void:
	var loader:=Session.new()
	loader.resources=shared
	sequence=loader.resource("sequences/demo.json")
	views=sequence.directions
	sessions.clear()
	for view in views:
		var session:=Session.new()
		session.resources=shared
		sessions.append(session)
	previous_segment=-1

func duration() -> float:
	var total:=0.0
	for interval in sequence.intervals:
		total+=float(interval)
	return total

func locate(seconds: float) -> Dictionary:
	var elapsed:=0.0
	for i in range(sequence.transitions.size()):
		var length:=float(sequence.intervals[i])
		if seconds<elapsed+length or i==sequence.transitions.size()-1:
			return {"index":i,"fraction":clampf((seconds-elapsed)/length,0,1)}
		elapsed+=length
	return {}

func present(seconds: float, tint: bool=false) -> Array:
	var location:=locate(seconds)
	if int(location.index)!=previous_segment:
		for i in range(views.size()):
			sessions[i].open_transition(sequence.transitions[location.index],views[i])
			rigs[i*2].configure(sessions[i].source)
			rigs[i*2+1].configure(sessions[i].target)
		previous_segment=int(location.index)
	var frames: Array=[]
	for i in range(views.size()):
		var frame: Dictionary=sessions[i].evaluate(float(location.fraction)*float(sessions[i].transition.duration))
		Motion.render_pair(rigs[i*2],rigs[i*2+1],frame,tint)
		frames.append(frame)
		var shown: bool=single_view=="Both" or single_view==views[i]
		rigs[i*2].visible=shown
		rigs[i*2+1].visible=shown
		var offset: Vector2=Vector2(150*i,0) if single_view=="Both" else Vector2.ZERO
		rigs[i*2].position=offset
		rigs[i*2+1].position=offset
	if views.size()==1:
		rigs[2].visible=false
		rigs[3].visible=false
	return frames
