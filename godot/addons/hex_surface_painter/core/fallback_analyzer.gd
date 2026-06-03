@tool
class_name FallbackAnalyzer

func analyze_tile_edges(img:Image, config:Dictionary) -> Array:
    if img == null:
        return []
    var size := Vector2(img.get_width(), img.get_height())
    if size.x == 0 or size.y == 0:
        return []
    var layout := str(config.get("hex_layout", "pointy")).to_lower()
    var angle_quant := int(config.get("angle_quant_deg", 30))
    if angle_quant <= 0:
        angle_quant = 30
    var center := size / 2.0
    var base_angle := layout == "flat" ? 0.0 : -90.0
    var edges: Array = []
    for i in range(6):
        var angle := deg_to_rad(base_angle + float(i) * 60.0)
        var metrics := _measure_edge(img, center, angle)
        var quant_angle := int(round(rad_to_deg(metrics.angle) / angle_quant) * angle_quant)
        var length_bucket := int(round(metrics.length / max(size.x, size.y) * 10.0))
        edges.append("%02d_%02d" % [quant_angle % 360, length_bucket])
    return edges

class EdgeMetrics:
    var length: float = 0.0
    var angle: float = 0.0

func _measure_edge(img:Image, origin:Vector2, angle:float) -> EdgeMetrics:
    var metrics := EdgeMetrics.new()
    var dir := Vector2(cos(angle), sin(angle))
    if dir.length_squared() == 0:
        return metrics
    dir = dir.normalized()
    var length := 0.0
    var last_pos := origin
    var step := 0.5
    var max_radius := max(img.get_width(), img.get_height()) * 1.5
    img.lock()
    while length < max_radius:
        var pos := origin + dir * length
        var ix := int(round(pos.x))
        var iy := int(round(pos.y))
        if ix < 0 or iy < 0 or ix >= img.get_width() or iy >= img.get_height():
            break
        var color := img.get_pixel(ix, iy)
        if color.a < 0.1:
            break
        last_pos = pos
        length += step
    img.unlock()
    var delta := last_pos - origin
    metrics.length = delta.length()
    metrics.angle = atan2(delta.y, delta.x)
    return metrics
