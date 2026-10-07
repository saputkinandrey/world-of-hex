@tool
class_name FloodFill

var layout := HexCoord.Layout.POINTY

func fill_area(start_q:int, start_r:int, predicate:Callable, paint:Callable) -> void:
    var start := Vector2i(start_q, start_r)
    var queue: Array = [start]
    var visited := {start: true}
    while !queue.is_empty():
        var cell:Vector2i = queue.pop_front()
        if predicate.call(cell.x, cell.y):
            paint.call(cell.x, cell.y)
            var neighbors := HexCoord.neighbors(cell.x, cell.y, layout)
            for neighbor in neighbors:
                if visited.has(neighbor):
                    continue
                visited[neighbor] = true
                queue.append(neighbor)
