"""Deterministic owner propagation; no model/runtime dependency."""
import hashlib
import json
from collections import deque
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
BACKGROUND, ORIGINAL, FLOOD, CROSS, UNKNOWN = 0, 1, 2, 3, 4
UNREACHABLE = 32767


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(8*1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()


def neighbors(mask):
    result = np.zeros_like(mask)
    result[1:] |= mask[:-1]
    result[:-1] |= mask[1:]
    result[:,1:] |= mask[:,:-1]
    result[:,:-1] |= mask[:,1:]
    return result


def distances(owners, alpha, radius, group_count):
    unknown = alpha & (owners == 0)
    fields = np.full((group_count, *owners.shape), UNREACHABLE, dtype=np.int16)
    for group in range(1, group_count+1):
        frontier = alpha & (owners == group)
        visited = frontier.copy()
        fields[group-1, frontier] = 0
        for distance in range(1, radius+1):
            frontier = neighbors(frontier) & unknown & ~visited
            fields[group-1, frontier] = distance
            visited |= frontier
    return fields


def flood(owners, alpha, radius, group_count):
    fields = distances(owners, alpha, radius, group_count)
    nearest = fields.min(axis=0)
    ties = (fields == nearest).sum(axis=0)
    u = alpha & (owners == 0)
    eligible = u & (nearest <= radius)
    added = eligible & (ties == 1)
    result = owners.copy()
    result[added] = (fields.argmin(axis=0)+1)[added]
    ambiguous = eligible & (ties > 1)
    return result, ambiguous, np.where(nearest == UNREACHABLE, -1, nearest).astype(np.int16)


def transform(array, mirror=False, dx=0, dy=0):
    """Reflect each native frame, then translate; never wrap or interpolate."""
    source = array[:, ::-1] if mirror else array
    h, w = array.shape[:2]
    out = np.zeros_like(array)
    x0, x1, y0, y1 = max(0, dx), min(w, w+dx), max(0,dy), min(h,h+dy)
    if x1 > x0 and y1 > y0:
        out[y0:y1,x0:x1] = source[y0-dy:y1-dy,x0-dx:x1-dx]
    return out


def neighborhood_agreement(a, b, radius):
    equal = a == b
    for dy in range(-radius, radius+1):
        for dx in range(-radius, radius+1):
            # Invalid border neighborhoods are never accepted.
            equal &= transform((a == b), dx=dx, dy=dy)
    return equal & a & b


def transfer(south, south_alpha, north, north_alpha, flood_north, config, group_count):
    hypotheses = config['transfer_hypotheses']
    candidates, geometry = [], []
    for hypothesis in hypotheses:
        owner = transform(south, **hypothesis)
        alpha = transform(south_alpha, **hypothesis)
        candidates.append(owner)
        geometry.append(neighborhood_agreement(alpha, north_alpha, config['silhouette_neighborhood_radius']))
    proposal = candidates[0].copy()
    unanimous = np.logical_and.reduce([c == proposal for c in candidates]) & (proposal > 0)
    geometric = np.logical_and.reduce(geometry)
    proposal[~(unanimous & geometric & north_alpha)] = 0
    conflicts = np.logical_or.reduce([(north > 0) & (candidate > 0) & (north != candidate) & geo
                                     for candidate,geo in zip(candidates,geometry)])
    anchor_fields = distances(north, north_alpha, config['north_anchor_max_distance'], group_count)
    supported = np.zeros_like(north_alpha)
    for group in range(1, group_count+1):
        present = anchor_fields <= config['north_anchor_max_distance']
        supported |= (proposal == group) & present[group-1] & (present.sum(axis=0) == 1)
    accepted = north_alpha & (north == 0) & (flood_north == 0) & (proposal > 0) & supported
    assisted = flood_north.copy()
    assisted[accepted] = proposal[accepted]
    return assisted, accepted, conflicts, proposal, geometric, unanimous, supported


def provenance(owners, original, alpha, cross=None):
    result = np.full(owners.shape, BACKGROUND, dtype=np.uint8)
    result[alpha] = UNKNOWN
    result[alpha & (original > 0)] = ORIGINAL
    result[alpha & (original == 0) & (owners > 0)] = FLOOD
    if cross is not None:
        result[cross] = CROSS
    return result


def components(mask, boundary_owners=None):
    visited = np.zeros_like(mask)
    values = []
    h, w = mask.shape
    for sy, sx in zip(*np.where(mask)):
        if visited[sy,sx]:
            continue
        queue, area, bordering = deque([(int(sy),int(sx))]), 0, set()
        visited[sy,sx] = True
        while queue:
            y,x = queue.popleft()
            area += 1
            for ny,nx in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
                if 0 <= ny < h and 0 <= nx < w:
                    if boundary_owners is not None and boundary_owners[ny,nx] > 0:
                        bordering.add(int(boundary_owners[ny,nx]))
                    if mask[ny,nx] and not visited[ny,nx]:
                        visited[ny,nx] = True
                        queue.append((ny,nx))
        values.append({'area':area,'boundary_groups':sorted(bordering)})
    return sorted(values,key=lambda c:-c['area'])


def invariants(original, result, alpha, origins):
    fixed = original > 0
    assert np.array_equal(result[fixed], original[fixed]), 'Fixed owner overwritten'
    assert not np.any(result[~alpha]), 'Owner outside alpha'
    added = (result > 0) & ~fixed
    assert not np.any(added & ~alpha)
    assert np.all(np.isin(origins[added], [FLOOD,CROSS]))
    assert np.all(origins[fixed] == ORIGINAL)
    assert np.all(origins[alpha & (result == 0)] == UNKNOWN)
