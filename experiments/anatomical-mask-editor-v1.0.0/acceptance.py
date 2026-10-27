"""Temporary-copy real scenarios and full export; never create user edits."""
import dataclasses
import json
import shutil
import subprocess
import time
from pathlib import Path
import numpy as np
from PIL import Image

from dataset import ROOT,VERSION,Dataset,sha
from corrections import Store,read,write_json
from exporter import export_all


class TemporaryDataset:
    def __init__(self,real):
        self.real=real
        self.copies={}

    def __getattr__(self,name):
        return getattr(self.real,name)

    def entry(self,key):
        key=self.real.canonical(key)
        return self.copies[key] if key in self.copies else self.real.entry(key)

    def assert_current(self,entry):
        if any(sha(path)!=value for path,value in entry.signature['files'].items()):
            raise ValueError('Temporary source changed; stale corrections refused')

    def copy(self,key,folder):
        entry=self.real.entry(key)
        folder=Path(folder)
        folder.mkdir(parents=True,exist_ok=False)
        paths={}
        for path,value in entry.signature['files'].items():
            source=Path(path)
            # Prefix repeated source.png filenames so all five remain distinct.
            target=folder/f'{len(paths):02d}-{source.name}'
            shutil.copyfile(source,target)
            paths[str(target)]=sha(target)
        signature={**entry.signature,'files':paths,'temporary_copy':True}
        clone=dataclasses.replace(entry,original=entry.original.copy(),filled=entry.filled.copy(),alpha=entry.alpha.copy(),
                                  textures=[t.copy() for t in entry.textures],signature=signature)
        self.copies[key]=clone
        return clone


def protected():
    repo=ROOT.parents[1]
    paths=subprocess.check_output(['git','-c','core.quotepath=false','ls-files','--',
        'experiments/densepose-full-character-v1.0.0','experiments/densepose-postprocessing-v1.0.0',
        'experiments/densepose-postprocessing-v1.1.0','godot','.agents'],cwd=repo,text=True,encoding='utf-8').splitlines()
    return {p:sha(repo/p) for p in paths if (repo/p).is_file()}


def main():
    started=time.perf_counter()
    real=Dataset()
    initial_user_edits={str(p):sha(p) for p in (ROOT/'edits').rglob('*') if p.is_file()}
    before=protected()
    workspace=ROOT/'cache'/f'acceptance-{time.time_ns()}'
    workspace.mkdir(parents=True,exist_ok=False)
    temporary=TemporaryDataset(real)
    a=temporary.copy('idle/north',workspace/'scenario-a/input-copy')
    b=temporary.copy('idle/north-west',workspace/'scenario-b/input-copy')
    names={name:i for i,name in real.names.items()}
    # A: deliberately synthetic, a few current Torso pixels become Head.
    store_a=Store(temporary,workspace/'scenario-a')
    model_a=store_a.load(a.key)
    coords=np.argwhere((model_a.owners()==names['Torso'])&a.alpha)[:6]
    assert len(coords)>0
    selection=np.zeros_like(a.alpha)
    selection[coords[:,0],coords[:,1]]=True
    old=model_a.owners().copy()
    model_a.apply(selection,names['Head'])
    assert np.all(model_a.owners()[selection]==names['Head'])
    np.testing.assert_array_equal(model_a.owners()[~selection],old[~selection])
    store_a.save(model_a,'Corrected','SYNTHETIC Head/Torso test; not a genuine anatomical correction')
    np.testing.assert_array_equal(store_a.load(a.key).owners(),model_a.owners())
    # B: clear seeds in a lower region, then add a leg seed and recompute.
    store_b=Store(temporary,workspace/'scenario-b')
    model_b=store_b.load(b.key)
    yy,xx=np.indices(b.alpha.shape)
    lower=b.alpha&(yy>=int(b.alpha.shape[0]*.65))
    model_b.apply(lower,0,'seed')
    target=names['Left_Lower_Leg']
    y,x=np.argwhere(lower&(b.original!=target))[-1]
    seed=np.zeros_like(lower)
    seed[y,x]=True
    model_b.apply(seed,target,'seed')
    preview=model_b.preview()
    assert preview['base'][y,x]==target
    assert np.count_nonzero(preview['base']==target)>0
    model_b.accept(preview)
    store_b.save(model_b,'Corrected','SYNTHETIC missing-leg seed test; not a genuine anatomical correction')
    np.testing.assert_array_equal(store_b.load(b.key).owners(),model_b.owners())
    # A real copied input file changes: the saved edit must be refused.
    path=Path(next(iter(a.signature['files'])))
    saved=path.read_bytes()
    path.write_bytes(saved+b'\nchanged temporary input')
    rejected=False
    try:
        store_a.load(a.key)
    except ValueError as error:
        rejected='source changed' in str(error).lower()
    finally:
        path.write_bytes(saved)
    assert rejected
    # Full 32-entry no-edit replay and alpha/skin checks.
    for key in real.keys:
        entry=real.entry(key)
        np.testing.assert_array_equal(real.converge(entry.original,entry.alpha)['owners'],entry.filled)
        assert all(np.array_equal(t[:,:,3]>0,entry.alpha) for t in entry.textures)
    export_store=Store(temporary,workspace/'export-test')
    output=export_all(temporary,export_store,{a.key:model_a,b.key:model_b})
    metadata=read(output/'metadata.json')
    metadata['synthetic_test_corrections']=True
    write_json(output/'metadata.json',metadata)
    checked=0
    for key,atlas in real.atlases.items():
        canonical=real.canonical(key)
        expected=model_a.owners() if canonical==a.key else model_b.owners() if canonical==b.key else real.entry(canonical).filled
        if atlas['mirrored']:
            expected=expected[:,::-1]
        for skin in range(5):
            folder=output/key/f'frame-{skin:03d}'
            np.testing.assert_array_equal(np.load(folder/'owners-final.npy'),expected)
            texture=real.texture(key,skin)
            assert not np.any(expected[texture[:,:,3]==0])
            for group in range(1,15):
                np.testing.assert_array_equal(np.array(Image.open(folder/'masks'/f'{real.names[group]}.png'))>0,expected==group)
            checked+=1
    assert protected()==before
    assert initial_user_edits=={str(p):sha(p) for p in (ROOT/'edits').rglob('*') if p.is_file()}
    report={'version':VERSION,'loaded_independent_maps':32,'no_edit_replay_bitwise_equal':True,
        'scenario_a':{'path':str(workspace/'scenario-a'),'test_only':True,'pixels':int(selection.sum()),'save_reload':True},
        'scenario_b':{'path':str(workspace/'scenario-b'),'test_only':True,'new_seed_xy':[int(x),int(y)],
                      'leg_pixels_after':int(np.count_nonzero(model_b.owners()==target)),'save_reload':True},
        'changed_temporary_source_rejected':rejected,'exported_frames_checked':checked,
        'exported_group_masks_checked':checked*14,'export_path':str(output),
        'historical_files_unchanged':len(before),'user_edits_unchanged':True,'seconds':time.perf_counter()-started}
    write_json(ROOT/'verification.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in {'scenario_a','scenario_b'}},ensure_ascii=False))


if __name__=='__main__':
    main()
