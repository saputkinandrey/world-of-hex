@tool
class_name EdgeRules

const OPPOSITE_INDEX := [3, 4, 5, 0, 1, 2]

var tile_edges: Dictionary = {}
var tile_rotations: Dictionary = {}
var tile_weights: Dictionary = {}
var tile_surfaces: Dictionary = {}

func clear():
    tile_edges.clear()
    tile_rotations.clear()
    tile_weights.clear()
    tile_surfaces.clear()

func register_tile(tile_id:int, surfaces:Array, rotations:Array, edge_colors:Array, weight:float = 1.0) -> void:
    if edge_colors.size() != 6:
        push_warning("Edge colors must contain exactly 6 entries for tile %s" % tile_id)
        return
    var normalized_rotations: Array = []
    var rotation_edges: Dictionary = {}
    for rot in rotations:
        var normalized := int(((rot % 360) + 360) % 360)
        if normalized % 60 != 0:
            push_warning("Rotation %s for tile %s is not a multiple of 60 degrees" % [rot, tile_id])
            continue
        if normalized_rotations.has(normalized):
            continue
        normalized_rotations.append(normalized)
        rotation_edges[normalized] = _rotate_edges(edge_colors, normalized)
    tile_edges[tile_id] = rotation_edges
    tile_rotations[tile_id] = normalized_rotations
    tile_weights[tile_id] = weight
    tile_surfaces[tile_id] = surfaces.duplicate()

func _rotate_edges(edges:Array, rotation:int) -> Array:
    if rotation == 0:
        return edges.duplicate()
    var steps := int(rotation / 60) % 6
    var rotated: Array = []
    for i in range(6):
        var index := (i - steps) % 6
        if index < 0:
            index += 6
        rotated.append(edges[index])
    return rotated

static func opposite(index:int) -> int:
    return OPPOSITE_INDEX[index % 6]

func candidates(surface:String, required:Array) -> Array:
    var results: Array = []
    for tile_id in tile_edges.keys():
        var surfaces := tile_surfaces.get(tile_id, [])
        if surface != "" and !surfaces.has(surface):
            continue
        var weight := float(tile_weights.get(tile_id, 1.0))
        var rotations: Array = tile_rotations.get(tile_id, [])
        for rot in rotations:
            var edges := tile_edges[tile_id].get(rot, [])
            if edges.size() != 6:
                continue
            var fits := true
            for i in range(6):
                var requirement := null
                if i < required.size():
                    requirement = required[i]
                if requirement == null:
                    continue
                if edges[i] != requirement:
                    fits = false
                    break
            if fits:
                results.append({
                    "tile_id": tile_id,
                    "rotation": rot,
                    "weight": weight,
                    "edges": edges
                })
    return results

func get_edges(tile_id:int, rotation:int) -> Array:
    if !tile_edges.has(tile_id):
        return []
    var normalized := int(((rotation % 360) + 360) % 360)
    if tile_edges[tile_id].has(normalized):
        return tile_edges[tile_id][normalized]
    return []

func get_surfaces_for_tile(tile_id:int) -> Array:
    return tile_surfaces.get(tile_id, [])
