"""Versioned atomic correction commits, source guards and 32 review records."""
import json
import os
import uuid
from pathlib import Path
import numpy as np

from dataset import ROOT,VERSION,read,sha
from editor import Editor,NO_OVERRIDE

STATUSES=['Not reviewed','Needs review','Needs correction','Corrected','Accepted']
PRIORITIES={'idle/north':'Head/Torso','idle/north-west':'Missing leg region',
    'longarm/north':'Head/Torso','flinch/north':'Head classification',
    'swing-1h/north':'Head classification','aim-pistol/north':'Missing anatomical categories',
    'thrust-1h/south':'Missing limb categories'}


def write_json(path,data):
    path=Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix(path.suffix+'.tmp')
    temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    os.replace(temporary,path)


class Store:
    def __init__(self,dataset,workspace=None):
        self.dataset=dataset
        self.workspace=Path(workspace or ROOT).resolve()
        if not self.workspace.is_relative_to(ROOT):
            raise ValueError('Editor workspace must stay inside the new editor directory')
        self.path=self.workspace/'review-status.json'
        if self.path.exists():
            journal=read(self.path)
            self.records=journal['entries']
            if journal['version']!=VERSION or set(self.records)!=set(dataset.keys):
                raise ValueError('Review journal does not match the 32-entry inventory/version')
        else:
            self.records={key:{'pose':key.split('/')[0],'direction':key.split('/')[1],
                'status':'Needs review' if key in PRIORITIES else 'Not reviewed',
                'manual_pixels':0,'seed_overrides':False,'final_overrides':False,
                'comment':PRIORITIES.get(key,''),'source_signature':None} for key in dataset.keys}
        self.reconcile()
        self.write_journal()

    def reconcile(self):
        """The review journal is a projection of committed correction metadata."""
        for key in self.dataset.keys:
            path=self.workspace/'edits'/key/'metadata.json'
            if not path.exists():
                continue
            metadata=read(path)
            if metadata['version']!=VERSION or metadata['status'] not in STATUSES:
                raise ValueError(f'Unsupported correction metadata: {key}')
            fields=['manual_pixels','seed_overrides','final_overrides','status','comment','source_signature']
            self.records[key].update({field:metadata[field] for field in fields})

    def write_journal(self):
        write_json(self.path,{'version':VERSION,'entries':self.records})
        lines=['# Anatomical Mask Editor review v1.0.0','','All 32 independent cases require operator review. Known priority flags are not completed reviews.','',
            '| Pose | Direction | Status | Manual pixels | Seed edits | Final edits | Operator comment |',
            '| --- | --- | --- | ---: | --- | --- | --- |']
        for record in self.records.values():
            comment=record['comment'].replace('|','/').replace('\n',' ')
            lines.append(f'| {record["pose"]} | {record["direction"]} | {record["status"]} | {record["manual_pixels"]} | {record["seed_overrides"]} | {record["final_overrides"]} | {comment} |')
        (self.workspace/'REVIEW_v1.0.0.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

    def load(self,key):
        entry=self.dataset.entry(key)
        self.dataset.assert_current(entry)
        record=self.records[entry.key]
        if record['source_signature'] is not None and record['source_signature']!=entry.signature:
            raise ValueError(f'Reviewed source changed for {entry.key}; stale review/edits are not applied')
        model=Editor(entry,self.dataset.converge,self.dataset.config['undo_limit'])
        metadata_path=self.workspace/'edits'/entry.key/'metadata.json'
        if not metadata_path.exists():
            return model
        metadata=read(metadata_path)
        if metadata['version']!=VERSION or metadata['source_signature']!=entry.signature:
            raise ValueError(f'Correction source signature mismatch: {entry.key}')
        folder=metadata_path.parent
        archive=(folder/metadata['archive']).resolve()
        if not archive.is_relative_to(folder.resolve()) or not archive.is_file() or sha(archive)!=metadata['archive_sha256']:
            raise ValueError(f'Invalid correction archive/checksum: {entry.key}')
        with np.load(archive,allow_pickle=False) as data:
            seed,final=data['seed_overrides'].copy(),data['final_overrides'].copy()
        for layer,array in [('seed',seed),('final',final)]:
            if array.shape!=entry.original.shape or array.dtype.kind!='i' or np.any(array<-1) or np.any(array>14):
                raise ValueError(f'Invalid signed override map: {entry.key}/{layer}')
            if np.any(array[~entry.alpha]!=NO_OVERRIDE) or (layer=='final' and np.any(array==0)):
                raise ValueError(f'Invalid outside-alpha/zero final override: {entry.key}/{layer}')
        model.seed,model.final=seed.astype(np.int16),final.astype(np.int16)
        model.accepted_seed=model.seed.copy()
        model.base=self.dataset.converge(model.seeds(),entry.alpha)['owners']
        return model

    def save(self,model,status,comment):
        if status not in STATUSES:
            raise ValueError('Unknown review status')
        if model.pending_seeds:
            raise ValueError('Seed changes are pending: preview and accept Flood Fill, or discard pending seed changes before saving')
        self.dataset.assert_current(model.entry)
        expected=self.dataset.converge(model.seeds(),model.entry.alpha)['owners']
        if not np.array_equal(expected,model.base):
            raise ValueError('Accepted base does not reproduce from current seed overrides')
        folder=self.workspace/'edits'/model.entry.key
        folder.mkdir(parents=True,exist_ok=True)
        archive=folder/'history'/f'{uuid.uuid4().hex}.npz'
        archive.parent.mkdir(exist_ok=True)
        temporary=archive.with_suffix('.tmp')
        with temporary.open('wb') as stream:
            np.savez_compressed(stream,seed_overrides=model.seed,final_overrides=model.final)
        os.replace(temporary,archive)
        # Immutable archive + atomic metadata manifest is the commit. The named
        # NPZ is a convenience current copy, never the authoritative pointer.
        current=folder/'manual-overrides.npz'
        temp_current=current.with_suffix('.tmp')
        temp_current.write_bytes(archive.read_bytes())
        os.replace(temp_current,current)
        metadata={'version':VERSION,'algorithm_version':'1.1.0','source_signature':model.entry.signature,
            'baseline_frame':model.entry.baseline,'frame_size':[model.entry.original.shape[1],model.entry.original.shape[0]],
            'archive':archive.relative_to(folder).as_posix(),'archive_sha256':sha(archive),
            'states':{'-1':'no override','seed 0':'erase original seed','1..14':'force anatomical owner'},
            'manual_pixels':model.manual_count(),'seed_overrides':bool(np.any(model.seed!=-1)),
            'final_overrides':bool(np.any(model.final!=-1)),'status':status,'comment':comment}
        write_json(folder/'metadata.json',metadata)
        self.records[model.entry.key]={**self.records[model.entry.key],
            **{k:metadata[k] for k in ['manual_pixels','seed_overrides','final_overrides','status','comment']},
            'source_signature':model.entry.signature}
        self.write_journal()

    def next_unreviewed(self,key):
        keys=self.dataset.keys
        start=keys.index(self.dataset.canonical(key))
        ordered=keys[start+1:]+keys[:start+1]
        return next((k for k in ordered if self.records[k]['status'] not in {'Accepted','Corrected'}),None)
