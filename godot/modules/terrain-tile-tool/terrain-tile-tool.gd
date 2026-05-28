class_name TerrainTileTool
extends Control

const TILE_SIZE: Vector2i = Vector2i(110, 96)
const PREVIEW_SCALE: float = 2.0
const PAN_DRAG_THRESHOLD: float = 3.0
const TILE_LAYER_COUNT: int = 5
const FULL_PALETTE_COLUMNS: int = 2
const FULL_PALETTE_ROW_GAP: int = 4
const TRANSPARENT_MASK_SOURCE_PATH: String = "res://assets/hex-tileset/wht_hex.png"
const SOLID_MASK_SOURCE_PATH: String = "res://assets/hex-tileset/blck_hex.png"
const BLACK_WHITE_TILE_SOURCE_ID: int = 0
const TRANSPARENT_TILE_SOURCE_ID: int = 1
const SOLID_TILE_SOURCE_ID: int = 2
const FULL_TILE_SOURCE_ID_OFFSET: int = 3

const MASK_SOURCES: Array[Dictionary] = [
	{
		"name": "Black/White",
		"path": "res://assets/hex-tileset/blcknwht_hex.png",
	},
]

const TEXTURE_SOURCES: Array[Dictionary] = [
	{
		"name": "Drakkar deck",
		"path": "res://assets/Texture/Drakkar_deck_texture.png",
	},
	{
		"name": "Drakkar trum",
		"path": "res://assets/Texture/Drakkar_trum_texture.png",
	},
]

const FULL_TILE_SOURCES: Array[Dictionary] = [
	{
		"name": "Drakkar board",
		"path": "res://assets/hex-tileset/Drakkar_board.png",
	},
	{
		"name": "Drakkar board trum",
		"path": "res://assets/hex-tileset/Drakkar_board_trum.png",
	},
]

@onready var _texture_option: OptionButton = $Controls/TextureOption
@onready var _layer_option: OptionButton = $Controls/LayerOption
@onready var _full_tileset_option: OptionButton = $Controls/FullTilesetOption
@onready var _mask_option: OptionButton = $Controls/MaskOption
@onready var _mask_frame_input: SpinBox = $Controls/MaskFrameInput
@onready var _rotation_sides_input: SpinBox = $Controls/RotationSidesInput
@onready var _flip_horizontal_toggle: CheckButton = $Controls/FlipHorizontalToggle
@onready var _flip_vertical_toggle: CheckButton = $Controls/FlipVerticalToggle
@onready var _grid_width_input: SpinBox = $Controls/GridWidthInput
@onready var _grid_height_input: SpinBox = $Controls/GridHeightInput
@onready var _texture_offset_x_input: SpinBox = $Controls/TextureOffsetXInput
@onready var _texture_offset_y_input: SpinBox = $Controls/TextureOffsetYInput
@onready var _texture_scale_input: SpinBox = $Controls/TextureScaleInput
@onready var _canvas_root: Node2D = $CanvasRoot
@onready var _mask_tile_map: TileMapLayer = $CanvasRoot/MaskTileMap
@onready var _textured_shape_preview: TextureRect = $CanvasRoot/TexturedShapePreview
@onready var _canvas_input: ColorRect = $CanvasInput
@onready var _canvas_border_top: ColorRect = $CanvasBorderTop
@onready var _canvas_border_right: ColorRect = $CanvasBorderRight
@onready var _canvas_border_bottom: ColorRect = $CanvasBorderBottom
@onready var _canvas_border_left: ColorRect = $CanvasBorderLeft
@onready var _tileset_preview: TextureRect = $TilesetPreview
@onready var _tileset_palette_input: ColorRect = $TilesetPaletteInput
@onready var _palette_selection: ColorRect = $PaletteSelection
@onready var _full_tileset_preview: TextureRect = $FullTilesetPreview
@onready var _full_tileset_palette_input: ColorRect = $FullTilesetPaletteInput
@onready var _full_palette_selection: ColorRect = $FullPaletteSelection
@onready var _status_label: Label = $Controls/StatusLabel
@onready var _mask_overlay_toggle: CheckButton = $Controls/MaskOverlayToggle

var _mask_images: Array[Image] = []
var _transparent_mask_image: Image = null
var _solid_mask_image: Image = null
var _full_tile_images: Array[Image] = []
var _texture_images: Array[Image] = []
var _active_layer_index: int = 0
var _layer_cells: Array[Dictionary] = []
var _layer_textures: Array[int] = []
var _brush_mode: String = "mask"
var _full_brush_source_index: int = 0
var _last_output_image: Image = null
var _is_syncing_controls: bool = false
var _is_right_mouse_pressed: bool = false
var _is_panning_canvas: bool = false
var _right_mouse_press_position: Vector2 = Vector2.ZERO
var _last_pan_mouse_position: Vector2 = Vector2.ZERO

func _ready() -> void:
	_load_images()
	_setup_layers()
	_setup_options()
	_load_active_layer_to_tile_map()
	_sync_mask_frame_limits()
	_mask_tile_map.visible = _mask_overlay_toggle.button_pressed
	_update_canvas_size()
	_refresh_tileset_preview()
	_refresh_output_preview()

func _on_canvas_input_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event: InputEventMouseButton = event as InputEventMouseButton
		if _handle_rotation_wheel(mouse_event):
			return
		if _handle_canvas_mouse_button(mouse_event):
			return
	elif event is InputEventMouseMotion:
		_handle_canvas_mouse_motion(event as InputEventMouseMotion)

func _handle_canvas_mouse_button(mouse_event: InputEventMouseButton) -> bool:
	if mouse_event.button_index == MOUSE_BUTTON_RIGHT:
		if mouse_event.pressed:
			_is_right_mouse_pressed = true
			_is_panning_canvas = false
			_right_mouse_press_position = mouse_event.global_position
			_last_pan_mouse_position = mouse_event.global_position
		else:
			if not _is_panning_canvas:
				_handle_canvas_click(mouse_event)
			_is_right_mouse_pressed = false
			_is_panning_canvas = false
		return true

	if mouse_event.pressed and mouse_event.button_index == MOUSE_BUTTON_LEFT:
		_handle_canvas_click(mouse_event)
		return true

	return false

func _handle_canvas_mouse_motion(mouse_event: InputEventMouseMotion) -> void:
	if not _is_right_mouse_pressed:
		return

	if not _is_panning_canvas:
		var drag_distance: float = mouse_event.global_position.distance_to(_right_mouse_press_position)
		if drag_distance < PAN_DRAG_THRESHOLD:
			return
		_is_panning_canvas = true

	var delta: Vector2 = mouse_event.global_position - _last_pan_mouse_position
	_pan_canvas(delta)
	_last_pan_mouse_position = mouse_event.global_position

func _on_tileset_palette_input_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event: InputEventMouseButton = event as InputEventMouseButton
		if _handle_rotation_wheel(mouse_event):
			return
		if mouse_event.pressed and mouse_event.button_index == MOUSE_BUTTON_LEFT:
			_select_brush_frame_from_palette(_tileset_palette_input.get_local_mouse_position())

func _on_full_tileset_palette_input_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event: InputEventMouseButton = event as InputEventMouseButton
		if _handle_rotation_wheel(mouse_event):
			return
		if mouse_event.pressed and mouse_event.button_index == MOUSE_BUTTON_LEFT:
			_select_full_brush_frame_from_palette(_full_tileset_palette_input.get_local_mouse_position())

func _on_texture_selected(index: int) -> void:
	_layer_textures[_active_layer_index] = index
	_refresh_output_preview()

func _on_layer_selected(index: int) -> void:
	_save_active_tile_map_to_layer()
	_active_layer_index = index
	_load_active_layer_to_tile_map()
	_texture_option.select(_layer_textures[_active_layer_index])
	_status_label.text = "Editing layer %d" % (_active_layer_index + 1)
	_refresh_output_preview()

func _on_full_tileset_selected(index: int) -> void:
	_full_brush_source_index = index
	_refresh_tileset_preview()
	_refresh_full_tileset_preview()

func _on_mask_selected(index: int) -> void:
	if _is_syncing_controls:
		return
	_sync_mask_frame_limits()
	_refresh_tileset_preview()
	_update_palette_selection()

func _on_mask_frame_changed(value: float) -> void:
	if _is_syncing_controls:
		return
	_brush_mode = "mask"
	_update_palette_selection()

func _on_rotation_sides_changed(value: float) -> void:
	var normalized_rotation: int = posmod(int(value), 6)
	if int(value) != normalized_rotation:
		_rotation_sides_input.value = normalized_rotation
		return
	_status_label.text = "Brush rotation: %d sides" % normalized_rotation
	_refresh_tileset_preview()
	_refresh_full_tileset_preview()

func _on_flip_horizontal_toggled(toggled_on: bool) -> void:
	_refresh_tileset_preview()
	_refresh_full_tileset_preview()

func _on_flip_vertical_toggled(toggled_on: bool) -> void:
	_refresh_tileset_preview()
	_refresh_full_tileset_preview()

func _on_grid_width_changed(value: float) -> void:
	_update_canvas_size()
	_prune_cells_outside_grid()
	_refresh_output_preview()

func _on_grid_height_changed(value: float) -> void:
	_update_canvas_size()
	_prune_cells_outside_grid()
	_refresh_output_preview()

func _on_texture_offset_x_changed(value: float) -> void:
	_refresh_output_preview()

func _on_texture_offset_y_changed(value: float) -> void:
	_refresh_output_preview()

func _on_texture_scale_changed(value: float) -> void:
	_refresh_output_preview()

func _on_mask_overlay_toggled(toggled_on: bool) -> void:
	_mask_tile_map.visible = toggled_on

func _on_clear_all_pressed() -> void:
	_mask_tile_map.clear()
	for layer_index in TILE_LAYER_COUNT:
		_layer_cells[layer_index].clear()
	_status_label.text = ""
	_refresh_output_preview()

func _on_save_png_pressed() -> void:
	if _last_output_image == null:
		return

	var texture_name: String = String(TEXTURE_SOURCES[_texture_option.selected]["name"]).to_lower().replace(" ", "_")
	var save_path: String = "res://assets/hex-tileset/generated_%s_shape.png" % texture_name
	var error: Error = _last_output_image.save_png(save_path)
	if error != OK:
		_status_label.text = "Save failed: %s" % error_string(error)
		return
	_status_label.text = "Saved: %s" % save_path

func _load_images() -> void:
	_mask_images.clear()
	for source in MASK_SOURCES:
		_mask_images.append(_load_image(source["path"]))
	_transparent_mask_image = _load_image(TRANSPARENT_MASK_SOURCE_PATH)
	_solid_mask_image = _load_image(SOLID_MASK_SOURCE_PATH)

	_full_tile_images.clear()
	for source in FULL_TILE_SOURCES:
		_full_tile_images.append(_load_image(source["path"]))

	_texture_images.clear()
	for source in TEXTURE_SOURCES:
		_texture_images.append(_load_image(source["path"]))

func _setup_options() -> void:
	_layer_option.clear()
	for index in TILE_LAYER_COUNT:
		_layer_option.add_item("Layer %d" % (index + 1), index)

	_full_tileset_option.clear()
	for index in FULL_TILE_SOURCES.size():
		_full_tileset_option.add_item(FULL_TILE_SOURCES[index]["name"], index)

	_texture_option.clear()
	for index in TEXTURE_SOURCES.size():
		_texture_option.add_item(TEXTURE_SOURCES[index]["name"], index)

	_mask_option.clear()
	for index in MASK_SOURCES.size():
		_mask_option.add_item(MASK_SOURCES[index]["name"], index)

	_layer_option.select(0)
	_full_tileset_option.select(0)
	_texture_option.select(0)
	_mask_option.select(0)

func _setup_layers() -> void:
	_layer_cells.clear()
	_layer_textures.clear()
	for layer_index in TILE_LAYER_COUNT:
		_layer_cells.append({})
		_layer_textures.append(0)

func _sync_mask_frame_limits() -> void:
	_is_syncing_controls = true
	_mask_frame_input.max_value = max(0, _get_mask_frame_count(_mask_option.selected) - 1)
	_mask_frame_input.value = clampi(int(_mask_frame_input.value), 0, int(_mask_frame_input.max_value))
	_is_syncing_controls = false

func _refresh_tileset_preview() -> void:
	var mask_index: int = _mask_option.selected
	if mask_index < 0 or mask_index >= _mask_images.size():
		return
	var rotated_palette_image: Image = _build_rotated_palette_image(_mask_images[mask_index])
	var brush_palette_image: Image = _build_brush_palette_image(rotated_palette_image)
	_tileset_preview.texture = ImageTexture.create_from_image(brush_palette_image)
	_tileset_preview.size = Vector2(brush_palette_image.get_size())
	_tileset_palette_input.position = _tileset_preview.position
	_tileset_palette_input.size = _tileset_preview.size
	_update_palette_selection()
	_refresh_full_tileset_preview()

func _build_brush_palette_image(mask_palette_image: Image) -> Image:
	var palette_width: int = mask_palette_image.get_width() + TILE_SIZE.x * 2
	var palette_height: int = TILE_SIZE.y
	var palette_image: Image = Image.create(palette_width, palette_height, false, Image.FORMAT_RGBA8)
	palette_image.fill(Color(1, 1, 1, 0))
	_blit_tile_frame(_transparent_mask_image, palette_image, 0, 0)
	_blit_tile_frame(_solid_mask_image, palette_image, 0, TILE_SIZE.x)
	var target_x_offset: int = TILE_SIZE.x * 2
	for y in TILE_SIZE.y:
		for x in mask_palette_image.get_width():
			palette_image.set_pixel(target_x_offset + x, y, mask_palette_image.get_pixel(x, y))
	return palette_image

func _refresh_full_tileset_preview() -> void:
	if _full_tile_images.is_empty():
		return

	var source_image: Image = _full_tile_images[_full_brush_source_index]
	var frame_count: int = _get_full_tile_frame_count(_full_brush_source_index)
	var row_count: int = ceili(float(frame_count) / FULL_PALETTE_COLUMNS)
	var palette_height: int = TILE_SIZE.y * row_count + FULL_PALETTE_ROW_GAP * max(0, row_count - 1)
	var palette_image: Image = Image.create(TILE_SIZE.x * FULL_PALETTE_COLUMNS, palette_height, false, Image.FORMAT_RGBA8)
	palette_image.fill(Color(1, 1, 1, 0))
	var rotation_steps: int = int(_rotation_sides_input.value)
	var flip_horizontal: bool = _flip_horizontal_toggle.button_pressed
	var flip_vertical: bool = _flip_vertical_toggle.button_pressed
	var tile_center: Vector2 = Vector2(TILE_SIZE) * 0.5
	for frame_index in frame_count:
		var column: int = frame_index % FULL_PALETTE_COLUMNS
		var row: int = frame_index / FULL_PALETTE_COLUMNS
		var row_y: int = row * (TILE_SIZE.y + FULL_PALETTE_ROW_GAP)
		for y in TILE_SIZE.y:
			for x in TILE_SIZE.x:
				var source_position: Vector2i = _get_transformed_source_position(
					Vector2i(x, y),
					rotation_steps,
					flip_horizontal,
					flip_vertical,
					tile_center
				)
				if source_position.x < 0 or source_position.x >= TILE_SIZE.x:
					continue
				if source_position.y < 0 or source_position.y >= TILE_SIZE.y:
					continue
				palette_image.set_pixel(column * TILE_SIZE.x + x, row_y + y, source_image.get_pixel(frame_index * TILE_SIZE.x + source_position.x, source_position.y))

	_full_tileset_preview.texture = ImageTexture.create_from_image(palette_image)
	_full_tileset_preview.size = Vector2(palette_image.get_size())
	_full_tileset_palette_input.position = _full_tileset_preview.position
	_full_tileset_palette_input.size = _full_tileset_preview.size
	_update_full_palette_selection()

func _blit_tile_frame(source_image: Image, target_image: Image, source_frame: int, target_x_offset: int) -> void:
	var source_x_offset: int = source_frame * TILE_SIZE.x
	for y in TILE_SIZE.y:
		for x in TILE_SIZE.x:
			target_image.set_pixel(target_x_offset + x, y, source_image.get_pixel(source_x_offset + x, y))

func _build_rotated_palette_image(source_image: Image) -> Image:
	var rotation_steps: int = int(_rotation_sides_input.value)
	if posmod(rotation_steps, 6) == 0:
		return source_image

	var frame_count: int = max(1, source_image.get_width() / TILE_SIZE.x)
	var palette_image: Image = Image.create(frame_count * TILE_SIZE.x, TILE_SIZE.y, false, Image.FORMAT_RGBA8)
	palette_image.fill(Color(1, 1, 1, 0))
	var tile_center: Vector2 = Vector2(TILE_SIZE) * 0.5

	for frame_index in frame_count:
		var source_x_offset: int = frame_index * TILE_SIZE.x
		var target_x_offset: int = frame_index * TILE_SIZE.x
		for y in TILE_SIZE.y:
			for x in TILE_SIZE.x:
				var source_position: Vector2i = _get_transformed_source_position(
					Vector2i(x, y),
					rotation_steps,
					_flip_horizontal_toggle.button_pressed,
					_flip_vertical_toggle.button_pressed,
					tile_center
				)
				if source_position.x < 0 or source_position.x >= TILE_SIZE.x:
					continue
				if source_position.y < 0 or source_position.y >= TILE_SIZE.y:
					continue

				var color: Color = source_image.get_pixel(source_x_offset + source_position.x, source_position.y)
				palette_image.set_pixel(target_x_offset + x, y, color)

	return palette_image

func _refresh_output_preview() -> void:
	if _mask_images.is_empty() or _texture_images.is_empty():
		return

	var output_size: Vector2i = _get_output_size()
	var output_image: Image = Image.create(output_size.x, output_size.y, false, Image.FORMAT_RGBA8)
	output_image.fill(Color(1, 1, 1, 0))

	for layer_index in TILE_LAYER_COUNT:
		var texture_index: int = clampi(_layer_textures[layer_index], 0, _texture_images.size() - 1)
		_apply_layer_cells(output_image, layer_index, _texture_images[texture_index])

	_last_output_image = output_image
	_textured_shape_preview.texture = ImageTexture.create_from_image(_last_output_image)
	_textured_shape_preview.size = Vector2(output_size)
	_textured_shape_preview.position = Vector2.ZERO

func _apply_layer_cells(output_image: Image, layer_index: int, texture_image: Image) -> void:
	var layer: Dictionary = _layer_cells[layer_index]
	for cell_position in layer.keys():
		var cell: Dictionary = layer[cell_position]
		var mode: String = String(cell.get("mode", "mask"))
		if mode == "transparent":
			continue
		if mode == "full":
			_apply_full_tile_cell(output_image, cell_position, cell)
			continue
		_apply_textured_mask_cell(output_image, cell_position, cell, texture_image)

func _apply_textured_mask_cell(output_image: Image, cell_position: Vector2i, cell: Dictionary, texture_image: Image) -> void:
	var mode: String = String(cell.get("mode", "mask"))
	var mask_index: int = clampi(int(cell["mask"]), 0, _mask_images.size() - 1)
	var frame_index: int = clampi(int(cell["frame"]), 0, _get_mask_frame_count(mask_index) - 1)
	var rotation_steps: int = int(cell["rotation"])
	var flip_horizontal: bool = bool(cell.get("flip_horizontal", false))
	var flip_vertical: bool = bool(cell.get("flip_vertical", false))
	var source_image: Image = _mask_images[mask_index]
	if mode == "solid":
		source_image = _solid_mask_image
		frame_index = 0

	var source_x_offset: int = frame_index * TILE_SIZE.x
	var target_origin: Vector2i = Vector2i(_get_cell_texture_origin(cell_position).round())
	var tile_center: Vector2 = Vector2(TILE_SIZE) * 0.5
	var texture_scale: float = maxf(0.01, float(_texture_scale_input.value))
	var texture_offset: Vector2 = Vector2(_texture_offset_x_input.value, _texture_offset_y_input.value)

	for y in TILE_SIZE.y:
		for x in TILE_SIZE.x:
			var target_x: int = target_origin.x + x
			var target_y: int = target_origin.y + y
			if target_x < 0 or target_x >= output_image.get_width():
				continue
			if target_y < 0 or target_y >= output_image.get_height():
				continue

			var source_position: Vector2i = _get_transformed_source_position(Vector2i(x, y), rotation_steps, flip_horizontal, flip_vertical, tile_center)
			if source_position.x < 0 or source_position.x >= TILE_SIZE.x:
				continue
			if source_position.y < 0 or source_position.y >= TILE_SIZE.y:
				continue

			var source_color: Color = source_image.get_pixel(source_x_offset + source_position.x, source_position.y)
			if source_color.a <= 0.0:
				continue
			if _is_transparent_mask_color(source_color):
				continue

			var texture_x: int = posmod(int((target_x + texture_offset.x) * texture_scale), texture_image.get_width())
			var texture_y: int = posmod(int((target_y + texture_offset.y) * texture_scale), texture_image.get_height())
			var color: Color = texture_image.get_pixel(texture_x, texture_y)
			color.a *= source_color.a
			output_image.set_pixel(target_x, target_y, color)

func _apply_full_tile_cell(output_image: Image, cell_position: Vector2i, cell: Dictionary) -> void:
	var full_source_index: int = clampi(int(cell.get("full_source", 0)), 0, _full_tile_images.size() - 1)
	var frame_index: int = clampi(int(cell["frame"]), 0, _get_full_tile_frame_count(full_source_index) - 1)
	var rotation_steps: int = int(cell["rotation"])
	var flip_horizontal: bool = bool(cell.get("flip_horizontal", false))
	var flip_vertical: bool = bool(cell.get("flip_vertical", false))
	var source_image: Image = _full_tile_images[full_source_index]
	var source_x_offset: int = frame_index * TILE_SIZE.x
	var target_origin: Vector2i = Vector2i(_get_cell_texture_origin(cell_position).round())
	var tile_center: Vector2 = Vector2(TILE_SIZE) * 0.5

	for y in TILE_SIZE.y:
		for x in TILE_SIZE.x:
			var target_x: int = target_origin.x + x
			var target_y: int = target_origin.y + y
			if target_x < 0 or target_x >= output_image.get_width():
				continue
			if target_y < 0 or target_y >= output_image.get_height():
				continue

			var source_position: Vector2i = _get_transformed_source_position(Vector2i(x, y), rotation_steps, flip_horizontal, flip_vertical, tile_center)
			if source_position.x < 0 or source_position.x >= TILE_SIZE.x:
				continue
			if source_position.y < 0 or source_position.y >= TILE_SIZE.y:
				continue

			var color: Color = source_image.get_pixel(source_x_offset + source_position.x, source_position.y)
			if color.a <= 0.0:
				continue
			output_image.set_pixel(target_x, target_y, color)

func _handle_canvas_click(mouse_event: InputEventMouseButton) -> void:
	var canvas_global_position: Vector2 = _canvas_input.get_global_mouse_position()
	var cell_position: Vector2i = _mask_tile_map.local_to_map(_mask_tile_map.to_local(canvas_global_position))
	if not _is_cell_inside_grid(cell_position):
		return

	if mouse_event.button_index == MOUSE_BUTTON_LEFT:
		if _brush_mode == "transparent":
			_mask_tile_map.set_cell(cell_position, TRANSPARENT_TILE_SOURCE_ID, Vector2i(0, 0), 0)
		elif _brush_mode == "solid":
			_mask_tile_map.set_cell(cell_position, SOLID_TILE_SOURCE_ID, Vector2i(0, 0), 0)
		elif _brush_mode == "full":
			_mask_tile_map.set_cell(cell_position, FULL_TILE_SOURCE_ID_OFFSET + _full_brush_source_index, Vector2i(int(_mask_frame_input.value), 0), 0)
		else:
			_mask_tile_map.set_cell(cell_position, BLACK_WHITE_TILE_SOURCE_ID, Vector2i(int(_mask_frame_input.value), 0), 0)
		_set_active_layer_cell(cell_position)
	elif mouse_event.button_index == MOUSE_BUTTON_RIGHT:
		_mask_tile_map.erase_cell(cell_position)
		_erase_active_layer_cell(cell_position)
	else:
		return

	_refresh_output_preview()

func _pan_canvas(delta: Vector2) -> void:
	_set_workspace_position(_canvas_root.position + delta)

func _set_workspace_position(position: Vector2) -> void:
	_canvas_root.position = position
	_update_canvas_size()
	_update_canvas_border()

func _select_brush_frame_from_palette(local_position: Vector2) -> void:
	if local_position.x < 0.0 or local_position.y < 0.0:
		return
	if local_position.x > _tileset_preview.size.x or local_position.y > _tileset_preview.size.y:
		return

	var palette_position: Vector2 = local_position
	if _tileset_preview.texture != null:
		var texture_size: Vector2 = _tileset_preview.texture.get_size()
		palette_position = Vector2(
			local_position.x * texture_size.x / maxf(1.0, _tileset_preview.size.x),
			local_position.y * texture_size.y / maxf(1.0, _tileset_preview.size.y)
		)

	if palette_position.x < TILE_SIZE.x:
		_brush_mode = "transparent"
		_update_palette_selection()
		return
	if palette_position.x < TILE_SIZE.x * 2:
		_brush_mode = "solid"
		_update_palette_selection()
		return

	_brush_mode = "mask"
	_sync_mask_frame_limits()
	var mask_index: int = _mask_option.selected
	var frame_index: int = clampi(int((palette_position.x - TILE_SIZE.x * 2) / TILE_SIZE.x), 0, _get_mask_frame_count(mask_index) - 1)
	_mask_frame_input.value = frame_index

func _select_full_brush_frame_from_palette(local_position: Vector2) -> void:
	if local_position.x < 0.0 or local_position.y < 0.0:
		return
	if local_position.x > _full_tileset_preview.size.x or local_position.y > _full_tileset_preview.size.y:
		return

	var palette_position: Vector2 = local_position
	if _full_tileset_preview.texture != null:
		var texture_size: Vector2 = _full_tileset_preview.texture.get_size()
		palette_position = Vector2(
			local_position.x * texture_size.x / maxf(1.0, _full_tileset_preview.size.x),
			local_position.y * texture_size.y / maxf(1.0, _full_tileset_preview.size.y)
		)

	_brush_mode = "full"
	_mask_frame_input.max_value = _get_full_tile_frame_count(_full_brush_source_index) - 1
	var column: int = clampi(palette_position.x / TILE_SIZE.x, 0, FULL_PALETTE_COLUMNS - 1)
	var row: int = max(0, int(palette_position.y / (TILE_SIZE.y + FULL_PALETTE_ROW_GAP)))
	var row_local_y: int = int(palette_position.y) - row * (TILE_SIZE.y + FULL_PALETTE_ROW_GAP)
	if row_local_y >= TILE_SIZE.y:
		return
	var frame_index: int = row * FULL_PALETTE_COLUMNS + column
	_is_syncing_controls = true
	_mask_frame_input.value = clampi(frame_index, 0, _get_full_tile_frame_count(_full_brush_source_index) - 1)
	_is_syncing_controls = false
	_update_palette_selection()
	_update_full_palette_selection()

func _handle_rotation_wheel(mouse_event: InputEventMouseButton) -> bool:
	if not mouse_event.pressed:
		return false

	if mouse_event.button_index == MOUSE_BUTTON_WHEEL_UP:
		_step_rotation_sides(1)
		return true
	if mouse_event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
		_step_rotation_sides(-1)
		return true

	return false

func _step_rotation_sides(delta: int) -> void:
	_rotation_sides_input.value = posmod(int(_rotation_sides_input.value) + delta, 6)

func _update_palette_selection() -> void:
	var frame_index: int = 0
	if _brush_mode == "solid":
		frame_index = 1
	elif _brush_mode == "full":
		_palette_selection.visible = false
		_update_full_palette_selection()
		return
	elif _brush_mode == "mask":
		frame_index = int(_mask_frame_input.value) + 2
	_palette_selection.visible = true
	_palette_selection.position = _tileset_preview.position + Vector2(frame_index * TILE_SIZE.x, 0.0)
	_palette_selection.size = Vector2(TILE_SIZE)
	_update_full_palette_selection()

func _update_full_palette_selection() -> void:
	_full_palette_selection.visible = _brush_mode == "full"
	if not _full_palette_selection.visible:
		return
	var frame_index: int = int(_mask_frame_input.value)
	var column: int = frame_index % FULL_PALETTE_COLUMNS
	var row: int = frame_index / FULL_PALETTE_COLUMNS
	_full_palette_selection.position = _full_tileset_preview.position + Vector2(column * TILE_SIZE.x, row * (TILE_SIZE.y + FULL_PALETTE_ROW_GAP))
	_full_palette_selection.size = Vector2(TILE_SIZE)

func _prune_cells_outside_grid() -> void:
	for cell_position in _mask_tile_map.get_used_cells():
		if not _is_cell_inside_grid(cell_position):
			_mask_tile_map.erase_cell(cell_position)
			_erase_active_layer_cell(cell_position)

func _is_transparent_mask_color(color: Color) -> bool:
	return color.r > 0.5 and color.g > 0.5 and color.b > 0.5

func _get_transformed_source_position(
	target_position: Vector2i,
	rotation_steps: int,
	flip_horizontal: bool,
	flip_vertical: bool,
	tile_center: Vector2
) -> Vector2i:
	var normalized_steps: int = posmod(rotation_steps, 6)
	var transformed_position: Vector2 = target_position
	if flip_horizontal:
		transformed_position.x = TILE_SIZE.x - 1 - transformed_position.x
	if flip_vertical:
		transformed_position.y = TILE_SIZE.y - 1 - transformed_position.y
	if normalized_steps == 0:
		return Vector2i(int(round(transformed_position.x)), int(round(transformed_position.y)))

	var angle: float = -TAU * float(normalized_steps) / 6.0
	var relative_position: Vector2 = transformed_position - tile_center
	var source_position: Vector2 = relative_position.rotated(angle) + tile_center
	return Vector2i(int(round(source_position.x)), int(round(source_position.y)))

func _is_cell_inside_grid(cell_position: Vector2i) -> bool:
	var grid_size: Vector2i = _get_grid_size()
	return cell_position.x >= 0 and cell_position.y >= 0 and cell_position.x < grid_size.x and cell_position.y < grid_size.y

func _get_grid_size() -> Vector2i:
	return Vector2i(max(1, int(_grid_width_input.value)), max(1, int(_grid_height_input.value)))

func _get_output_size() -> Vector2i:
	var has_cells: bool = false
	for layer_index in TILE_LAYER_COUNT:
		if not _layer_cells[layer_index].is_empty():
			has_cells = true
			break
	if not has_cells:
		return TILE_SIZE

	var max_position: Vector2 = Vector2.ZERO
	for layer_index in TILE_LAYER_COUNT:
		for cell_position in _layer_cells[layer_index].keys():
			var bottom_right: Vector2 = _get_cell_texture_origin(cell_position) + Vector2(TILE_SIZE)
			max_position.x = maxf(max_position.x, bottom_right.x)
			max_position.y = maxf(max_position.y, bottom_right.y)
	return Vector2i(maxi(TILE_SIZE.x, int(ceil(max_position.x))), maxi(TILE_SIZE.y, int(ceil(max_position.y))))

func _set_active_layer_cell(cell_position: Vector2i) -> void:
	_layer_cells[_active_layer_index][cell_position] = {
		"mode": _brush_mode,
		"full_source": _full_brush_source_index,
		"mask": _mask_option.selected,
		"frame": int(_mask_frame_input.value),
		"rotation": int(_rotation_sides_input.value),
		"flip_horizontal": _flip_horizontal_toggle.button_pressed,
		"flip_vertical": _flip_vertical_toggle.button_pressed,
	}

func _erase_active_layer_cell(cell_position: Vector2i) -> void:
	_layer_cells[_active_layer_index].erase(cell_position)

func _save_active_tile_map_to_layer() -> void:
	var layer: Dictionary = _layer_cells[_active_layer_index]
	for cell_position in _mask_tile_map.get_used_cells():
		if not layer.has(cell_position):
			layer[cell_position] = {
				"mode": _get_cell_mode_from_tile_source(_mask_tile_map.get_cell_source_id(cell_position)),
				"full_source": _get_full_source_from_tile_source(_mask_tile_map.get_cell_source_id(cell_position)),
				"mask": _mask_tile_map.get_cell_source_id(cell_position),
				"frame": _mask_tile_map.get_cell_atlas_coords(cell_position).x,
				"rotation": 0,
				"flip_horizontal": false,
				"flip_vertical": false,
			}

func _load_active_layer_to_tile_map() -> void:
	_mask_tile_map.clear()
	var layer: Dictionary = _layer_cells[_active_layer_index]
	for cell_position in layer.keys():
		var cell: Dictionary = layer[cell_position]
		var mode: String = String(cell.get("mode", "mask"))
		var source_id: int = BLACK_WHITE_TILE_SOURCE_ID
		var atlas_coords: Vector2i = Vector2i(int(cell["frame"]), 0)
		if mode == "transparent":
			source_id = TRANSPARENT_TILE_SOURCE_ID
			atlas_coords = Vector2i.ZERO
		elif mode == "solid":
			source_id = SOLID_TILE_SOURCE_ID
			atlas_coords = Vector2i.ZERO
		elif mode == "full":
			source_id = FULL_TILE_SOURCE_ID_OFFSET + int(cell.get("full_source", 0))
		_mask_tile_map.set_cell(cell_position, source_id, atlas_coords, 0)

func _get_cell_mode_from_tile_source(source_id: int) -> String:
	if source_id == TRANSPARENT_TILE_SOURCE_ID:
		return "transparent"
	if source_id == SOLID_TILE_SOURCE_ID:
		return "solid"
	if source_id >= FULL_TILE_SOURCE_ID_OFFSET:
		return "full"
	return "mask"

func _get_full_source_from_tile_source(source_id: int) -> int:
	if source_id < FULL_TILE_SOURCE_ID_OFFSET:
		return 0
	return source_id - FULL_TILE_SOURCE_ID_OFFSET

func _update_canvas_size() -> void:
	var grid_size: Vector2i = _get_grid_size()
	var bottom_right_cell: Vector2i = Vector2i(grid_size.x - 1, grid_size.y - 1)
	var bounds: Rect2 = _get_visible_grid_bounds()
	var bottom_right_position: Vector2 = _get_cell_texture_origin(bottom_right_cell) + Vector2(TILE_SIZE)
	bottom_right_position.y += TILE_SIZE.y * 0.5
	_canvas_input.position = _canvas_root.position + bounds.position * PREVIEW_SCALE
	_canvas_input.size = (bottom_right_position - bounds.position) * PREVIEW_SCALE
	_update_canvas_border()

func _update_canvas_border() -> void:
	var border_width: float = 2.0
	var position: Vector2 = _canvas_input.position
	var size: Vector2 = _canvas_input.size

	_canvas_border_top.position = position
	_canvas_border_top.size = Vector2(size.x, border_width)

	_canvas_border_right.position = position + Vector2(size.x - border_width, 0.0)
	_canvas_border_right.size = Vector2(border_width, size.y)

	_canvas_border_bottom.position = position + Vector2(0.0, size.y - border_width)
	_canvas_border_bottom.size = Vector2(size.x, border_width)

	_canvas_border_left.position = position
	_canvas_border_left.size = Vector2(border_width, size.y)

func _get_visible_grid_bounds() -> Rect2:
	var grid_size: Vector2i = _get_grid_size()
	var min_position: Vector2 = Vector2(INF, INF)
	var max_position: Vector2 = Vector2(-INF, -INF)

	for y in grid_size.y:
		for x in grid_size.x:
			var origin: Vector2 = _get_cell_texture_origin(Vector2i(x, y))
			min_position.x = minf(min_position.x, origin.x)
			min_position.y = minf(min_position.y, origin.y)
			max_position.x = maxf(max_position.x, origin.x + TILE_SIZE.x)
			max_position.y = maxf(max_position.y, origin.y + TILE_SIZE.y)

	return Rect2(min_position, max_position - min_position)

func _get_cell_texture_origin(cell_position: Vector2i) -> Vector2:
	return _mask_tile_map.position + _mask_tile_map.map_to_local(cell_position) - Vector2(TILE_SIZE) * 0.5

func _get_mask_frame_count(mask_index: int) -> int:
	if mask_index < 0 or mask_index >= _mask_images.size():
		return 1
	return max(1, _mask_images[mask_index].get_width() / TILE_SIZE.x)

func _get_full_tile_frame_count(source_index: int) -> int:
	if source_index < 0 or source_index >= _full_tile_images.size():
		return 1
	return max(1, _full_tile_images[source_index].get_width() / TILE_SIZE.x)

func _load_image(path: String) -> Image:
	var texture: Texture2D = load(path) as Texture2D
	if texture == null:
		push_error("Terrain tile tool asset is missing: %s" % path)
		return Image.create(1, 1, false, Image.FORMAT_RGBA8)
	return texture.get_image()
