extends SceneTree

const Adapter = preload("res://modules/character-animation-workbench/source-adapter.gd")
const SETTINGS_PATH = "res://modules/character-animation-workbench/source-settings.tres"
const CATALOG_PATH = "res://modules/character-animation-workbench/base-catalog.tres"

func _initialize() -> void:
	call_deferred("_import_source")

func _import_source() -> void:
	var settings: Resource = load(SETTINGS_PATH)
	var catalog: Resource = Resource.new()
	var snapshots: Dictionary = {}
	var outfits: Dictionary = settings.get_meta("outfits")
	for outfit: String in outfits:
		# Instantiation of an existing, explicitly authored scene; no generated node tree.
		var original: Node = Adapter.SOURCE_SCENE.instantiate()
		var source: CharacterSpriteEntity = Adapter.source_entity(original)
		var overrides: Dictionary = outfits[outfit]
		for property: String in overrides:
			if not property in source:
				push_error("Unknown source property: %s" % property)
				original.free()
				quit(1)
				return
			source.set(property, overrides[property])
		root.add_child(original)
		for pose: int in source.Pose.values():
			source.pose = pose
			for direction: int in source.Direction.values():
				source.direction = direction
				snapshots["%s:%s:%s" % [outfit, pose, direction]] = Adapter.capture(source)
		original.free()
	catalog.set_meta("snapshots", snapshots)
	catalog.set_meta("outfits", PackedStringArray(outfits.keys()))
	catalog.set_meta("poses", PackedStringArray(CharacterSpriteEntity.Pose.keys()))
	catalog.set_meta("directions", PackedStringArray(CharacterSpriteEntity.Direction.keys()))
	catalog.set_meta("source", Adapter.SOURCE_SCENE.resource_path)
	catalog.set_meta("source_hash", FileAccess.get_sha256(Adapter.SOURCE_SCENE.resource_path))
	var result: Error = ResourceSaver.save(catalog, CATALOG_PATH)
	if result != OK:
		push_error("Cannot save base catalog: %s" % error_string(result))
		quit(1)
		return
	print("Imported %s compositions from saved compatibility scene." % snapshots.size())
	quit()
