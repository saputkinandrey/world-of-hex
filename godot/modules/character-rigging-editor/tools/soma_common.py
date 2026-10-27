"""SOMA calibration file contract and rigid transforms; no raster mutation."""
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.spatial.transform import Rotation

MODULE = Path(__file__).resolve().parents[1]
REPO = MODULE.parents[2]
ROOT = MODULE / 'soma'
VERSION = '1.0.0'
PYTHON = Path('C:/Users/Public/motionbricks-runtime/motionbricks/.venv/Scripts/python.exe')


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write(path, value):
    path = Path(path)
    if not path.resolve().is_relative_to(MODULE.resolve()):
        raise ValueError(f'Write outside Character Rigging Editor: {path}')
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    temporary.replace(path)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def canonical():
    value = read(ROOT / 'canonical.json')
    expected = read(REPO / 'experiments/motionbricks-v0.2.0/results/soma-skeleton-layout.json')
    if value['joint_names'] != expected['joint_names'] or value['parents'] != expected['parent_indices'] or len(value['parents']) != 77:
        raise ValueError('Canonical SOMA hierarchy differs from pinned MotionBricks 0.2.0')
    return value


def fk(model, factors=None, pose=None):
    """Column-vector composition, Y-up, metres, local XYZW rotations."""
    offsets = np.array(model['offsets_m'], float)
    if factors is not None:
        offsets *= np.asarray(factors)[:, None]
    local = Rotation.from_quat(model['local_quaternions_xyzw']).as_matrix()
    if pose is not None:
        local = local @ Rotation.from_rotvec(pose).as_matrix()
    positions = np.empty((77, 3))
    bases = np.empty((77, 3, 3))
    for i, parent in enumerate(model['parents']):
        if parent < 0:
            positions[i], bases[i] = offsets[i], local[i]
        else:
            positions[i] = positions[parent] + bases[parent] @ offsets[i]
            bases[i] = bases[parent] @ local[i]
    return positions


def camera_basis(camera):
    yaw, pitch = camera['yaw'], camera['pitch']
    right = np.array([np.cos(yaw), 0, np.sin(yaw)])
    down = np.array([-np.sin(pitch)*np.sin(yaw), -np.cos(pitch), np.sin(pitch)*np.cos(yaw)])
    return np.array([right, down])


def project(points, camera):
    return np.asarray(points) @ camera_basis(camera).T * camera['pixels_per_metre'] + [camera['tx'], camera['ty']]


def case_path(key):
    parts = key.split('/')
    if len(parts) != 2 or any(not p for p in parts) or any(p not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for p in ''.join(parts)):
        raise ValueError(f'Invalid case key: {key}')
    return ROOT / 'cases' / parts[0] / (parts[1] + '.json')


def override_path(key):
    return ROOT / 'overrides' / (case_path(key).relative_to(ROOT / 'cases'))


def overrides(key):
    path = override_path(key)
    value = read(path) if path.exists() else {'version': VERSION, 'key': key, 'pins': {}, 'mapping': {}, 'excluded_chunks': [], 'verified_semantics': False, 'verified_registration': False, 'art_corrections': {}}
    if value['key'] != key or value['version'] != VERSION:
        raise ValueError('Override identity/version mismatch')
    return value
