"""Synchronous clockwise owner decisions after order-independent BFS distances."""
from collections import deque
import numpy as np

# Codes describe the neighbor relative to the target pixel, never anatomy IDs.
NONE, NORTH, EAST, SOUTH, WEST = 0, 1, 2, 3, 4
NEIGHBOR_PRIORITY = [(0,-1),(1,0),(0,1),(-1,0)]
MIRROR_DIRECTION = np.array([NONE,NORTH,WEST,SOUTH,EAST],dtype=np.uint8)


def converge(original, alpha, reverse_seeds=False, reverse_pixels=False):
    if original.shape != alpha.shape or original.ndim != 2:
        raise ValueError('Owners and alpha must have the same two-dimensional shape')
    if np.any(original[~alpha]):
        raise ValueError('Original owner outside alpha; preserve unclipped source separately')
    owners = original.copy()
    distance = np.full(original.shape,-1,dtype=np.int32)
    seeds = list(zip(*np.where(original>0)))
    if reverse_seeds:
        seeds.reverse()
    queue = deque((int(y),int(x)) for y,x in seeds)
    for y,x in seeds:
        distance[y,x] = 0
    h,w = original.shape
    while queue:
        y,x = queue.popleft()
        for dx,dy in NEIGHBOR_PRIORITY:
            ny,nx = y+dy,x+dx
            if 0 <= ny < h and 0 <= nx < w and alpha[ny,nx] and distance[ny,nx] < 0:
                distance[ny,nx] = distance[y,x]+1
                queue.append((ny,nx))
    direction = np.zeros(original.shape,dtype=np.uint8)
    positive = distance > 0
    coordinates = list(zip(*np.where(positive)))
    # Group all reachable pixels into distance waves, without a preset wave cap.
    waves = {}
    for y,x in coordinates:
        waves.setdefault(int(distance[y,x]),[]).append((int(y),int(x)))
    added_per_wave = []
    for depth in sorted(waves):
        pixels = waves[depth][::-1] if reverse_pixels else waves[depth]
        assignments = []
        for y,x in pixels:
            candidates = []
            for code,(dx,dy) in enumerate(NEIGHBOR_PRIORITY,1):
                ny,nx = y+dy,x+dx
                if 0 <= ny < h and 0 <= nx < w and distance[ny,nx] == depth-1:
                    if owners[ny,nx] == 0:
                        raise AssertionError('Previous wave was not assigned')
                    candidates.append((code,int(owners[ny,nx])))
            if not candidates:
                raise AssertionError('Reachable pixel without a previous-wave predecessor')
            winner_code,winner_owner = candidates[0]
            conflict = len({owner for _,owner in candidates}) > 1
            assignments.append((y,x,winner_owner,winner_code if conflict else NONE))
        # Commit only after the entire wave has been decided.
        for y,x,owner,code in assignments:
            owners[y,x] = owner
            direction[y,x] = code
        added_per_wave.append(len(assignments))
    return {'owners':owners,'distance':distance,'tie_direction':direction,
            'tie_mask':direction!=NONE,'unknown':alpha&(owners==0),
            'wave_counts':added_per_wave,'max_depth':max(waves,default=0),
            'terminal_delta':0,'stop_reason':'all_silhouette_assigned' if not np.any(alpha&(owners==0)) else 'frontier_exhausted'}


def mirror_result(result):
    mirrored = {key:value[:,::-1].copy() if isinstance(value,np.ndarray) else value
                for key,value in result.items()}
    mirrored['tie_direction'] = MIRROR_DIRECTION[mirrored['tie_direction']]
    return mirrored


def unreachable_components(mask):
    seen = np.zeros_like(mask)
    h,w = mask.shape
    regions = []
    for y,x in zip(*np.where(mask)):
        if seen[y,x]:
            continue
        seen[y,x] = True
        queue,coords = deque([(int(y),int(x))]),[]
        while queue:
            cy,cx = queue.popleft()
            coords.append([cx,cy])
            for dx,dy in NEIGHBOR_PRIORITY:
                nx,ny = cx+dx,cy+dy
                if 0 <= nx < w and 0 <= ny < h and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx] = True
                    queue.append((ny,nx))
        regions.append({'id':len(regions),'area':len(coords),'coordinates_xy':coords,
                        'reason':'four_connected_alpha_component_has_no_original_seed'})
    return regions
