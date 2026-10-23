@tool
extends RefCounted

const TRIANGLES: Array[Vector3i] = [Vector3i(0,1,2),Vector3i(0,2,3),Vector3i(0,1,3),Vector3i(1,2,3)]

static func selected_triangles(points: PackedVector2Array) -> int:
	assert(points.size() == 4,"A ligament has four source anchors")
	var hull: PackedVector2Array = Geometry2D.convex_hull(points)
	if hull.size() < 4:
		return 0
	hull.remove_at(hull.size()-1)
	# Keep the source diagonal while it remains valid; screen rotation alone
	# must not switch UV interpolation when the hull's leftmost point changes.
	var pivot: int = maxi(0,hull.find(points[0]))
	var ordered: PackedVector2Array = []
	for index: int in hull.size():
		ordered.append(hull[(pivot+index)%hull.size()])
	var selected: int = 0
	for index: int in range(1,ordered.size()-1):
		var corners: Array[int] = [points.find(ordered[0]),points.find(ordered[index]),points.find(ordered[index+1])]
		corners.sort()
		selected |= 1 << TRIANGLES.find(Vector3i(corners[0],corners[1],corners[2]))
	return selected
