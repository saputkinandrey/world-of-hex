extends SceneTree
func _initialize() -> void:
 var result: Dictionary = {}
 for view: String in ["south","north","south-west","north-west"]:
  result[view] = {}
  var reset: Animation = load("res://../tmp/animation-workbench/expressive-reference/"+view+"/RESET.tres")
  for clip: String in ["walk_loop","run_loop"]:
   var animation: Animation = load("res://../tmp/animation-workbench/expressive-reference/"+view+"/"+clip+".tres")
   var samples: Array = []
   for frame: int in 121:
    var time: float = fposmod(frame/120.0+(.5 if view in ["north","north-west"] else 0.0),1.0)*animation.length
    var pose: Dictionary = {}
    for track: int in animation.get_track_count():
     var path: NodePath = animation.track_get_path(track)
     var name: String = path.get_name(path.get_name_count()-1)
     var property: String = path.get_subname(0)
     if not name in ["Pelvis","Spine","Chest","Head","ArmL","ForearmL","ArmR","ForearmR"]:
      continue
     var value: Variant = animation.value_track_interpolate(track,time)
     var rest_track: int = reset.find_track(path,Animation.TYPE_VALUE)
     var rest: Variant = reset.value_track_interpolate(rest_track,0.0)
     if value is Vector2:
      value -= rest
      pose[name+":"+property] = [value.x,value.y]
     else:
      pose[name+":"+property] = float(value)-float(rest)
    samples.append(pose)
   result[view][clip] = samples
 var file: FileAccess = FileAccess.open("res://../tmp/animation-workbench/expressive-reference/upper.json",FileAccess.WRITE)
 file.store_string(JSON.stringify(result))
 quit()
