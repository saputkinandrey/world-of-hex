extends RefCounted

const ROOT := "res://modules/character-rigging-editor/"
const Motion = preload("res://modules/character-rigging-editor/motion.gd")
var resources: Dictionary={}
var changed: Dictionary={}
var transition: Dictionary={}
var source: Dictionary={}
var target: Dictionary={}
var frame: Dictionary={}

func resource(path: String) -> Dictionary:
	if not resources.has(path):
		assert(FileAccess.file_exists(ROOT+path),"Missing resource: "+path)
		var parsed=JSON.parse_string(FileAccess.get_file_as_string(ROOT+path))
		assert(parsed is Dictionary,"Invalid JSON: "+path)
		resources[path]=parsed
	return resources[path]

func pose(name: String, view: String) -> Dictionary:
	return resource("poses/"+view+"/"+name+".json")

func open_transition(name: String, view: String) -> void:
	transition=resource("transitions/"+view+"/"+name+".json")
	source=pose(transition.source,view)
	target=pose(transition.target,view)

func evaluate(seconds: float) -> Dictionary:
	frame=Motion.sample(transition,source,target,seconds)
	return frame

func mark_pose(data: Dictionary) -> void:
	changed["poses/"+data.direction+"/"+data.pose+".json"]=true

func mark_transition() -> void:
	changed["transitions/"+transition.direction+"/"+transition.id+".json"]=true

func save_all() -> void:
	for path in changed:
		var file:=FileAccess.open(ROOT+path,FileAccess.WRITE)
		assert(file!=null,"Cannot save: "+path)
		file.store_string(JSON.stringify(resources[path],"  ",true,true)+"\n")
	changed.clear()

func add_key(seconds: float) -> bool:
	var t:=seconds/float(transition.duration)
	if t<=0.00001 or t>=.99999:
		return false
	for key in transition.keys:
		if absf(float(key.time)-t)<.00001:
			key.joints=frame.joints.duplicate(true)
			key.angles=frame.angles.duplicate(true)
			mark_transition()
			return true
	transition.keys.append({"time":t,"joints":frame.joints.duplicate(true),"angles":frame.angles.duplicate(true)})
	transition.keys.sort_custom(func(a,b): return a.time<b.time)
	mark_transition()
	return true
