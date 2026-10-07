@tool
class_name TileSetBuilder

const GENERATED_META := "generated_meta.json"

var fallback_analyzer := FallbackAnalyzer.new()

func build_from_folder(dir:String, meta:Dictionary, save_path:String = "res://tiles/generated_tileset.tres", build_collision:bool = false) -> Dictionary:
    var result := {
        "tileset": TileSet.new(),
        "edge_rules": EdgeRules.new(),
        "tile_records": {},
        "surfaces": {},
        "config": {}
    }
    if dir == "":
        push_error("Tile directory is empty")
        return result
    var normalized_dir := dir
    if !normalized_dir.ends_with("/"):
        normalized_dir += "/"
    var config := meta.get("config", {})
    var tile_size := _parse_tile_size(config.get("tile_size", [110, 96]))
    var hex_layout := str(config.get("hex_layout", "pointy")).to_lower()
    var allow_mirror := bool(config.get("allow_mirror", false))
    var tiles_meta := meta.get("tiles", [])
    var cached_meta := _load_generated_meta(normalized_dir)
    var cached_dirty := false
    var dir_access := DirAccess.open(normalized_dir)
    if dir_access == null:
        push_error("Cannot open directory %s" % normalized_dir)
        return result
    var tileset := result["tileset"]
    var edge_rules: EdgeRules = result["edge_rules"]
    var tile_records := result["tile_records"]
    var next_tile_id := 1
    dir_access.list_dir_begin()
    while true:
        var file_name := dir_access.get_next()
        if file_name == "":
            break
        if dir_access.current_is_dir():
            continue
        if !file_name.to_lower().ends_with(".png"):
            continue
        var resource_path := normalized_dir + file_name
        var texture := load(resource_path)
        if texture == null:
            push_warning("Failed to load texture %s" % resource_path)
            continue
        var meta_entry := _find_tile_entry(file_name, tiles_meta)
        var surfaces := meta_entry.get("surfaces", ["default"])
        var weight := float(meta_entry.get("weight", 1.0))
        var rotations := meta_entry.get("rotations", [0, 60, 120, 180, 240, 300])
        var edge_colors := []
        if meta_entry.has("edge_colors") and meta_entry["edge_colors"].size() == 6:
            edge_colors = meta_entry["edge_colors"].duplicate()
        else:
            var cache_key := file_name
            if cached_meta.has(cache_key):
                edge_colors = cached_meta[cache_key]
            else:
                var image := texture.get_image()
                edge_colors = fallback_analyzer.analyze_tile_edges(image, config)
                cached_meta[cache_key] = edge_colors
                cached_dirty = true
        if edge_colors.size() != 6:
            push_warning("Tile %s does not have 6 edge colors" % file_name)
            continue
        var atlas_source := TileSetAtlasSource.new()
        atlas_source.texture = texture
        atlas_source.texture_region_size = tile_size
        atlas_source.use_texture_padding = false
        atlas_source.create_tile(Vector2i.ZERO)
        atlas_source.set_tile_texture_region(Vector2i.ZERO, Rect2i(Vector2i.ZERO, Vector2i(texture.get_width(), texture.get_height())))
        var rotation_map := {}
        for rot in rotations:
            var normalized_rot := int(((rot % 360) + 360) % 360)
            var alt_id := 0
            if normalized_rot != 0:
                alt_id = atlas_source.create_alternative_tile(Vector2i.ZERO)
            var tile_data := atlas_source.get_tile_data(Vector2i.ZERO, alt_id)
            tile_data.set_texture_rotation_degrees(normalized_rot)
            rotation_map[normalized_rot] = alt_id
        var source_id := tileset.add_source(atlas_source)
        edge_rules.register_tile(next_tile_id, surfaces, rotations, edge_colors, weight)
        tile_records[next_tile_id] = {
            "source_id": source_id,
            "atlas_coords": Vector2i.ZERO,
            "alternatives": rotation_map,
            "file": file_name,
            "surfaces": surfaces,
            "weight": weight
        }
        for s in surfaces:
            result["surfaces"][s] = true
        next_tile_id += 1
    dir_access.list_dir_end()
    result["config"] = {
        "tile_size": tile_size,
        "hex_layout": hex_layout,
        "allow_mirror": allow_mirror
    }
    if cached_dirty:
        _save_generated_meta(normalized_dir, cached_meta)
    _ensure_save_dir(save_path)
    var err := ResourceSaver.save(save_path, tileset)
    if err != OK:
        push_warning("Failed to save TileSet to %s (error %s)" % [save_path, err])
    return result

func _parse_tile_size(value) -> Vector2i:
    if typeof(value) == TYPE_VECTOR2I:
        return value
    if typeof(value) == TYPE_VECTOR2:
        return Vector2i(int(value.x), int(value.y))
    if typeof(value) == TYPE_ARRAY and value.size() >= 2:
        return Vector2i(int(value[0]), int(value[1]))
    return Vector2i(110, 96)

func _find_tile_entry(file_name:String, entries:Array) -> Dictionary:
    for entry in entries:
        if typeof(entry) != TYPE_DICTIONARY:
            continue
        if str(entry.get("file", "")).to_lower() == file_name.to_lower():
            return entry
    return {}

func _load_generated_meta(dir:String) -> Dictionary:
    var path := dir + GENERATED_META
    if !FileAccess.file_exists(path):
        return {}
    var file := FileAccess.open(path, FileAccess.READ)
    if file == null:
        return {}
    var text := file.get_as_text()
    file.close()
    var json := JSON.new()
    if json.parse(text) != OK:
        return {}
    var data := json.get_data()
    if typeof(data) != TYPE_DICTIONARY:
        return {}
    return data

func _save_generated_meta(dir:String, data:Dictionary) -> void:
    var path := dir + GENERATED_META
    var file := FileAccess.open(path, FileAccess.WRITE)
    if file == null:
        push_warning("Failed to save generated meta to %s" % path)
        return
    var json := JSON.stringify(data, "  ")
    file.store_string(json)
    file.close()

func _build_collision_polygon(texture:Texture2D) -> PackedVector2Array:
    var image := texture.get_image()
    if image == null:
        return PackedVector2Array()
    var used := image.get_used_rect()
    var points := PackedVector2Array()
    points.append(Vector2(used.position.x, used.position.y))
    points.append(Vector2(used.position.x + used.size.x, used.position.y))
    points.append(Vector2(used.position.x + used.size.x, used.position.y + used.size.y))
    points.append(Vector2(used.position.x, used.position.y + used.size.y))
    return points
