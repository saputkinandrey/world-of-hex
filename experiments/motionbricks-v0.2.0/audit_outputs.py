import json
import sys
import numpy as np
from paths import ROOT, REPO, OUTPUT_ROOT
sys.path.insert(0,str(REPO))
import warp as wp
from motionbricks.io.usd import load_skeleton_from_usd
from motionbricks.io.utils import get_asset_file,SOMA_SKELETON_PRIM_PATH
wp.init()
wp.set_device('cpu')
skeleton=load_skeleton_from_usd(get_asset_file('human','soma_base_skel_minimal_no_root.usd'),SOMA_SKELETON_PRIM_PATH)
layout=dict(joint_names=skeleton.joint_names,parent_indices=skeleton.parent_indices.numpy().tolist(),num_joints=skeleton.num_joints,pose_layout='local transforms [x,y,z,qx,qy,qz,qw]; root world placement is Z-up in the generated examples')
(OUTPUT_ROOT/'results/soma-skeleton-layout.json').write_text(json.dumps(layout,indent=2)+'\n')
archives={}
for filename in ['soma-generations.npz','fp32-sample.npz','fp16-sample.npz','inbetweener/poses.npz']:
    with np.load(ROOT/'results'/filename,allow_pickle=False) as data:
        archives[filename]={}
        for name in data.files:
            a=data[name]
            if a.ndim!=3 or a.shape[1:]!=(skeleton.num_joints,7) or not np.isfinite(a).all(): raise ValueError(f'Invalid output layout: {filename}/{name}')
            archives[filename][name]=dict(shape=list(a.shape),dtype=str(a.dtype),finite=True)
report=dict(expected_usd_joint_count=skeleton.num_joints,archives=archives)
(OUTPUT_ROOT/'results/final-array-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
