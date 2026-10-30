extends RefCounted

const Model=preload("res://modules/character-rigging-editor/soma/rig_model.gd")
const MODES: Array[String]=["Free","Symmetric","Inverted"]
const PAIRS: Array[Array]=[
	["LeftEye","RightEye"],
	["LeftShoulder","RightShoulder"],["LeftArm","RightArm"],
	["LeftForeArm","RightForeArm"],["LeftHand","RightHand"],
	["LeftHandThumb1","RightHandThumb1"],["LeftHandThumb2","RightHandThumb2"],
	["LeftHandThumb3","RightHandThumb3"],["LeftHandThumbEnd","RightHandThumbEnd"],
	["LeftHandIndex1","RightHandIndex1"],["LeftHandIndex2","RightHandIndex2"],
	["LeftHandIndex3","RightHandIndex3"],["LeftHandIndex4","RightHandIndex4"],["LeftHandIndexEnd","RightHandIndexEnd"],
	["LeftHandMiddle1","RightHandMiddle1"],["LeftHandMiddle2","RightHandMiddle2"],
	["LeftHandMiddle3","RightHandMiddle3"],["LeftHandMiddle4","RightHandMiddle4"],["LeftHandMiddleEnd","RightHandMiddleEnd"],
	["LeftHandRing1","RightHandRing1"],["LeftHandRing2","RightHandRing2"],
	["LeftHandRing3","RightHandRing3"],["LeftHandRing4","RightHandRing4"],["LeftHandRingEnd","RightHandRingEnd"],
	["LeftHandPinky1","RightHandPinky1"],["LeftHandPinky2","RightHandPinky2"],
	["LeftHandPinky3","RightHandPinky3"],["LeftHandPinky4","RightHandPinky4"],["LeftHandPinkyEnd","RightHandPinkyEnd"],
	["LeftLeg","RightLeg"],["LeftShin","RightShin"],["LeftFoot","RightFoot"],
	["LeftToeBase","RightToeBase"],["LeftToeEnd","RightToeEnd"]
]

static func pairing(model: Dictionary) -> Dictionary:
	var result: Dictionary={}
	for pair in PAIRS:
		var a: int=model.joint_names.find(pair[0])
		var b: int=model.joint_names.find(pair[1])
		assert(a>=0 and b>=0 and not result.has(a) and not result.has(b),"Invalid explicit SOMA pair: "+str(pair))
		result[a]=b;result[b]=a
	for joint in result:
		var a: int=model.parents[joint]
		var b: int=model.parents[result[joint]]
		assert(a==b or result.get(a,-2)==b,"SOMA pair parents differ: "+model.joint_names[joint])
	assert(model.joint_names.size()==77 and result.size()==68,"Pinned SOMA pair coverage changed")
	return result

static func quaternions(s: Dictionary, view: String, scope: int) -> Array:
	var result: Array=[]
	var records: Dictionary=Model.lens(s,view).joints if scope==2 else {}
	for i in range(77):
		var q: Array=s.canonical.local_quaternions_xyzw[i]
		var local: Quaternion=Quaternion(q[0],q[1],q[2],q[3]).normalized()*Model.rot(s.base_pose.local_rotation_vectors[i])
		# Stored lens orientation defines its editing coordinates even when disabled.
		if scope==2:local=local*Model.rot(records.get(s.canonical.joint_names[i],{}).get("rotation_delta",[0,0,0]))
		var parent: int=s.canonical.parents[i]
		result.append(local.normalized() if parent<0 else (result[parent]*local).normalized())
	return result

static func reflection(s: Dictionary, rotations: Array) -> Basis:
	var model: Dictionary=s.canonical
	var right: Vector3=(Model.vec(model.rest_positions_m[model.joint_names.find("RightArm")])-Model.vec(model.rest_positions_m[model.joint_names.find("LeftArm")])).normalized()
	var up: Vector3=(Vector3.UP-right*right.dot(Vector3.UP)).normalized()
	var bind_frame:=Basis(right,up,right.cross(up).normalized())
	var root: Array=model.local_quaternions_xyzw[0]
	var frame: Basis=Basis(rotations[0])*Basis(Quaternion(root[0],root[1],root[2],root[3]).normalized()).transposed()*bind_frame
	return frame*Basis(Vector3(-1,0,0),Vector3(0,1,0),Vector3(0,0,1))*frame.transposed()

static func field_value(s: Dictionary, view: String, scope: int, parameter: int, joint: int) -> Variant:
	if scope==0:return s.base_pose.root_translation_m if parameter==3 else s.base_pose.local_rotation_vectors[joint]
	if scope==1:return Model.vec(s.geometry.local_offsets_m[joint]).length() if parameter==1 else s.geometry.local_offsets_m[joint]
	var record: Dictionary=Model.lens(s,view).joints.get(s.canonical.joint_names[joint],{})
	if parameter==1:return record.get("length_multiplier",1.0)
	return record.get("rotation_delta" if parameter==0 else "local_offset_delta",[0,0,0])

static func segment(s: Dictionary, view: String, scope: int, joint: int) -> Vector3:
	var offset:=Model.vec(s.geometry.local_offsets_m[joint])
	if scope!=2:return offset
	var record: Dictionary=Model.lens(s,view).joints.get(s.canonical.joint_names[joint],{})
	return offset*float(record.get("length_multiplier",1.0))+Model.vec(record.get("local_offset_delta",[0,0,0]))

static func put(s: Dictionary, view: String, scope: int, parameter: int, joint: int, value: Variant) -> void:
	if scope==0:
		if parameter==3:s.base_pose.root_translation_m=value
		else:s.base_pose.local_rotation_vectors[joint]=value
	elif scope==1:
		s.geometry.local_offsets_m[joint]=Model.array3(Model.vec(s.geometry.local_offsets_m[joint]).normalized()*float(value)) if parameter==1 else value
	else:Model.put_override(s,view,s.canonical.joint_names[joint],["rotation_delta","length_multiplier","local_offset_delta"][parameter],value)

static func rotation_vector(q: Quaternion) -> Array:
	q=q.normalized()
	if q.w<0:q=-q
	var vector:=Vector3(q.x,q.y,q.z)
	if vector.length()<1e-10:return [0.,0.,0.]
	return Model.array3(vector.normalized()*(2*atan2(vector.length(),q.w)))

static func length_multiplier(s: Dictionary, view: String, joint: int, target: float) -> float:
	var g:=Model.vec(s.geometry.local_offsets_m[joint])
	var record: Dictionary=Model.lens(s,view).joints.get(s.canonical.joint_names[joint],{})
	var d:=Model.vec(record.get("local_offset_delta",[0,0,0]))
	var a:=g.length_squared()
	if a<1e-16:return -1
	var parallel:=g.dot(d)/a
	var radius_squared: float=(target*target-d.length_squared())/a+parallel*parallel
	if radius_squared<0:return -1
	var old: float=record.get("length_multiplier",1.0)
	var first: float=-parallel+sqrt(radius_squared)
	var second: float=-parallel-sqrt(radius_squared)
	if first<=0:return second if second>0 else -1
	if second<=0:return first
	return first if absf(first-old)<=absf(second-old) else second

static func edit(s: Dictionary, view: String, scope: int, parameter: int, selected: int, value: Variant, mode: String) -> Dictionary:
	if mode not in MODES:return {"error":"Unknown paired editing mode"}
	if scope not in [0,1,2] or parameter not in [0,1,2,3] or (scope==0 and parameter not in [0,3]) or (scope==1 and parameter not in [1,2]) or (scope==2 and parameter==3):return {"error":"Unsupported editing scope / parameter"}
	if scope==2 and Model.linked(s,view):return {"error":"Edit NorthWest or explicitly Detach NE first"}
	if parameter==1:
		if not is_finite(float(value)) or float(value)<=0 or segment(s,view,scope,selected).length()<1e-8:return {"error":"Length requires positive finite values and a nonzero segment"}
	elif not Model.valid_vector(value,3):return {"error":"Expected a finite XYZ vector"}
	var pairs:=pairing(s.canonical)
	var other: int=pairs.get(selected,-1)
	var next:=s.duplicate(true)
	put(next,view,scope,parameter,selected,value)
	if parameter==1 and segment(next,view,scope,selected).length()<1e-8:return {"error":"The resulting segment cannot have zero length"}
	if mode=="Free" or other<0 or parameter==3:return {"state":next,"partner":other}
	var old=field_value(s,view,scope,parameter,selected)
	var paired_old=field_value(s,view,scope,parameter,other)
	if parameter==1:
		var ratio: float=segment(next,view,scope,selected).length()/segment(s,view,scope,selected).length()
		if absf(ratio-1.0)<1e-8:return {"state":next,"partner":other}
		if mode=="Inverted":ratio=1.0/ratio
		var target: float=segment(s,view,scope,other).length()*ratio
		if target<1e-8:return {"error":"Paired segment must keep a positive length"}
		var paired_value: float=target if scope==1 else length_multiplier(s,view,other,target)
		if paired_value<=0:return {"error":"Paired length is unreachable with its existing offset; edit the offset first"}
		put(next,view,scope,parameter,other,paired_value)
	else:
		var rotations:=quaternions(s,view,scope)
		var mirror:=reflection(s,rotations)
		if parameter==2:
			if (Model.vec(value)-Model.vec(old)).length_squared()<1e-20:return {"state":next,"partner":other}
			var parent: int=s.canonical.parents[selected]
			var paired_parent: int=s.canonical.parents[other]
			var world_delta: Vector3=rotations[parent]*(Model.vec(value)-Model.vec(old))
			var paired_delta: Vector3=rotations[paired_parent].inverse()*(mirror*world_delta)
			if mode=="Inverted":paired_delta=-paired_delta
			put(next,view,scope,parameter,other,Model.array3(Model.vec(paired_old)+paired_delta))
		else:
			var delta: Quaternion=Model.rot(old).inverse()*Model.rot(value)
			if Vector3(delta.x,delta.y,delta.z).length()>1e-9:
				var source: Quaternion=rotations[selected]
				var world_delta: Quaternion=(source*delta*source.inverse()).normalized()
				var paired_delta:=Quaternion((mirror*Basis(world_delta)*mirror).orthonormalized()).normalized()
				if mode=="Inverted":paired_delta=paired_delta.inverse()
				var basis: Quaternion=rotations[other]
				put(next,view,scope,parameter,other,rotation_vector(Model.rot(paired_old)*basis.inverse()*paired_delta*basis))
	return {"state":next,"partner":other}
