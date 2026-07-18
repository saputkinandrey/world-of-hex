@tool
extends VBoxContainer

const SETTINGS_PREFIX := "hex_surface_painter/"

var editor_plugin: EditorPlugin
var editor_interface: EditorInterface
var builder := TileSetBuilder.new()
var meta_loader := MetaLoader.new()
var painter := Painter.new()
var current_data: Dictionary = {}
var current_tileset: TileSet
var current_surface := ""
var brush_mode := "paint"
var brush_radius := 0
var brush_group := ButtonGroup.new()
var last_painted_axial := Vector2i(999999, 999999)

@onready var folder_path: LineEdit = $TileFolder/FolderPath
@onready var build_button: Button = $BuildRow/BuildButton
@onready var reload_button: Button = $BuildRow/ReloadButton
@onready var surface_dropdown: OptionButton = $SurfaceRow/SurfaceDropdown
@onready var paint_button: Button = $BrushRow/PaintButton
@onready var fill_button: Button = $BrushRow/FillButton
@onready var erase_button: Button = $BrushRow/EraseButton
@onready var picker_button: Button = $BrushRow/PickerButton
@onready var respect_toggle: CheckBox = $SettingsGrid/RespectToggle
@onready var randomness_slider: HSlider = $SettingsGrid/RandomnessSlider
@onready var seed_spin: SpinBox = $SettingsGrid/SeedSpin
@onready var reseed_button: Button = $SettingsGrid/ReseedButton
@onready var auto_fix_toggle: CheckBox = $SettingsGrid/AutoFixToggle
@onready var status_label: RichTextLabel = $Status

func setup(plugin:EditorPlugin) -> void:
    editor_plugin = plugin
    editor_interface = plugin.get_editor_interface()

func _ready() -> void:
    paint_button.button_group = brush_group
    fill_button.button_group = brush_group
    erase_button.button_group = brush_group
    picker_button.button_group = brush_group
    paint_button.toggled.connect(_on_brush_toggled.bind("paint"))
    fill_button.toggled.connect(_on_brush_toggled.bind("fill"))
    erase_button.toggled.connect(_on_brush_toggled.bind("erase"))
    picker_button.toggled.connect(_on_brush_toggled.bind("picker"))
    folder_path.text_submitted.connect(_on_folder_submitted)
    folder_path.text_changed.connect(_on_folder_changed)
    build_button.pressed.connect(_on_build_pressed)
    reload_button.pressed.connect(_on_reload_pressed)
    surface_dropdown.item_selected.connect(_on_surface_selected)
    respect_toggle.toggled.connect(_on_respect_toggled)
    randomness_slider.value_changed.connect(_on_randomness_changed)
    seed_spin.value_changed.connect(_on_seed_changed)
    reseed_button.pressed.connect(_on_reseed_pressed)
    auto_fix_toggle.toggled.connect(_on_autofix_toggled)
    _load_settings()
    _apply_settings_to_painter()

func _load_settings() -> void:
    if editor_interface == null:
        return
    var settings := editor_interface.get_editor_settings()
    if settings == null:
        return
    folder_path.text = settings.get_setting(SETTINGS_PREFIX + "folder", "res://tiles")
    respect_toggle.button_pressed = settings.get_setting(SETTINGS_PREFIX + "respect", true)
    randomness_slider.value = settings.get_setting(SETTINGS_PREFIX + "randomness", 0.0)
    seed_spin.value = settings.get_setting(SETTINGS_PREFIX + "seed", 1)
    auto_fix_toggle.button_pressed = settings.get_setting(SETTINGS_PREFIX + "autofix", true)
    var saved_brush := settings.get_setting(SETTINGS_PREFIX + "brush", "paint")
    match saved_brush:
        "fill": fill_button.button_pressed = true
        "erase": erase_button.button_pressed = true
        "picker": picker_button.button_pressed = true
        _: paint_button.button_pressed = true

func _save_settings() -> void:
    if editor_interface == null:
        return
    var settings := editor_interface.get_editor_settings()
    if settings == null:
        return
    settings.set_setting(SETTINGS_PREFIX + "folder", folder_path.text)
    settings.set_setting(SETTINGS_PREFIX + "respect", respect_toggle.button_pressed)
    settings.set_setting(SETTINGS_PREFIX + "randomness", randomness_slider.value)
    settings.set_setting(SETTINGS_PREFIX + "seed", seed_spin.value)
    settings.set_setting(SETTINGS_PREFIX + "autofix", auto_fix_toggle.button_pressed)
    settings.set_setting(SETTINGS_PREFIX + "brush", brush_mode)
    settings.save()

func _on_brush_toggled(pressed:bool, mode:String) -> void:
    if pressed:
        brush_mode = mode
        _save_settings()

func _on_build_pressed() -> void:
    _build_tileset()

func _on_reload_pressed() -> void:
    if current_data.is_empty():
        _build_tileset()
        return
    _attach_to_tilemap()
    _set_status("Reloaded TileSet")

func _on_surface_selected(index:int) -> void:
    current_surface = surface_dropdown.get_item_text(index)
    painter.set_surface(current_surface)
    _save_settings()

func _on_respect_toggled(value:bool) -> void:
    painter.set_respect_adjacency(value)
    _save_settings()

func _on_randomness_changed(value:float) -> void:
    painter.set_randomness(value)
    _save_settings()

func _on_seed_changed(value:float) -> void:
    painter.set_seed(int(value))
    _save_settings()

func _on_reseed_pressed() -> void:
    var seed := randi() % 1000000
    seed_spin.value = seed
    painter.set_seed(seed)
    _save_settings()

func _on_autofix_toggled(value:bool) -> void:
    painter.set_auto_fix(value)
    _save_settings()

func _apply_settings_to_painter() -> void:
    painter.set_respect_adjacency(respect_toggle.button_pressed)
    painter.set_randomness(randomness_slider.value)
    painter.set_auto_fix(auto_fix_toggle.button_pressed)
    painter.set_seed(int(seed_spin.value))

func _build_tileset() -> void:
    var dir := folder_path.text.strip_edges()
    if dir == "":
        dir = folder_path.placeholder_text
    var meta := meta_loader.load_meta(dir)
    var data := builder.build_from_folder(dir, meta)
    current_data = data
    current_tileset = data.get("tileset")
    var config := data.get("config", {})
    var layout := str(config.get("hex_layout", "pointy"))
    _set_status("Built TileSet from %s" % dir)
    _populate_surfaces(data.get("surfaces", {}))
    _attach_to_tilemap()
    painter.layout = layout == "flat" ? HexCoord.Layout.FLAT : HexCoord.Layout.POINTY

func _populate_surfaces(surfaces_dict:Dictionary) -> void:
    surface_dropdown.clear()
    var surfaces := surfaces_dict.keys()
    surfaces.sort()
    for i in range(surfaces.size()):
        surface_dropdown.add_item(surfaces[i])
        if surfaces[i] == current_surface:
            surface_dropdown.select(i)
    if surface_dropdown.get_selected() == -1 and surfaces.size() > 0:
        surface_dropdown.select(0)
    if surface_dropdown.get_selected() != -1:
        current_surface = surface_dropdown.get_item_text(surface_dropdown.get_selected())
    painter.set_surface(current_surface)

func _attach_to_tilemap() -> void:
    if current_data.is_empty():
        return
    var tilemap := _get_selected_tilemap()
    if tilemap == null:
        _set_status("Select a Hex TileMap in the scene tree")
        return
    painter.setup(tilemap, current_data["edge_rules"], current_data["tile_records"], str(current_data.get("config", {}).get("hex_layout", "pointy")))
    painter.set_surface(current_surface)
    _apply_settings_to_painter()
    tilemap.tile_set = current_tileset

func _get_selected_tilemap() -> TileMap:
    if editor_plugin == null:
        return null
    var selection := editor_plugin.get_editor_interface().get_selection()
    if selection == null:
        return null
    var nodes := selection.get_selected_nodes()
    for node in nodes:
        if node is TileMap:
            return node
    return null

func handle_canvas_input(event:InputEvent) -> bool:
    if current_data.is_empty():
        return false
    var tilemap := _get_selected_tilemap()
    if tilemap == null or !is_instance_valid(tilemap):
        return false
    if event is InputEventMouseButton and event.button_index == MouseButton.LEFT:
        if event.pressed:
            var axial := _event_to_axial(tilemap, event.position)
            _apply_brush(axial)
            last_painted_axial = axial
            return true
        else:
            last_painted_axial = Vector2i(999999, 999999)
            return false
    elif event is InputEventMouseMotion:
        if event.button_mask & MouseButtonMask.LEFT != 0:
            var axial := _event_to_axial(tilemap, event.position)
            if axial != last_painted_axial:
                _apply_brush(axial)
                last_painted_axial = axial
                return true
    return false

func _event_to_axial(tilemap:TileMap, position:Vector2) -> Vector2i:
    var transform := tilemap.get_global_transform_with_canvas().affine_inverse()
    var local := transform.xform(position)
    var map_coords := tilemap.local_to_map(local)
    return HexCoord.offset_to_axial(map_coords.x, map_coords.y, painter.layout)

func _apply_brush(axial:Vector2i) -> void:
    match brush_mode:
        "paint":
            if painter.paint_axial(axial.x, axial.y):
                _report_tile(axial)
        "erase":
            painter.erase_axial(axial.x, axial.y)
            _set_status("Erased cell %s" % axial)
        "picker":
            var surface := painter.pick_surface(axial.x, axial.y)
            if surface != "":
                _select_surface(surface)
        "fill":
            _perform_fill(axial)

func _select_surface(surface:String) -> void:
    for i in range(surface_dropdown.get_item_count()):
        if surface_dropdown.get_item_text(i) == surface:
            surface_dropdown.select(i)
            break
    current_surface = surface
    painter.set_surface(surface)
    _save_settings()

func _perform_fill(start:Vector2i) -> void:
    var target_surface := painter.get_surface(start.x, start.y)
    var predicate := func(q:int, r:int):
        if target_surface == "":
            return !painter.has_tile(q, r)
        return painter.get_surface(q, r) == target_surface
    var paint := func(q:int, r:int):
        painter.paint_axial(q, r)
    painter.fill(start.x, start.y, predicate, paint)

func _report_tile(axial:Vector2i) -> void:
    var tilemap := _get_selected_tilemap()
    if tilemap == null:
        return
    var map_coords := HexCoord.axial_to_offset(axial.x, axial.y, painter.layout)
    var metadata := tilemap.get_cell_metadata(0, map_coords)
    if typeof(metadata) == TYPE_DICTIONARY:
        var tile_id := metadata.get("tile_id", -1)
        var rotation := metadata.get("rotation", 0)
        var surface := metadata.get("surface", "")
        _set_status("Placed tile %s rot=%s surface=%s" % [tile_id, rotation, surface])

func _set_status(message:String) -> void:
    status_label.text = "[color=lime]%s[/color]" % message
