extends SceneTree

func _initialize() -> void:
	var catalog: Resource = load("res://modules/character-animation-workbench/base-catalog.tres")
	var snapshots: Dictionary = catalog.get_meta("snapshots")
	var layouts: Dictionary = {}
	for direction: int in 4:
		var snapshot: Dictionary = snapshots["Full layers:0:%s" % direction]
		var body: Dictionary = snapshot.layers.body
		var body_transform: Transform2D = Transform2D(body.rotation, body.scale, 0.0, body.position)
		var layers: Dictionary = {}
		var sizes: Dictionary = {}
		for slot: String in snapshot.layers:
			var state: Dictionary = snapshot.layers[slot]
			var relative: Transform2D = body_transform.affine_inverse() * Transform2D(state.rotation, state.scale, 0.0, state.position)
			layers[slot] = [relative.x.x, relative.x.y, relative.y.x, relative.y.y, relative.origin.x, relative.origin.y] if state.visible else [1, 0, 0, 1, 0, 0]
			var size: Vector2 = state.texture.get_size() / Vector2(state.hframes, state.vframes) if state.visible else body.texture.get_size() / Vector2(body.hframes, body.vframes)
			sizes[slot] = [size.x, size.y]
		layouts[str(direction)] = {"size": body.texture.get_width() / body.hframes, "layers": layers, "sizes": sizes}
	var file: FileAccess = FileAccess.open("res://../tmp/animation-workbench/rig-layouts.json", FileAccess.WRITE)
	file.store_string(JSON.stringify(layouts, "  "))
	quit()
