"""Read the pinned upstream rest skeleton on CPU, preserving all 77 joints."""
import sys

import numpy as np

from soma_common import REPO, ROOT, VERSION, fk, read, sha, write


def export():
    config = read(REPO / 'experiments/motionbricks-v0.2.0/config.json')
    upstream = __import__('pathlib').Path(config['runtime_root']) / 'motionbricks'
    sys.path.insert(0, str(upstream))
    import warp as wp
    wp.init()
    wp.set_device('cpu')
    from motionbricks.io.usd import load_skeleton_from_usd
    from motionbricks.io.utils import SOMA_SKELETON_PRIM_PATH, get_asset_file
    path = get_asset_file('human', 'soma_base_skel_minimal_no_root.usd')
    skeleton = load_skeleton_from_usd(path, SOMA_SKELETON_PRIM_PATH)
    transforms = skeleton.reference_local_transforms.numpy().astype(float)
    value = {'version': VERSION, 'motionbricks_version': '0.2.0', 'upstream_commit': config['upstream_commit'],
             'source_usd': str(path), 'source_sha256': sha(path), 'up_axis': 'Y', 'units': 'metres',
             'joint_names': skeleton.joint_names, 'parents': skeleton.parent_indices.numpy().tolist(),
             'offsets_m': transforms[:, :3].tolist(), 'local_quaternions_xyzw': transforms[:, 3:].tolist()}
    value['rest_positions_m'] = fk(value).tolist()
    if len(value['joint_names']) != 77 or not np.isfinite(transforms).all():
        raise ValueError('Invalid upstream rest transforms')
    write(ROOT / 'canonical.json', value)


if __name__ == '__main__':
    export()
