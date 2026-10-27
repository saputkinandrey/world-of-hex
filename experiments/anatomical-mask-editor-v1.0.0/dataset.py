"""Read-only inventory-backed source loading and immutable source contracts."""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from dataclasses import dataclass

sys.dont_write_bytecode=True
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parent
VERSION='1.0.0'


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda:stream.read(8*1024*1024),b''):
            h.update(block)
    return h.hexdigest()


@dataclass
class Entry:
    key: str
    original: np.ndarray
    filled: np.ndarray
    alpha: np.ndarray
    textures: list
    provenance: np.ndarray
    distance: np.ndarray
    baseline: int
    signature: dict


class Dataset:
    def __init__(self, config=None):
        self.config=config or read(ROOT/'config.json')
        self.source=(ROOT/self.config['source']).resolve()
        self.inventory_path=(ROOT/self.config['inventory']).resolve()
        inventory=read(self.inventory_path)
        self.atlases={f'{a["pose"]}/{a["direction"]}':a for a in inventory['atlases']}
        self.keys=[key for key,a in self.atlases.items() if not a['mirrored']]
        if len(self.keys)!=32:
            raise ValueError(f'Expected 32 independent atlas entries, got {len(self.keys)}')
        self.labels_path=self.source/'labels.json'
        self.labels=read(self.labels_path)
        self.names={int(i):name for i,name in self.labels['owner_ids'].items()}
        if set(self.names)!=set(range(15)) or len(self.labels['groups'])!=14:
            raise ValueError('Expected existing 14 anatomical owner groups plus unknown')
        self.colors=np.array([[50,52,57]]+[self.labels['palette_rgb'][self.names[i]] for i in range(1,15)],np.uint8)
        self.algorithm_path=self.source/'flood.py'
        spec=importlib.util.spec_from_file_location('mask_editor_source_converge',self.algorithm_path)
        module=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.converge=module.converge
        self.cache={}

    def canonical(self,key):
        atlas=self.atlases[key]
        return f'{atlas["pose"]}/{atlas["source_direction"]}' if atlas['mirrored'] else key

    def signature(self,key):
        canonical=self.canonical(key)
        folder=self.source/'results'/canonical/'frame-000'
        paths=[self.algorithm_path,self.labels_path,self.inventory_path,folder/'metadata.json']
        paths += [folder/name for name in ['owners-original.npy','owners-filled.npy','provenance.npy','flood-distance.npy']]
        paths += [self.source/'results'/canonical/f'frame-{skin:03d}'/'source.png' for skin in range(5)]
        return {'key':canonical,'algorithm_version':'1.1.0',
                'baseline_frame':read(folder/'metadata.json')['baseline_frame'],
                'files':{str(path):sha(path) for path in paths}}

    def entry(self,key):
        key=self.canonical(key)
        if key in self.cache:
            return self.cache[key]
        folder=self.source/'results'/key/'frame-000'
        signature=self.signature(key)
        textures=[np.array(Image.open(self.source/'results'/key/f'frame-{i:03d}'/'source.png').convert('RGBA')) for i in range(5)]
        alpha=textures[signature['baseline_frame']][:,:,3]>0
        if any(t.shape!=textures[0].shape or not np.array_equal(t[:,:,3]>0,alpha) for t in textures):
            raise ValueError(f'Skin geometry mismatch: {key}')
        arrays={name:np.load(folder/f'{name}.npy',allow_pickle=False) for name in ['owners-original','owners-filled','provenance','flood-distance']}
        if any(a.shape!=alpha.shape for a in arrays.values()):
            raise ValueError(f'Source array geometry mismatch: {key}')
        for name in ['owners-original','owners-filled']:
            a=arrays[name]
            if a.dtype!=np.uint8 or a.max()>14 or np.any(a[~alpha]):
                raise ValueError(f'Invalid source owners: {key}/{name}')
        entry=Entry(key,arrays['owners-original'],arrays['owners-filled'],alpha,textures,
                    arrays['provenance'],arrays['flood-distance'],signature['baseline_frame'],signature)
        self.cache[key]=entry
        return entry

    def assert_current(self,entry):
        if self.signature(entry.key)!=entry.signature:
            raise ValueError(f'Source data changed for {entry.key}; saved edits cannot be applied to this source')

    def texture(self,key,skin):
        canonical=self.canonical(key)
        entry=self.entry(canonical)
        if not self.atlases[key]['mirrored']:
            return entry.textures[skin]
        texture=np.array(Image.open(self.source/'results'/key/f'frame-{skin:03d}'/'source.png').convert('RGBA'))
        if texture.shape!=entry.textures[skin].shape or not np.array_equal(texture[:,:,3]>0,entry.alpha[:,::-1]):
            raise ValueError(f'Mirror source geometry mismatch: {key}')
        return texture
