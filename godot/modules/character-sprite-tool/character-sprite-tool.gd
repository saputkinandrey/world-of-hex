extends Control

@onready var _preview: CharacterSpriteEntity = $PreviewOrigin/CharacterSpriteEntity
@onready var _spawn_option: OptionButton = $Controls/SpawnOption
@onready var _sprite_offset_x_input: SpinBox = $OffsetControls/OffsetsGrid/SpriteOffsetX
@onready var _sprite_offset_y_input: SpinBox = $OffsetControls/OffsetsGrid/SpriteOffsetY
@onready var _sprite_scale_input: SpinBox = $OffsetControls/OffsetsGrid/SpriteScale
@onready var _formation_reference_offset_x_input: SpinBox = $OffsetControls/OffsetsGrid/FormationReferenceOffsetX
@onready var _formation_reference_offset_y_input: SpinBox = $OffsetControls/OffsetsGrid/FormationReferenceOffsetY
@onready var _formation_reference_scale_input: SpinBox = $OffsetControls/OffsetsGrid/FormationReferenceScale
@onready var _formation_reference_toggle: CheckButton = $OffsetControls/OffsetsGrid/FormationReferenceToggle
@onready var _face_offset_x_input: SpinBox = $OffsetControls/OffsetsGrid/FaceOffsetX
@onready var _face_offset_y_input: SpinBox = $OffsetControls/OffsetsGrid/FaceOffsetY
@onready var _headwear_offset_x_input: SpinBox = $OffsetControls/OffsetsGrid/HeadwearOffsetX
@onready var _headwear_offset_y_input: SpinBox = $OffsetControls/OffsetsGrid/HeadwearOffsetY
@onready var _helmet_offset_x_input: SpinBox = $OffsetControls/OffsetsGrid/HelmetOffsetX
@onready var _helmet_offset_y_input: SpinBox = $OffsetControls/OffsetsGrid/HelmetOffsetY
@onready var _weapon_offset_x_input: SpinBox = $OffsetControls/OffsetsGrid/WeaponOffsetX
@onready var _weapon_offset_y_input: SpinBox = $OffsetControls/OffsetsGrid/WeaponOffsetY
@onready var _clothing_offset_x_input: SpinBox = $OffsetControls/OffsetsGrid/ClothingOffsetX
@onready var _clothing_offset_y_input: SpinBox = $OffsetControls/OffsetsGrid/ClothingOffsetY
@onready var _weapon_type_option: OptionButton = $Controls/WeaponTypeOption
@onready var _weapon_type_secondary_option: OptionButton = $Controls/WeaponTypeSecondaryOption
@onready var _weapon_sheet_label: Label = $WeaponFrameMapControls/WeaponSheetLabel
@onready var _weapon_frame_count_input: SpinBox = $WeaponFrameMapControls/WeaponFrameMapGrid/WeaponFrameCount
@onready var _musket_frame_input: SpinBox = $WeaponFrameMapControls/WeaponFrameMapGrid/MusketFrame
@onready var _cutlass_left_frame_input: SpinBox = $WeaponFrameMapControls/WeaponFrameMapGrid/CutlassLeftFrame
@onready var _cutlass_right_frame_input: SpinBox = $WeaponFrameMapControls/WeaponFrameMapGrid/CutlassRightFrame
@onready var _pistol_left_frame_input: SpinBox = $WeaponFrameMapControls/WeaponFrameMapGrid/PistolLeftFrame
@onready var _pistol_right_frame_input: SpinBox = $WeaponFrameMapControls/WeaponFrameMapGrid/PistolRightFrame
@onready var _weapon_z_index_input: SpinBox = $Controls/LayerControlsGrid/WeaponZIndex

var _is_syncing_offset_inputs: bool = false
var _is_syncing_weapon_frame_map_inputs: bool = false
var _is_syncing_layer_z_inputs: bool = false

func _ready() -> void:
	_sync_weapon_type_options()
	_sync_offset_inputs()
	_sync_weapon_frame_map_inputs()
	_sync_layer_z_inputs()

func _on_pose_selected(index: int) -> void:
	_preview.pose = index
	_sync_weapon_type_options()
	_sync_offset_inputs()
	_sync_weapon_frame_map_inputs()
	_sync_layer_z_inputs()

func _on_direction_selected(index: int) -> void:
	_preview.direction = index
	_sync_weapon_type_options()
	_sync_offset_inputs()
	_sync_weapon_frame_map_inputs()
	_sync_layer_z_inputs()

func _on_spawn_selected(index: int) -> void:
	_preview.spawn = index
	_sync_offset_inputs()

func _on_skin_color_selected(index: int) -> void:
	_preview.skin_color = index

func _on_hair_color_selected(index: int) -> void:
	_preview.hair_color = index

func _on_hair_style_selected(index: int) -> void:
	_preview.hair_style = index

func _on_eyebrow_color_selected(index: int) -> void:
	_preview.eyebrow_color = index

func _on_beard_color_selected(index: int) -> void:
	_preview.beard_color = index

func _on_beard_style_selected(index: int) -> void:
	_preview.beard_style = index

func _on_mustache_color_selected(index: int) -> void:
	_preview.mustache_color = index

func _on_mustache_style_selected(index: int) -> void:
	_preview.mustache_style = index

func _on_sideburns_color_selected(index: int) -> void:
	_preview.sideburns_color = index

func _on_sideburns_style_selected(index: int) -> void:
	_preview.sideburns_style = index

func _on_eye_bandage_color_selected(index: int) -> void:
	_preview.eye_bandage_color = index

func _on_eye_color_selected(index: int) -> void:
	_preview.eye_color = index

func _on_bandana_color_selected(index: int) -> void:
	_preview.bandana_color = index

func _on_tricorn_color_selected(index: int) -> void:
	_preview.tricorn_color = index

func _on_head_bandage_color_selected(index: int) -> void:
	_preview.head_bandage_color = index

func _on_helmet_variant_selected(index: int) -> void:
	_preview.helmet_variant = index

func _on_headwear_selected(index: int) -> void:
	_preview.headwear = index

func _on_armor_variant_selected(index: int) -> void:
	_preview.armor_variant = index

func _on_uniform_color_selected(index: int) -> void:
	_preview.uniform_color = index

func _on_shirt_color_selected(index: int) -> void:
	_preview.shirt_color = index

func _on_pants_color_selected(index: int) -> void:
	_preview.pants_color = index

func _on_boots_color_selected(index: int) -> void:
	_preview.boots_color = index

func _on_weapon_type_selected(index: int) -> void:
	_preview.weapon_type = index

func _on_weapon_type_secondary_selected(index: int) -> void:
	_preview.weapon_type_secondary = index

func _on_weapon_frame_count_changed(value: float) -> void:
	if _is_syncing_weapon_frame_map_inputs:
		return

	_preview.set_current_weapon_frame_count(int(value))
	_sync_weapon_frame_map_inputs()

func _on_musket_frame_changed(value: float) -> void:
	_set_weapon_frame(CharacterSpriteEntity.WeaponType.MUSKET, value)

func _on_cutlass_left_frame_changed(value: float) -> void:
	_set_weapon_frame(CharacterSpriteEntity.WeaponType.CUTLASS_LEFT, value)

func _on_cutlass_right_frame_changed(value: float) -> void:
	_set_weapon_frame(CharacterSpriteEntity.WeaponType.CUTLASS_RIGHT, value)

func _on_pistol_left_frame_changed(value: float) -> void:
	_set_weapon_frame(CharacterSpriteEntity.WeaponType.PISTOL_LEFT, value)

func _on_pistol_right_frame_changed(value: float) -> void:
	_set_weapon_frame(CharacterSpriteEntity.WeaponType.PISTOL_RIGHT, value)

func _on_face_offset_x_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_face_offset()
	offset.x = value
	_preview.set_current_face_offset(offset)

func _on_face_offset_y_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_face_offset()
	offset.y = value
	_preview.set_current_face_offset(offset)

func _on_headwear_offset_x_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_headwear_offset()
	offset.x = value
	_preview.set_current_headwear_offset(offset)

func _on_headwear_offset_y_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_headwear_offset()
	offset.y = value
	_preview.set_current_headwear_offset(offset)

func _on_helmet_offset_x_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_helmet_offset()
	offset.x = value
	_preview.set_current_helmet_offset(offset)

func _on_helmet_offset_y_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_helmet_offset()
	offset.y = value
	_preview.set_current_helmet_offset(offset)

func _on_weapon_offset_x_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_weapon_offset()
	offset.x = value
	_preview.set_current_weapon_offset(offset)

func _on_weapon_offset_y_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_weapon_offset()
	offset.y = value
	_preview.set_current_weapon_offset(offset)

func _on_clothing_offset_x_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_clothing_offset()
	offset.x = value
	_preview.set_current_clothing_offset(offset)

func _on_clothing_offset_y_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_clothing_offset()
	offset.y = value
	_preview.set_current_clothing_offset(offset)

func _on_sprite_offset_x_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_sprite_offset()
	offset.x = value
	_preview.set_current_sprite_offset(offset)

func _on_sprite_offset_y_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_current_sprite_offset()
	offset.y = value
	_preview.set_current_sprite_offset(offset)

func _on_sprite_scale_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	_preview.set_sprite_scale(value)

func _on_show_formation_reference_toggled(value: bool) -> void:
	if _is_syncing_offset_inputs:
		return

	_preview.set_show_formation_reference(value)

func _on_formation_reference_offset_x_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_formation_reference_offset()
	offset.x = value
	_preview.set_formation_reference_offset(offset)

func _on_formation_reference_offset_y_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	var offset: Vector2 = _preview.get_formation_reference_offset()
	offset.y = value
	_preview.set_formation_reference_offset(offset)

func _on_formation_reference_scale_changed(value: float) -> void:
	if _is_syncing_offset_inputs:
		return

	_preview.set_formation_reference_scale(value)

func _sync_offset_inputs() -> void:
	_is_syncing_offset_inputs = true

	_spawn_option.selected = int(_preview.spawn)

	var sprite_offset: Vector2 = _preview.get_current_sprite_offset()
	_sprite_offset_x_input.value = sprite_offset.x
	_sprite_offset_y_input.value = sprite_offset.y
	_sprite_scale_input.value = _preview.get_sprite_scale()

	var formation_reference_offset: Vector2 = _preview.get_formation_reference_offset()
	_formation_reference_offset_x_input.value = formation_reference_offset.x
	_formation_reference_offset_y_input.value = formation_reference_offset.y
	_formation_reference_scale_input.value = _preview.get_formation_reference_scale()
	_formation_reference_toggle.button_pressed = _preview.get_show_formation_reference()

	var face_offset: Vector2 = _preview.get_current_face_offset()
	_face_offset_x_input.value = face_offset.x
	_face_offset_y_input.value = face_offset.y

	var headwear_offset: Vector2 = _preview.get_current_headwear_offset()
	_headwear_offset_x_input.value = headwear_offset.x
	_headwear_offset_y_input.value = headwear_offset.y

	var helmet_offset: Vector2 = _preview.get_current_helmet_offset()
	_helmet_offset_x_input.value = helmet_offset.x
	_helmet_offset_y_input.value = helmet_offset.y

	var weapon_offset: Vector2 = _preview.get_current_weapon_offset()
	_weapon_offset_x_input.value = weapon_offset.x
	_weapon_offset_y_input.value = weapon_offset.y

	var clothing_offset: Vector2 = _preview.get_current_clothing_offset()
	_clothing_offset_x_input.value = clothing_offset.x
	_clothing_offset_y_input.value = clothing_offset.y

	_is_syncing_offset_inputs = false

func _sync_weapon_frame_map_inputs() -> void:
	_is_syncing_weapon_frame_map_inputs = true

	var weapon_frame_count: int = _preview.get_current_weapon_frame_count()
	var max_frame_index: int = max(0, weapon_frame_count - 1)
	_weapon_frame_count_input.value = weapon_frame_count
	_musket_frame_input.max_value = max_frame_index
	_cutlass_left_frame_input.max_value = max_frame_index
	_cutlass_right_frame_input.max_value = max_frame_index
	_pistol_left_frame_input.max_value = max_frame_index
	_pistol_right_frame_input.max_value = max_frame_index
	_musket_frame_input.editable = _preview.is_current_weapon_type_supported(CharacterSpriteEntity.WeaponType.MUSKET)
	_cutlass_left_frame_input.editable = _preview.is_current_weapon_type_supported(CharacterSpriteEntity.WeaponType.CUTLASS_LEFT)
	_cutlass_right_frame_input.editable = _preview.is_current_weapon_type_supported(CharacterSpriteEntity.WeaponType.CUTLASS_RIGHT)
	_pistol_left_frame_input.editable = _preview.is_current_weapon_type_supported(CharacterSpriteEntity.WeaponType.PISTOL_LEFT)
	_pistol_right_frame_input.editable = _preview.is_current_weapon_type_supported(CharacterSpriteEntity.WeaponType.PISTOL_RIGHT)

	_weapon_sheet_label.text = _preview.get_current_weapon_sheet_path()
	_musket_frame_input.value = _preview.get_current_weapon_frame_for_type(CharacterSpriteEntity.WeaponType.MUSKET)
	_cutlass_left_frame_input.value = _preview.get_current_weapon_frame_for_type(CharacterSpriteEntity.WeaponType.CUTLASS_LEFT)
	_cutlass_right_frame_input.value = _preview.get_current_weapon_frame_for_type(CharacterSpriteEntity.WeaponType.CUTLASS_RIGHT)
	_pistol_left_frame_input.value = _preview.get_current_weapon_frame_for_type(CharacterSpriteEntity.WeaponType.PISTOL_LEFT)
	_pistol_right_frame_input.value = _preview.get_current_weapon_frame_for_type(CharacterSpriteEntity.WeaponType.PISTOL_RIGHT)

	_is_syncing_weapon_frame_map_inputs = false

func _sync_weapon_type_options() -> void:
	_sync_weapon_type_option(_weapon_type_option)
	_sync_weapon_type_option(_weapon_type_secondary_option)

func _sync_weapon_type_option(option: OptionButton) -> void:
	option.set_item_disabled(CharacterSpriteEntity.WeaponType.MUSKET, not _preview.is_current_weapon_type_supported(CharacterSpriteEntity.WeaponType.MUSKET))
	option.set_item_disabled(CharacterSpriteEntity.WeaponType.CUTLASS_LEFT, not _preview.is_current_weapon_type_supported(CharacterSpriteEntity.WeaponType.CUTLASS_LEFT))
	option.set_item_disabled(CharacterSpriteEntity.WeaponType.CUTLASS_RIGHT, not _preview.is_current_weapon_type_supported(CharacterSpriteEntity.WeaponType.CUTLASS_RIGHT))
	option.set_item_disabled(CharacterSpriteEntity.WeaponType.PISTOL_LEFT, not _preview.is_current_weapon_type_supported(CharacterSpriteEntity.WeaponType.PISTOL_LEFT))
	option.set_item_disabled(CharacterSpriteEntity.WeaponType.PISTOL_RIGHT, not _preview.is_current_weapon_type_supported(CharacterSpriteEntity.WeaponType.PISTOL_RIGHT))

func _set_weapon_frame(selected_weapon_type: int, value: float) -> void:
	if _is_syncing_weapon_frame_map_inputs:
		return

	_preview.set_current_weapon_frame_for_type(selected_weapon_type, int(value))

func _on_show_body_toggled(value: bool) -> void:
	_preview.show_body = value

func _on_show_boots_toggled(value: bool) -> void:
	_preview.show_boots = value

func _on_show_pants_toggled(value: bool) -> void:
	_preview.show_pants = value

func _on_show_shirts_toggled(value: bool) -> void:
	_preview.show_shirts = value

func _on_show_hair_toggled(value: bool) -> void:
	_preview.show_hair = value

func _on_show_beard_toggled(value: bool) -> void:
	_preview.show_beard = value

func _on_show_mustache_toggled(value: bool) -> void:
	_preview.show_mustache = value

func _on_show_sideburns_toggled(value: bool) -> void:
	_preview.show_sideburns = value

func _on_show_armor_toggled(value: bool) -> void:
	_preview.show_armor = value

func _on_show_eye_bandage_toggled(value: bool) -> void:
	_preview.show_eye_bandage = value

func _on_show_eyes_toggled(value: bool) -> void:
	_preview.show_eyes = value

func _on_show_eyebrows_toggled(value: bool) -> void:
	_preview.show_eyebrows = value

func _on_show_headwear_toggled(value: bool) -> void:
	_preview.show_headwear = value

func _on_show_head_bandage_toggled(value: bool) -> void:
	_preview.show_head_bandage = value

func _on_show_weapon_toggled(value: bool) -> void:
	_preview.show_weapon = value

func _on_body_z_index_changed(value: float) -> void:
	_set_layer_z_index("Body", value)

func _on_boots_z_index_changed(value: float) -> void:
	_set_layer_z_index("Boots", value)

func _on_pants_z_index_changed(value: float) -> void:
	_set_layer_z_index("Pants", value)

func _on_shirts_z_index_changed(value: float) -> void:
	_set_layer_z_index("Shirts", value)

func _on_hair_z_index_changed(value: float) -> void:
	_set_layer_z_index("Hair", value)

func _on_beard_z_index_changed(value: float) -> void:
	_set_layer_z_index("Beard", value)

func _on_mustache_z_index_changed(value: float) -> void:
	_set_layer_z_index("Mustache", value)

func _on_sideburns_z_index_changed(value: float) -> void:
	_set_layer_z_index("Sideburns", value)

func _on_armor_z_index_changed(value: float) -> void:
	_set_layer_z_index("Armor", value)

func _on_eye_bandage_z_index_changed(value: float) -> void:
	_set_layer_z_index("EyeBandage", value)

func _on_eyes_z_index_changed(value: float) -> void:
	_set_layer_z_index("Eyes", value)

func _on_eyebrows_z_index_changed(value: float) -> void:
	_set_layer_z_index("Eyebrows", value)

func _on_headwear_z_index_changed(value: float) -> void:
	_set_layer_z_index("Headwear", value)

func _on_head_bandage_z_index_changed(value: float) -> void:
	_set_layer_z_index("HeadBandage", value)

func _on_weapon_z_index_changed(value: float) -> void:
	if _is_syncing_layer_z_inputs:
		return

	_preview.set_current_weapon_z_index(int(value))

func _sync_layer_z_inputs() -> void:
	_is_syncing_layer_z_inputs = true
	_weapon_z_index_input.value = _preview.get_current_weapon_z_index()
	_is_syncing_layer_z_inputs = false

func _set_layer_z_index(layer_node_name: String, value: float) -> void:
	var layer: Sprite2D = _preview.get_node(layer_node_name) as Sprite2D
	layer.z_index = int(value)
