extends Node2D

var data: Dictionary
var bones: Array[Bone2D] = []
var chunks: Array[Polygon2D] = []
var current: Array = []
var effective_weights: Array=[]

func configure(pose_data: Dictionary) -> void:
	data = pose_data
	bones.clear()
	chunks.clear()
	for path in data.paths:
		bones.append(get_node("Skeleton2D/" + path))
	for name in data.bone_names:
		chunks.append(get_node(name))
	bind_rest()
	var tex := texture_file(data.texture)
	for b in range(12):
		var chunk := chunks[b]
		chunk.texture = tex
		chunk.polygon = vectors(data.vertices[b])
		chunk.uv = vectors(data.uvs[b])
		var triangles: Array[PackedInt32Array] = []
		for triangle in data.polygons[b]:
			triangles.append(PackedInt32Array(triangle))
		chunk.polygons = triangles
		chunk.z_index = int(data.z_order[b])
		chunk.modulate=Color.WHITE
	$Anatomy.texture = texture_file(data.anatomy)
	$Anatomy.z_index = 50
	rebind_weights()

func rebind_weights() -> void:
	effective_weights=data.weights.duplicate(true)
	for b in range(12):
		var chunk:=chunks[b]
		chunk.clear_bones()
		for c in range(12):
			var weights:=PackedFloat32Array()
			for row in effective_weights[b]:
				row[c]=lerpf(1.0 if c==b else 0.0,row[c],data.deformation[b])
				weights.append(row[c])
			chunk.add_bone(NodePath(data.paths[c]),weights)

static func vectors(values: Array) -> PackedVector2Array:
	var result := PackedVector2Array()
	for v in values:
		result.append(Vector2(v[0], v[1]))
	return result

func bind_rest() -> void:
	for i in range(12):
		var global_rest := Transform2D(float(data.angles[i]), Vector2(data.joints[i][0], data.joints[i][1]))
		var local_rest := global_rest
		var parent := int(data.parents[i])
		if parent >= 0:
			var parent_rest := Transform2D(float(data.angles[parent]), Vector2(data.joints[parent][0], data.joints[parent][1]))
			local_rest = parent_rest.affine_inverse() * global_rest
		bones[i].rest = local_rest
		bones[i].transform = local_rest
		bones[i].length = maxf(1.0, data.lengths[i])
	current = data.joints.duplicate(true)

func apply_frame(joints: Array, angles: Array) -> void:
	current = joints.duplicate(true)
	for i in range(12):
		var frame := Transform2D(float(angles[i]), Vector2(joints[i][0], joints[i][1]))
		var parent := int(data.parents[i])
		if parent >= 0:
			var parent_frame := Transform2D(float(angles[parent]), Vector2(joints[parent][0], joints[parent][1]))
			frame = parent_frame.affine_inverse() * frame
		bones[i].transform = frame

func switch_skin(index: int) -> void:
	for chunk in chunks:
		chunk.texture = texture_file(data.skins[index])

static func texture_file(path: String) -> ImageTexture:
	var image := Image.new()
	assert(image.load_png_from_buffer(FileAccess.get_file_as_bytes(path))==OK,"Cannot load PNG: "+path)
	return ImageTexture.create_from_image(image)
