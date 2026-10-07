@tool
class_name Painter

const METADATA_KEY := "hex_surface_painter"

var tile_map: TileMap
var edge_rules: EdgeRules
var tile_records: Dictionary
var layout := HexCoord.Layout.POINTY
var respect_adjacency := true
var randomness := 0.0
var auto_fix_neighbors := true
var active_surface := ""
var rng := RandomNumberGenerator.new()

func setup(tile_map_ref:TileMap, edge_rules_ref:EdgeRules, tile_records_ref:Dictionary, layout_name:String) -> void:
    tile_map = tile_map_ref
    edge_rules = edge_rules_ref
    tile_records = tile_records_ref
    layout = layout_name == "flat" ? HexCoord.Layout.FLAT : HexCoord.Layout.POINTY

func set_surface(surface:String) -> void:
    active_surface = surface

func set_respect_adjacency(value:bool) -> void:
    respect_adjacency = value

func set_randomness(value:float) -> void:
    randomness = clamp(value, 0.0, 1.0)

func set_auto_fix(value:bool) -> void:
    auto_fix_neighbors = value

func set_seed(seed:int) -> void:
    rng.seed = seed
    rng.state = seed

func paint_axial(q:int, r:int) -> bool:
    if tile_map == null or edge_rules == null:
        return false
    var cell := Vector2i(q, r)
    var variant := _select_variant(cell, active_surface)
    if variant.is_empty():
        return false
    _apply_variant(cell, active_surface, variant)
    if auto_fix_neighbors:
        _fix_neighbors(cell)
    return true

func erase_axial(q:int, r:int) -> void:
    if tile_map == null:
        return
    var map_coords := HexCoord.axial_to_offset(q, r, layout)
    tile_map.set_cell(0, map_coords, TileSet.INVALID_SOURCE)
    tile_map.set_cell_metadata(0, map_coords, null)

func pick_surface(q:int, r:int) -> String:
    var state := _get_cell_state(Vector2i(q, r))
    if state.has("surface"):
        active_surface = state["surface"]
    return active_surface

func fill(q:int, r:int, predicate:Callable, paint:Callable) -> void:
    var filler := FloodFill.new()
    filler.layout = layout
    filler.fill_area(q, r, predicate, paint)

func _select_variant(cell:Vector2i, surface:String) -> Dictionary:
    var requirements := []
    var neighbors := HexCoord.neighbors(cell.x, cell.y, layout)
    for i in range(6):
        var neighbor := neighbors[i]
        var neighbor_state := _get_cell_state(neighbor)
        if neighbor_state.is_empty():
            requirements.append(null)
            continue
        var neighbor_edges := edge_rules.get_edges(neighbor_state["tile_id"], neighbor_state["rotation"])
        if neighbor_edges.size() != 6:
            requirements.append(null)
            continue
        var opposite := EdgeRules.opposite(i)
        requirements.append(neighbor_edges[opposite])
    var candidates := []
    if respect_adjacency:
        candidates = edge_rules.candidates(surface, requirements)
    if !respect_adjacency or candidates.is_empty():
        candidates = edge_rules.candidates(surface, [null, null, null, null, null, null])
    if candidates.is_empty():
        return {}
    return _weighted_choice(candidates)

func _weighted_choice(candidates:Array) -> Dictionary:
    if candidates.size() == 1:
        return candidates[0]
    var total := 0.0
    var adjusted_weights: Array[float] = []
    for c in candidates:
        var base_weight := float(c.get("weight", 1.0))
        var adjusted := lerpf(base_weight, 1.0, clamp(randomness, 0.0, 1.0))
        adjusted_weights.append(max(adjusted, 0.001))
        total += adjusted_weights[-1]
    if total <= 0.0:
        return candidates[0]
    var target := rng.randf() * total
    var accum := 0.0
    for i in range(candidates.size()):
        accum += adjusted_weights[i]
        if target <= accum:
            return candidates[i]
    return candidates[-1]

func _apply_variant(cell:Vector2i, surface:String, variant:Dictionary) -> void:
    var record := tile_records.get(variant["tile_id"], null)
    if record == null:
        return
    var map_coords := HexCoord.axial_to_offset(cell.x, cell.y, layout)
    var alt_map := record.get("alternatives", {})
    var rotation := int(variant.get("rotation", 0))
    var alternative_id := alt_map.get(rotation, 0)
    tile_map.set_cell(0, map_coords, record["source_id"], record["atlas_coords"], alternative_id)
    tile_map.set_cell_metadata(0, map_coords, {
        "surface": surface,
        "tile_id": variant["tile_id"],
        "rotation": rotation,
        "edges": variant.get("edges", [])
    })

func _fix_neighbors(cell:Vector2i) -> void:
    var queue := [cell]
    var visited := {}
    var iterations := 0
    while !queue.is_empty() and iterations < 2:
        var current := queue.pop_front()
        var neighbors := HexCoord.neighbors(current.x, current.y, layout)
        for neighbor in neighbors:
            var state := _get_cell_state(neighbor)
            if state.is_empty():
                continue
            var variant := _select_variant(neighbor, state["surface"])
            if variant.is_empty():
                continue
            _apply_variant(neighbor, state["surface"], variant)
            if !visited.has(neighbor):
                queue.append(neighbor)
                visited[neighbor] = true
        iterations += 1

func _get_cell_state(cell:Vector2i) -> Dictionary:
    if tile_map == null:
        return {}
    var map_coords := HexCoord.axial_to_offset(cell.x, cell.y, layout)
    var source_id := tile_map.get_cell_source_id(0, map_coords)
    if source_id == TileSet.INVALID_SOURCE:
        return {}
    var metadata := tile_map.get_cell_metadata(0, map_coords)
    if typeof(metadata) == TYPE_DICTIONARY:
        return metadata
    return {}

func get_surface(q:int, r:int) -> String:
    var state := _get_cell_state(Vector2i(q, r))
    if state.has("surface"):
        return state["surface"]
    return ""

func has_tile(q:int, r:int) -> bool:
    var state := _get_cell_state(Vector2i(q, r))
    return !state.is_empty()
