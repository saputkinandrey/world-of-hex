"""Offline asset compiler. No animation or raster renderer; GPU work is Godot's."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

sys.dont_write_bytecode = True
import numpy as np
from PIL import Image

MODULE = Path(__file__).resolve().parents[1]
REPO = MODULE.parents[2]
RES = 'res://modules/character-rigging-editor/'
MASK_EDITOR = REPO / 'experiments/anatomical-mask-editor-v1.0.0'
sys.path.insert(0, str(MASK_EDITOR))
from dataset import Dataset

BONES = ['Pelvis', 'Spine', 'Chest', 'Head', 'ArmL', 'ForearmL', 'ArmR', 'ForearmR', 'ThighL', 'CalfL', 'ThighR', 'CalfR']
PARENTS = [-1, 0, 1, 2, 2, 4, 2, 6, 0, 8, 0, 10]
PATHS = ['Pelvis', 'Pelvis/Spine', 'Pelvis/Spine/Chest', 'Pelvis/Spine/Chest/Head', 'Pelvis/Spine/Chest/ArmL', 'Pelvis/Spine/Chest/ArmL/ForearmL', 'Pelvis/Spine/Chest/ArmR', 'Pelvis/Spine/Chest/ArmR/ForearmR', 'Pelvis/ThighL', 'Pelvis/ThighL/CalfL', 'Pelvis/ThighR', 'Pelvis/ThighR/CalfR']
GROUP_BONES = {2: 7, 3: 5, 4: 9, 5: 11, 6: 10, 7: 8, 8: 11, 9: 9, 10: 4, 11: 6, 12: 5, 13: 7, 14: 3}


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def owners_for(dataset, key):
    entry = dataset.entry(key)
    meta_path = MASK_EDITOR / 'edits' / key / 'metadata.json'
    if not meta_path.exists():
        return entry, entry.filled.copy(), 'Flood Fill'
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    if meta['status'] != 'Accepted':
        return entry, entry.filled.copy(), 'Flood Fill'
    if meta['source_signature'] != entry.signature or meta['version'] != '1.0.0':
        raise ValueError(f'Stale accepted manual correction: {key}')
    archive = (meta_path.parent / meta['archive']).resolve()
    if not archive.is_relative_to(meta_path.parent.resolve()):
        raise ValueError(f'Archive escapes correction directory: {key}')
    if hashlib.sha256(archive.read_bytes()).hexdigest() != meta['archive_sha256']:
        raise ValueError(f'Correction archive hash mismatch: {key}')
    with np.load(archive, allow_pickle=False) as data:
        seed, final = data['seed_overrides'], data['final_overrides']
        for a in [seed, final]:
            if a.shape != entry.alpha.shape or a.dtype.kind != 'i' or np.any(a < -1) or np.any(a > 14) or np.any(a[~entry.alpha] != -1):
                raise ValueError(f'Invalid manual override: {key}')
        if np.any(final == 0):
            raise ValueError(f'Zero final owner: {key}')
        seeds = entry.original.copy()
        seeds[seed != -1] = seed[seed != -1]
        result = dataset.converge(seeds, entry.alpha)['owners']
        result[final != -1] = final[final != -1]
    return entry, result, 'Manually corrected'


def centroid(owners, groups, description, explicit_anchors=None):
    ys, xs = np.nonzero(np.isin(owners, groups))
    if not len(xs):
        if explicit_anchors is not None and description in explicit_anchors:
            return np.array(explicit_anchors[description],dtype=float)
        raise ValueError(f'Missing anatomy for joint initializer: {description}; manual joint authoring required')
    return np.array([xs.mean() + .5, ys.mean() + .5])


def initialize_joints(owners, pose, direction):
    # The old Idle calibration's L/R coordinates oppose the DensePose labels.
    # Use the contractual group->bone mapping uniformly for every NEW pose.
    # Neither labels, bone names nor the old rig are swapped or modified.
    anchors = json.loads((MODULE/'initial-anchors.json').read_text()).get(f'{direction}/{pose}',{})
    torso = centroid(owners, [1], 'Torso')
    head = centroid(owners, [14], 'Head')
    pelvis = torso + [0, 9]
    chest = torso + [0, -9]
    joints = [pelvis, torso, chest, (head + chest) / 2]
    ends = {'HeadTip': head + [0, -8]}
    for side, upper, lower, hand in [('L', 10, 12, 3), ('R', 11, 13, 2)]:
        u = centroid(owners, [upper], side + ' upper arm')
        l = centroid(owners, [lower], side + ' lower arm')
        joints += [u + (u - l) * .55, (u + l) / 2]
        ends['Hand' + side] = centroid(owners, [hand, lower], side + ' hand').tolist()
    for side, upper, lower, foot in [('L', 7, 9, 4), ('R', 6, 8, 5)]:
        u = centroid(owners, [upper], side + ' upper leg',anchors)
        l = centroid(owners, [lower], side + ' lower leg',anchors)
        joints += [(u + pelvis) / 2, (u + l) / 2]
        ends['Foot' + side] = centroid(owners, [foot, lower], side + ' foot',anchors).tolist()
    return np.round(joints, 3).tolist(), {k: np.round(v, 3).tolist() for k, v in ends.items()}


def compile_pose(dataset, pose, direction, rebuild=False):
    key = f'{pose}/{direction}'
    entry, owners, source = owners_for(dataset, key)
    pose_path=MODULE/'poses'/direction/f'{pose}.json'
    if pose_path.exists() and not rebuild:
        saved=json.loads(pose_path.read_text(encoding='utf-8-sig'))
        if saved['source_signature']!=entry.signature or saved['mask_source']!=source or not np.array_equal(np.load(MODULE/'assets'/direction/pose/'owners.npy'),owners):
            raise ValueError(f'Inputs changed for {key}; explicitly rebuild after preserving edited KeyPose resources')
        return saved
    if np.any(owners[entry.alpha] == 0):
        raise ValueError(f'Unowned foreground in {key}')
    joints, ends = initialize_joints(owners, pose, direction)
    folder = MODULE / 'assets' / direction / pose
    folder.mkdir(parents=True, exist_ok=True)
    for skin, pixels in enumerate(entry.textures):
        Image.fromarray(pixels).save(folder / f'skin-{skin}.png')
    overlay = np.zeros((*owners.shape, 4), np.uint8)
    overlay[:, :, :3] = dataset.colors[owners]
    overlay[:, :, 3] = entry.textures[0][:, :, 3]
    Image.fromarray(overlay).save(folder / 'anatomy.png')
    np.save(folder / 'owners.npy', owners)
    bone_map = np.full(owners.shape, -1, np.int16)
    for group, bone in GROUP_BONES.items():
        bone_map[owners == group] = bone
    # Existing three axial bone semantics retained: explicit nearest torso anchor.
    for y, x in zip(*np.nonzero(owners == 1)):
        bone_map[y, x] = min(range(3), key=lambda b: np.linalg.norm(np.array([x+.5, y+.5]) - joints[b]))
    angles, lengths = [], []
    target_names = ['Spine', 'Chest', 'Head', 'HeadTip', 'ForearmL', 'HandL', 'ForearmR', 'HandR', 'CalfL', 'FootL', 'CalfR', 'FootR']
    for i, name in enumerate(target_names):
        target = joints[BONES.index(name)] if name in BONES else ends[name]
        delta = np.array(target) - joints[i]
        angles.append(float(math.atan2(delta[1], delta[0])))
        lengths.append(float(np.linalg.norm(delta)))
    vertices, uvs, polygons, weights, edges = ([[] for _ in range(12)] for _ in range(5))
    h, w = owners.shape
    for y, x in zip(*np.nonzero(entry.alpha)):
        b = int(bone_map[y, x])
        start = len(vertices[b])
        polygons[b] += [[start, start+1, start+2], [start, start+2, start+3]]
        for a, c, xx, yy in [(0,1,x,y-1),(1,2,x+1,y),(2,3,x,y+1),(3,0,x-1,y)]:
            other = int(bone_map[yy,xx]) if 0 <= xx < w and 0 <= yy < h else -1
            if other != b:
                edges[b].append([start+a,start+c,other>=0])
        for dx, dy in [(0,0), (1,0), (1,1), (0,1)]:
            px, py = int(x+dx), int(y+dy)
            vertices[b].append([px, py])
            uvs[b].append([px, py])
            # Native-texel finite joint band. Unrelated touching parts never weld.
            counts = {}
            for yy in range(max(0,py-2), min(h,py+2)):
                for xx in range(max(0,px-2), min(w,px+2)):
                    c = int(bone_map[yy,xx])
                    if c >= 0 and (c == b or PARENTS[b] == c or PARENTS[c] == b):
                        counts[c] = counts.get(c, 0) + 1
            total = sum(counts.values())
            weights[b].append([counts.get(c,0)/total for c in range(12)])
    asset = RES + f'assets/{direction}/{pose}/'
    data = dict(version='1.0.0', pose=pose, direction=direction, texture=asset+'skin-0.png', skins=[asset+f'skin-{s}.png' for s in range(5)], anatomy=asset+'anatomy.png', mask_source=source, source_signature=entry.signature, joints=joints, original_joints=joints, angles=angles, original_angles=angles, lengths=lengths, original_lengths=lengths, root_offset=[0,0], bone_names=BONES, parents=PARENTS, paths=PATHS, groups=dataset.names, group_bones=GROUP_BONES, vertices=vertices, uvs=uvs, polygons=polygons, weights=weights, edges=edges, deformation=[1.0]*12, z_order=list(range(12)), weight_band_pixels=2, initializer='Per-pose anatomical estimates. DensePose Left->ArmL, Right->ArmR; old Idle L/R coordinates conflict and are NOT copied. Requires operator review.', pixel_count=int(entry.alpha.sum()))
    write(MODULE / 'poses' / direction / f'{pose}.json', data)
    return data


def bone_scene():
    text = '[gd_scene load_steps=2 format=3]\n\n[ext_resource type="Script" path="'+RES+'rig.gd" id="1"]\n\n[node name="Rig" type="Node2D"]\nscript = ExtResource("1")\ntexture_filter = 1\n\n[node name="Skeleton2D" type="Skeleton2D" parent="."]\n'
    for i, name in enumerate(BONES):
        parent = 'Skeleton2D' + ('/' + PATHS[PARENTS[i]] if PARENTS[i] >= 0 else '')
        text += f'\n[node name="{name}" type="Bone2D" parent="{parent}"]\nrest = Transform2D(1,0,0,1,0,0)\nauto_calculate_length_and_angle = false\nlength = 10.0\n'
    for name in BONES:
        text += f'\n[node name="{name}" type="Polygon2D" parent="."]\nskeleton = NodePath("../Skeleton2D")\nantialiased = false\n'
    text += '\n[node name="Anatomy" type="Sprite2D" parent="."]\ncentered = false\nvisible = false\n'
    (MODULE / 'rig.tscn').write_text(text)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--stage', choices=['A','B','D','E'], default='A')
    parser.add_argument('--rebuild',action='store_true',help='Explicitly replace generated KeyPose files, including edited joints')
    args=parser.parse_args()
    stage = args.stage
    dataset = Dataset()
    poses = ['idle'] if stage == 'A' else ['idle','aim-pistol'] if stage == 'B' else ['idle','walk','aim-pistol']
    directions = ['south-west','north-west'] if stage == 'E' else ['south-west']
    for direction in directions:
        for pose in poses:
            data = compile_pose(dataset, pose, direction,args.rebuild)
            print(direction, pose, data['mask_source'], data['pixel_count'])
    bone_scene()
