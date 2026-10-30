extends RefCounted

const Model=preload("res://modules/character-rigging-editor/soma/rig_model.gd")
const PATH="res://modules/character-rigging-editor/soma/rig-editor/editor-settings.json"

static func load_mode(path: String) -> String:
	if not FileAccess.file_exists(path):return "Free"
	var data:=Model.read(path)
	assert(data.get("paired_editing") in ["Free","Symmetric","Inverted"],"Invalid paired editing preference: "+path)
	return data.paired_editing

static func save_mode(path: String, mode: String) -> Error:
	var file:=FileAccess.open(path+".tmp",FileAccess.WRITE)
	if file==null:return FileAccess.get_open_error()
	file.store_string(JSON.stringify({"paired_editing":mode},"  ")+"\n")
	file.close()
	return DirAccess.rename_absolute(path+".tmp",path)
