extends RefCounted

const Model=preload("res://modules/character-rigging-editor/soma/rig_model.gd")
const PATH="res://modules/character-rigging-editor/soma/rig-editor/north-west-calibration.json"

static func apply_profile(state: Dictionary, name: String) -> Dictionary:
	var calibration:=Model.read(PATH)
	assert(calibration.model_id==state.model_id and calibration.baseline_fingerprint==state.baseline_fingerprint,"North profile baseline differs")
	var profile: Dictionary=calibration.profiles[name]
	var next:=state.duplicate(true)
	next.cameras["north-west"]=profile.camera.duplicate(true)
	next.anchors["idle/north-west"]=profile.anchor.duplicate(true)
	next.overrides["idle/north-west"]=profile.lens.duplicate(true)
	next.view_links=next.get("view_links",{}).duplicate(true)
	if name=="Provisional":
		next.view_links.erase("north-east")
		var seed:=Model.read(Model.SEED)
		next.cameras["north-east"]=seed.cameras["north-east"].duplicate(true)
		next.anchors["idle/north-east"]=seed.anchors["idle/north-east"].duplicate(true)
		next.overrides["idle/north-east"]=seed.overrides["idle/north-east"].duplicate(true)
	else:
		next.view_links["north-east"]="north-west"
		next.cameras["north-east"]=Model.camera(next,"north-east")
		next.anchors["idle/north-east"]=Model.anchor(next,"north-east")
		next.overrides["idle/north-east"]={"enabled":true,"joints":{}}
	next.north_profile=name
	return next
