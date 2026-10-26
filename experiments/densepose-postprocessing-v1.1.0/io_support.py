"""Reuse read-only v1.0 helpers; never invoke its pipeline or transfer."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
HIST = ROOT.parent/'densepose-postprocessing-v1.0.0'
sys.path.append(str(HIST))
from core import read,write,sha,provenance,invariants
from pipeline import baseline_for
from render import png,npy,mask,page,palette,overlay,PROVENANCE_COLORS


def load():
    config = read(ROOT/'config.json')
    if config['neighbor_priority_dx_dy'] != [[0,-1],[1,0],[0,1],[-1,0]] or config['cross_view_transfer']:
        raise ValueError('v1.1.0 supports the specified clockwise priority and no cross-view transfer')
    source = (ROOT/config['source']).resolve()
    history = (ROOT/config['historical']).resolve()
    inventory,labels = read(source/'source-inventory.json'),read(source/'labels.json')
    groups = list(labels['groups'])
    lookup = np.zeros(25,np.uint8)
    for i,name in enumerate(groups,1):
        lookup[labels['groups'][name]] = i
    data = {}
    for atlas in inventory['atlases']:
        key = f'{atlas["pose"]}/{atlas["direction"]}'
        if atlas['hframes']*atlas['vframes'] != 5:
            raise ValueError(f'Unsupported skin count: {key}')
        baseline = baseline_for(atlas,config)
        frames = []
        for skin in range(5):
            path = source/'results'/key/f'frame-{skin:03d}'/'source.png'
            frames.append({'path':path,'rgba':np.array(Image.open(path).convert('RGBA'))})
        a = frames[baseline]['rgba'][:,:,3]>0
        for frame in frames:
            if frame['rgba'].shape[:2] != a.shape or not np.array_equal(frame['rgba'][:,:,3]>0,a):
                raise ValueError(f'Binary skin geometry mismatch: {key}; automatic reuse refused')
        dense_path = source/'results'/key/f'frame-{baseline:03d}'/'class-map.npy'
        dense = np.load(dense_path,allow_pickle=False)
        if dense.dtype != np.uint8 or dense.shape != a.shape or dense.max()>24:
            raise ValueError(f'Invalid compact DensePose map: {key}')
        original = lookup[dense]
        original[~a] = 0
        r2_path = history/'flood-fill'/key/'flood-r2'/'anatomical-owners.npy'
        r2 = np.load(r2_path,allow_pickle=False)
        if r2.shape != a.shape:
            raise ValueError(f'Historical r2 shape mismatch: {key}')
        data[key] = {'atlas':atlas,'baseline':baseline,'frames':frames,'alpha':a,
                     'original':original,'r2':r2,'dense_path':dense_path,'r2_path':r2_path}
    return config,inventory,labels,groups,data
