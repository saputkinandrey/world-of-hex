extends SceneTree

const ROOT: String = "res://modules/character-animation-workbench/"
const SAMPLE_RATE: int = 120

func _initialize() -> void:
	var variants: Array = []
	for filename: String in ["locomotion.tres","bounce-2.tres","bounce-4.tres"]:
		var design: Resource = load(ROOT+"animations/design/"+filename)
		var profiles: Dictionary = {}
		for view: String in design.direction_gains:
			var gain: Vector3 = design.direction_gains[view]
			profiles[view] = [gain.x,gain.y,gain.z]
		var entry: Dictionary = {"main":filename == "locomotion.tres","amplitude":design.run_bounce,"walk_bounce":design.walk_bounce,"walk_baseline":design.walk_baseline,"run_baseline":design.run_baseline,"profiles":profiles,"clips":[]}
		for name: StringName in design.poses.get_animation_list():
			var animation: Animation = design.poses.get_animation(name)
			var count: int = roundi(animation.length*SAMPLE_RATE)
			var poses: Array = []
			for frame: int in count+1:
				var sample: Dictionary = {}
				for track: int in animation.get_track_count():
					var value: Variant = animation.value_track_interpolate(track,animation.length*frame/count)
					sample[str(animation.track_get_path(track))] = [value.x,value.y] if value is Vector2 else value
				poses.append(sample)
			entry.clips.append({"name":str(name),"duration":animation.length,"loop":animation.loop_mode != Animation.LOOP_NONE,"support":animation.get_meta("stance_fraction"),"stride":animation.get_meta("stride"),"poses":poses})
		variants.append(entry)
	var file: FileAccess = FileAccess.open("res://../tmp/animation-workbench/motion-design-samples.json",FileAccess.WRITE)
	if file == null:
		push_error("Cannot write sampled motion designs: "+error_string(FileAccess.get_open_error()))
		quit(1)
		return
	file.store_string(JSON.stringify(variants))
	print("Sampled editable Animation resources: three bounce variants, four views, eight clips.")
	quit()
