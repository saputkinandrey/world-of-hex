extends RefCounted

static func rest_frame(pose: Dictionary) -> Dictionary:
	var points: Array=[]
	var root := Vector2(pose.joints[0][0],pose.joints[0][1])
	var offset := Vector2(pose.root_offset[0],pose.root_offset[1]) + Vector2(75,90) - root
	for p in pose.joints:
		points.append([p[0]+offset.x,p[1]+offset.y])
	return {"joints":points,"angles":pose.angles.duplicate(),"time":0.0}

static func curve(t: float, interpolation: String) -> float:
	match interpolation:
		"Ease In": return t*t
		"Ease Out": return 1.0-(1.0-t)*(1.0-t)
		"Ease In-Out": return t*t*(3.0-2.0*t)
	return t

static func sample(transition: Dictionary, source: Dictionary, target: Dictionary, seconds: float) -> Dictionary:
	var t := clampf(seconds / float(transition.duration),0,1)
	var first := rest_frame(source)
	var last := rest_frame(target)
	last.time=1.0
	var keys: Array=[first]
	keys.append_array(transition.keys)
	keys.append(last)
	keys.sort_custom(func(a,b): return a.time<b.time)
	var a: Dictionary=first
	var b: Dictionary=last
	for i in range(keys.size()-1):
		if t>=float(keys[i].time) and t<=float(keys[i+1].time):
			a=keys[i]
			b=keys[i+1]
			break
	var u := curve((t-float(a.time))/maxf(.000001,float(b.time)-float(a.time)),transition.interpolation)
	var points: Array=[]
	var angles: Array=[]
	for i in range(12):
		points.append([lerpf(a.joints[i][0],b.joints[i][0],u),lerpf(a.joints[i][1],b.joints[i][1],u)])
		angles.append(lerp_angle(a.angles[i],b.angles[i],u))
	var alpha: Array=[]
	for i in range(12):
		var schedule: Dictionary=transition.parts[i] if transition.switch_mode=="Per part" else transition.whole
		alpha.append(texture_alpha(t,schedule))
	return {"joints":points,"angles":angles,"alpha":alpha,"time":t}

static func texture_alpha(t: float, schedule: Dictionary) -> float:
	if t<=0: return 0.0
	if t>=1: return 1.0
	var duration:=float(schedule.blend_duration) if schedule.blend_enabled else 0.0
	if duration<=0:
		return 1.0 if t>=float(schedule.switch_time) else 0.0
	var start:=maxf(0,float(schedule.switch_time)-duration/2)
	var end:=minf(1,float(schedule.switch_time)+duration/2)
	return clampf((t-start)/maxf(.000001,end-start),0,1)

static func render_pair(source_rig: Node2D, target_rig: Node2D, frame: Dictionary, tint: bool=false) -> void:
	source_rig.apply_frame(frame.joints,frame.angles)
	target_rig.apply_frame(frame.joints,frame.angles)
	var colors: Dictionary={"idle":Color(.2,.5,1),"walk":Color(1,.5,.1),"aim-pistol":Color(.2,1,.4)}
	for i in range(12):
		var a: Color=colors[source_rig.data.pose] if tint else Color.WHITE
		var b: Color=colors[target_rig.data.pose] if tint else Color.WHITE
		a.a=1.0-frame.alpha[i]
		b.a=frame.alpha[i]
		source_rig.chunks[i].modulate=a
		target_rig.chunks[i].modulate=b
