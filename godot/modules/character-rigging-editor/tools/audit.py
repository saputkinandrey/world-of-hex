"""Input/owner/geometry checks and read-only preservation snapshots."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import numpy as np
from PIL import Image

import prepare

ROOT, REPO = prepare.MODULE, prepare.REPO


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def snapshot():
    paths=set()
    for folder in ['densepose-full-character-v1.0.0','densepose-postprocessing-v1.0.0','densepose-postprocessing-v1.1.0','anatomical-mask-editor-v1.0.0']:
        directory=REPO/'experiments'/folder
        paths.update(p for p in directory.rglob('*') if p.is_file() and not any(x in p.parts for x in ['cache','__pycache__','.venv']))
    paths.update(p for p in (REPO/'godot/modules/character-animation-workbench').rglob('*') if p.is_file())
    inventory=json.loads((REPO/'experiments/densepose-full-character-v1.0.0/source-inventory.json').read_text())
    for atlas in inventory['atlases']:
        path=REPO/atlas['source_file']
        assert digest(path)==atlas['source_sha256'], f'Atlas differs from original inventory: {path}'
        paths.add(path)
    return {p.relative_to(REPO).as_posix():digest(p) for p in sorted(paths)}


def check_assets():
    dataset=prepare.Dataset()
    result={}
    for direction in ['south-west','north-west']:
        for pose in ['idle','walk','aim-pistol']:
            key=f'{pose}/{direction}'
            entry, owners, source=prepare.owners_for(dataset,key)
            path=ROOT/'poses'/direction/f'{pose}.json'
            data=json.loads(path.read_text())
            assert data['mask_source']==source
            assert data['source_signature']==entry.signature
            assert np.array_equal(np.load(ROOT/'assets'/direction/pose/'owners.npy'),owners)
            assert not np.any(owners[~entry.alpha])
            for skin in range(5):
                assert np.array_equal(np.array(Image.open(ROOT/'assets'/direction/pose/f'skin-{skin}.png')),entry.textures[skin])
            counts=[]
            for b in range(12):
                weights=np.array(data['weights'][b])
                if len(weights):
                    assert np.allclose(weights.sum(axis=1),1)
                    assert weights.min()>=0 and weights.max()<=1
                assert len(data['vertices'][b])==len(weights)
                counts.append(len(weights)//4)
            assert all(counts[i]>0 for i in range(3)), 'Torso must have three axial owners'
            assert sum(counts)==int(entry.alpha.sum())
            assert data['paths']==prepare.PATHS
            sides={}
            if pose=='idle':
                old=json.loads((REPO/'godot/modules/character-animation-workbench/rig-calibration.json').read_text())['views'][direction]
                for label,group,bone in [('Left',10,4),('Right',11,6)]:
                    center=prepare.centroid(owners,[group],label)
                    own=np.linalg.norm(center-np.array(data['joints'][bone]))
                    other=np.linalg.norm(center-np.array(data['joints'][6 if bone==4 else 4]))
                    old_own=np.linalg.norm(center-np.array(old[data['bone_names'][bone]]))
                    old_other=np.linalg.norm(center-np.array(old['ArmR' if bone==4 else 'ArmL']))
                    sides[label]=dict(group_id=group,bone=data['bone_names'][bone],centroid=center.tolist(),distance_to_own_shoulder=float(own),distance_to_opposite_shoulder=float(other),closer_to_opposite=bool(other<own),old_calibration_closer_to_opposite=bool(old_other<old_own),decision='Own anatomy initializes all new poses; labels and bone names unchanged')
                    assert own<other, 'New joint initializer violates anatomical side correspondence'
            result[key]=dict(mask_source=source,pixels=int(entry.alpha.sum()),bone_pixel_counts=counts,left_right_check=sides)
    # Import an Accepted archive in a separate fixture directory, never the user's editor.
    original_root=prepare.MASK_EDITOR
    with tempfile.TemporaryDirectory(dir=ROOT/'cache',prefix='manual-import-') as temporary:
        try:
            prepare.MASK_EDITOR=Path(temporary)
            key='idle/south-west'
            entry=dataset.entry(key)
            folder=prepare.MASK_EDITOR/'edits'/key
            folder.mkdir(parents=True)
            seed=np.full(entry.alpha.shape,-1,np.int16)
            final=seed.copy()
            y,x=np.argwhere(entry.alpha)[0]
            final[y,x]=14 if entry.filled[y,x]!=14 else 1
            archive=folder/'accepted.npz'
            np.savez_compressed(archive,seed_overrides=seed,final_overrides=final)
            meta=dict(status='Accepted',version='1.0.0',source_signature=entry.signature,archive='accepted.npz',archive_sha256=digest(archive))
            (folder/'metadata.json').write_text(json.dumps(meta))
            _, imported, label=prepare.owners_for(dataset,key)
            assert label=='Manually corrected' and imported[y,x]==final[y,x]
            meta['status']='Corrected'
            (folder/'metadata.json').write_text(json.dumps(meta))
            _, imported, label=prepare.owners_for(dataset,key)
            assert label=='Flood Fill' and np.array_equal(imported,entry.filled)
            result['accepted_manual_import_and_priority']=True
        finally:
            prepare.MASK_EDITOR=original_root
    return result


if __name__=='__main__':
    (ROOT/'cache').mkdir(exist_ok=True)
    action=sys.argv[1] if len(sys.argv)>1 else 'assets'
    if action=='assets':
        report=check_assets()
        (ROOT/'asset-validation.json').write_text(json.dumps(report,indent=2)+'\n')
        print('Asset validation passed: six poses, 30 exact RGBA copies, owners, normalized weights, three torso bones, accepted manual import')
    elif action=='before':
        files=snapshot()
        (ROOT/'preservation-before.json').write_text(json.dumps(files,indent=2)+'\n')
        print('Preservation baseline:',len(files),'files')
    elif action=='after':
        before=json.loads((ROOT/'preservation-before.json').read_text())
        after=snapshot()
        changed=[p for p in before if before[p]!=after.get(p)]
        added=sorted(set(after)-set(before))
        report=dict(checked_files=len(before),changed=changed,added=added)
        (ROOT/'preservation-validation.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report))
        assert not changed and not added
