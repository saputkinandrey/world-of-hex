"""Explicit export of all skin variants and exact mirrored corrected owners."""
import datetime
import uuid
from pathlib import Path
import numpy as np
from PIL import Image

from dataset import ROOT,VERSION,sha
from corrections import write_json


def export_all(dataset,store,models=None):
    models=models or {}
    for model in models.values():
        if model.pending_seeds:
            raise ValueError(f'Pending seed changes in {model.entry.key}; accept or discard before export')
    before={path:sha(path) for key in dataset.keys for path in dataset.entry(key).signature['files']}
    for key in dataset.atlases:
        for skin in range(5):
            path=dataset.source/'results'/key/f'frame-{skin:03d}'/'source.png'
            before[str(path)]=sha(path)
    canonical={}
    for key in dataset.keys:
        model=models[key] if key in models else store.load(key)
        dataset.assert_current(model.entry)
        canonical[key]=model.owners()
    export_id=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'-'+uuid.uuid4().hex[:8]
    output=store.workspace/'exports'/export_id
    if not output.resolve().is_relative_to(ROOT):
        raise ValueError('Export target escaped editor workspace')
    output.mkdir(parents=True,exist_ok=False)
    summary=[]
    for key,atlas in dataset.atlases.items():
        base_key=dataset.canonical(key)
        owners=canonical[base_key][:,::-1] if atlas['mirrored'] else canonical[base_key]
        masks=[]
        for skin in range(5):
            rgba=dataset.texture(key,skin)
            alpha=rgba[:,:,3]>0
            if owners.shape!=alpha.shape or np.any(owners[~alpha]):
                raise ValueError(f'Invalid exported geometry: {key}/skin-{skin}')
            masks.append(alpha)
            folder=output/key/f'frame-{skin:03d}'
            folder.mkdir(parents=True,exist_ok=False)
            np.save(folder/'owners-final.npy',owners,allow_pickle=False)
            Image.fromarray(dataset.colors[owners]).save(folder/'owners-final.png')
            overlay=rgba.copy()
            selected=owners>0
            overlay[selected,:3]=((rgba[selected,:3].astype(np.uint16)+dataset.colors[owners[selected]].astype(np.uint16))//2).astype(np.uint8)
            Image.fromarray(overlay).save(folder/'overlay-final.png')
            (folder/'masks').mkdir()
            for group in range(1,15):
                Image.fromarray(((owners==group)*255).astype(np.uint8)).save(folder/'masks'/f'{dataset.names[group]}.png')
            summary.append({'key':f'{key}/frame-{skin:03d}','canonical_source':base_key,
                'mirrored':atlas['mirrored'],'unknown_pixels':int(np.count_nonzero(alpha&(owners==0)))})
        if any(not np.array_equal(masks[0],m) for m in masks):
            raise ValueError(f'Skin geometry changed at export: {key}')
        if atlas['mirrored']:
            np.testing.assert_array_equal(owners,canonical[base_key][:,::-1])
    if any(sha(path)!=expected for path,expected in before.items()):
        raise ValueError('Historical input changed during export; exported set is not verified')
    write_json(output/'metadata.json',{'version':VERSION,'algorithm_version':'1.1.0','frames':summary,
        'source_signatures':{key:dataset.entry(key).signature for key in dataset.keys},
        'unknown_pixels':sum(r['unknown_pixels'] for r in summary),'historical_inputs_unchanged':True,
        'anatomical_groups':14,'godot_bone_mapping':False,'status':'complete'})
    return output
