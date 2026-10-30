extends RefCounted

const ORDER := ["south-west","south","south-east","north-west","north","north-east"]
const SEED := "res://modules/character-rigging-editor/soma/rig-editor/seed.json"
const SAVE := "res://modules/character-rigging-editor/soma/rig-editor/session.json"

static func vec(a: Array) -> Vector3:
	return Vector3(a[0],a[1],a[2])

static func array3(v: Vector3) -> Array:
	return [v.x,v.y,v.z]

static func rot(a: Array) -> Quaternion:
	var v := vec(a)
	return Quaternion.IDENTITY if v.length()<1e-12 else Quaternion(v.normalized(),v.length())

static func read(path: String) -> Dictionary:
	assert(FileAccess.file_exists(path),"Missing rig configuration: "+path)
	var value = JSON.parse_string(FileAccess.get_file_as_string(path))
	assert(value is Dictionary,"Invalid rig JSON: "+path)
	return value

static func valid_vector(a: Variant, count: int) -> bool:
	if not a is Array or a.size()!=count: return false
	for n in a:
		if not (n is float or n is int) or not is_finite(float(n)): return false
	return true

static func load_session(path: String, seed: Dictionary) -> Dictionary:
	var result:=read(path)
	assert(not result.has("canonical") and not result.has("images"),"Session must reference the immutable SOMA / image inventory")
	result.canonical=seed.canonical.duplicate(true)
	result.images=seed.images.duplicate(true)
	return result

static func validate(s: Dictionary, seed: Dictionary) -> String:
	if s.get("schema")!="soma-multiview-rig/1" or s.get("model_id")!=seed.model_id or s.get("baseline_fingerprint")!=seed.baseline_fingerprint: return "Wrong schema or South baseline identity"
	if s.get("character")!="Character1" or s.get("pose")!="idle":return "Only Character1 / Idle has calibrated inputs"
	if s.get("canonical")!=seed.canonical or s.get("images")!=seed.images: return "Immutable SOMA hierarchy or image inventory changed"
	if not s.get("geometry",{}).get("local_offsets_m") is Array or not s.get("base_pose",{}).get("local_rotation_vectors") is Array:return "Missing geometry or pose"
	if s.geometry.local_offsets_m.size()!=77 or s.base_pose.local_rotation_vectors.size()!=77:return "SOMA requires 77 joints"
	if not valid_vector(s.base_pose.get("root_translation_m"),3):return "Invalid Base Pose root translation"
	for i in range(77):
		if not valid_vector(s.geometry.local_offsets_m[i],3) or not valid_vector(s.base_pose.local_rotation_vectors[i],3):return "Non-finite joint transform"
	for view in ORDER:
		var c: Dictionary=s.get("cameras",{}).get(view,{})
		for key in ["yaw","pitch","pixels_per_metre"]:
			if not (c.get(key) is float or c.get(key) is int) or not is_finite(float(c[key])):return "Invalid camera: "+view
		if c.pixels_per_metre<=0 or c.has("tx") or c.has("ty"):return "Camera requires positive uniform scale; translation belongs to anchor"
		if c.get("mirror_x")!=seed.cameras[view].mirror_x or c.get("source_view")!=seed.cameras[view].source_view:return "Invalid reflection convention"
		var key: String="idle/"+view
		var a: Dictionary=s.get("anchors",{}).get(key,{})
		if a.get("joint") not in s.canonical.joint_names or not valid_vector(a.get("offset_px"),2) or not valid_vector(a.get("target_px"),2):return "Invalid sprite anchor: "+key
		var lens: Dictionary=s.get("overrides",{}).get(key,{})
		if not lens.get("enabled") is bool or not lens.get("joints") is Dictionary:return "Invalid view override: "+key
		for joint in lens.joints:
			if joint not in s.canonical.joint_names:return "Unknown override joint: "+joint
			var item: Dictionary=lens.joints[joint]
			for field in item:
				if field in ["rotation_delta","local_offset_delta"]:
					if not valid_vector(item[field],3):return "Invalid relative vector"
				elif field=="length_multiplier":
					if not (item[field] is float or item[field] is int) or not is_finite(float(item[field])) or item[field]<=0:return "Length multiplier must be positive"
				else:return "Unsupported override parameter: "+field
	return ""

static func world(s: Dictionary, view: String, use_lens: bool=true) -> Array:
	var m: Dictionary=s.canonical
	var lens: Dictionary=s.overrides["idle/"+view]
	var points: Array=[]
	var bases: Array=[]
	for i in range(77):
		var correction: Dictionary=lens.joints.get(m.joint_names[i],{}) if use_lens and lens.enabled else {}
		var offset := vec(s.geometry.local_offsets_m[i])*float(correction.get("length_multiplier",1.0))+vec(correction.get("local_offset_delta",[0,0,0]))
		var q: Array=m.local_quaternions_xyzw[i]
		var local := (Quaternion(q[0],q[1],q[2],q[3])*rot(s.base_pose.local_rotation_vectors[i])*rot(correction.get("rotation_delta",[0,0,0]))).normalized()
		var parent: int=m.parents[i]
		if parent<0:offset+=vec(s.base_pose.root_translation_m)
		points.append(offset if parent<0 else points[parent]+bases[parent]*offset)
		bases.append(local if parent<0 else (bases[parent]*local).normalized())
	return points

static func project_world(points: Array, cam: Dictionary) -> Array:
	var y: float=cam.yaw
	var p: float=cam.pitch
	var right := Vector3(cos(y),0,sin(y))
	var down := Vector3(-sin(p)*sin(y),-cos(p),sin(p)*cos(y))
	if cam.mirror_x:right=-right
	var out: Array=[]
	for v: Vector3 in points:out.append(Vector2(v.dot(right),v.dot(down))*float(cam.pixels_per_metre))
	return out

static func projection(s: Dictionary, view: String) -> Array:
	var points := project_world(world(s,view),s.cameras[view])
	var a: Array=s.anchors["idle/"+view].offset_px
	for i in range(points.size()):points[i]+=Vector2(a[0],a[1])
	return points

static func sync_anchor_targets(s: Dictionary) -> void:
	for view in ORDER:
		var a: Dictionary=s.anchors["idle/"+view]
		var p: Vector2=projection(s,view)[s.canonical.joint_names.find(a.joint)]
		a.target_px=[p.x,p.y]

static func set_anchor_target(s: Dictionary, view: String, target: Vector2) -> void:
	var a: Dictionary=s.anchors["idle/"+view]
	var p: Vector2=project_world(world(s,view),s.cameras[view])[s.canonical.joint_names.find(a.joint)]

	a.offset_px=[target.x-p.x,target.y-p.y]
	a.target_px=[target.x,target.y]

static func put_override(s: Dictionary, view: String, joint: String, field: String, value: Variant) -> void:
	var joints: Dictionary=s.overrides["idle/"+view].joints
	var item: Dictionary=joints.get(joint,{})
	var neutral: bool=is_equal_approx(float(value),1.0) if field=="length_multiplier" else vec(value).length()<1e-12
	if neutral:item.erase(field)
	else:item[field]=value
	if item.is_empty():joints.erase(joint)
	else:joints[joint]=item

static func save(path: String, state: Dictionary, seed: Dictionary) -> String:
	var message:=validate(state,seed)
	if not message.is_empty():return message
	var payload:=state.duplicate(true)
	sync_anchor_targets(payload)
	payload.erase("canonical")
	payload.erase("images")
	var file:=FileAccess.open(path+".tmp",FileAccess.WRITE)
	if file==null:return "Cannot write rig session: "+str(FileAccess.get_open_error())
	file.store_string(JSON.stringify(payload,"  ",true,true)+"\n")
	file.close()
	var error:=DirAccess.rename_absolute(path+".tmp",path)
	return "" if error==OK else "Cannot replace rig session: "+str(error)
