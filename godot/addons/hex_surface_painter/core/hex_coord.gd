@tool
class_name HexCoord

enum Layout { POINTY, FLAT }

static func neighbor_directions(layout:int) -> Array:
    var dirs_pointy := [
        Vector2i(+1, 0), Vector2i(+1, -1), Vector2i(0, -1),
        Vector2i(-1, 0), Vector2i(-1, +1), Vector2i(0, +1)
    ]
    var dirs_flat := [
        Vector2i(+1, 0), Vector2i(0, -1), Vector2i(-1, -1),
        Vector2i(-1, 0), Vector2i(0, +1), Vector2i(+1, +1)
    ]
    return (layout == Layout.POINTY ? dirs_pointy : dirs_flat)

static func neighbors(q:int, r:int, layout:int) -> Array[Vector2i]:
    var dirs := neighbor_directions(layout)
    var res: Array[Vector2i] = []
    for dir in dirs:
        res.append(Vector2i(q + dir.x, r + dir.y))
    return res

static func axial_to_offset(q:int, r:int, layout:int) -> Vector2i:
    if layout == Layout.POINTY:
        var col := q + int((r - (r & 1)) / 2)
        return Vector2i(col, r)
    var row := r + int((q - (q & 1)) / 2)
    return Vector2i(q, row)

static func offset_to_axial(x:int, y:int, layout:int) -> Vector2i:
    if layout == Layout.POINTY:
        var q := x - int((y - (y & 1)) / 2)
        return Vector2i(q, y)
    var r := y - int((x - (x & 1)) / 2)
    return Vector2i(x, r)

static func axial_distance(a:Vector2i, b:Vector2i) -> int:
    var dq := a.x - b.x
    var dr := a.y - b.y
    var ds := (-a.x - a.y) - (-b.x - b.y)
    return int((abs(dq) + abs(dr) + abs(ds)) / 2)

static func axial_ring(center:Vector2i, radius:int, layout:int) -> Array[Vector2i]:
    var results: Array[Vector2i] = []
    if radius <= 0:
        results.append(center)
        return results
    var cube := Vector3(center.x, -center.x - center.y, center.y)
    var directions := [
        Vector3(+1, -1, 0), Vector3(+1, 0, -1), Vector3(0, +1, -1),
        Vector3(-1, +1, 0), Vector3(-1, 0, +1), Vector3(0, -1, +1)
    ]
    cube += directions[4] * radius
    for i in range(6):
        for _j in range(radius):
            cube += directions[i]
            results.append(Vector2i(int(cube.x), int(cube.z)))
    return results
