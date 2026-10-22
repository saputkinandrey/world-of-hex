extends "res://modules/character-animation-workbench/tests/walk-acceptance.gd"

const COMPARISON = preload("res://modules/character-animation-workbench/tests/comparison-preview.tscn")

func _run() -> void:
	var scene: Node = COMPARISON.instantiate()
	scene.autoplay = false
	root.add_child(scene)
	await scene.preview_ready
	await process_frame
	var manifest: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://modules/character-animation-workbench/masks/profiles.json"))
	var palette: Dictionary = {}
	for bone: String in manifest.bones:
		var rgb: Array = manifest.bones[bone]
		palette[Color.from_rgba8(int(rgb[0]), int(rgb[1]), int(rgb[2])).to_html(false)] = bone
	for view: String in scene.VIEWS:
		var workbench: Node2D = scene.get_node("Viewport/" + view)
		var surface: Polygon2D = workbench._active_rig.get_node("Layers/BodyBase/Surface")
		var owners: Image = Image.load_from_file(surface.ownership_mask_path)
		var source: Image = surface.texture.get_image()
		var size: Vector2i = surface.get_meta("frame_size")
		var cell_triangles: PackedInt32Array = surface.get_meta("cell_triangle_indices")
		var parents: Dictionary = {}
		for index: int in surface.get_bone_count():
			var path: String = str(surface.get_bone_path(index))
			parents[path.get_file()] = path.get_base_dir().get_file()
		var joints: int = 0
		var contacts: int = 0
		var disconnected: int = 0
		var glued_contacts: int = 0
		for y: int in size.y:
			for x: int in size.x:
				if source.get_pixel(x,y).a < .5:
					continue
				for offset: Vector2i in [Vector2i.RIGHT, Vector2i.DOWN]:
					var next: Vector2i = Vector2i(x,y) + offset
					if next.x >= size.x or next.y >= size.y or source.get_pixelv(next).a < .5:
						continue
					var a: String = palette[owners.get_pixel(x,y).to_html(false)]
					var b: String = palette[owners.get_pixelv(next).to_html(false)]
					if a == b:
						continue
					var related: bool = parents[a] == b or parents[b] == a
					var cell: int = (y*size.x+x)*2
					var neighbor: int = (next.y*size.x+next.x)*2
					var first: PackedInt32Array = surface.polygons[cell_triangles[cell]]
					var second: PackedInt32Array = surface.polygons[cell_triangles[cell+1]]
					var n_first: PackedInt32Array = surface.polygons[cell_triangles[neighbor]]
					var n_second: PackedInt32Array = surface.polygons[cell_triangles[neighbor+1]]
					var edge: PackedInt32Array = [first[1],first[2],n_first[0],n_second[2]] if offset == Vector2i.RIGHT else [second[2],first[2],n_first[0],n_first[1]]
					if not related:
						contacts += 1
						if edge[0] == edge[2] and edge[1] == edge[3]:
							glued_contacts += 1
						continue
					joints += 1
					if edge[0] != edge[2] or edge[1] != edge[3]:
						disconnected += 1
		_check(disconnected == 0, view + ": anatomical joints share vertices without extruded pixel strips")
		_check(glued_contacts == 0, view + ": unrelated body contacts cannot weld both edge endpoints")
		print("Finite joints %s: %s joint edges, %s contacts, %s disconnected joints, %s glued contacts." % [view,joints,contacts,disconnected,glued_contacts])
	scene.free()
	quit(1 if _failures else 0)
