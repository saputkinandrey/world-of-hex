"""Explicit initial promotion of existing results; never starts inference."""
import json
from pathlib import Path
import shutil
from datetime import datetime, timezone
from evidence_store import CURRENT, BODY_TAGS, CLASSES, locked, promote, status_update, write_json, verify
from preprocess import OUTPUT, REPO, SOURCES, sha
from recipe import require_input
from infer import settings
from inference_recipe import contract


def body_valid(folder, key):
    return all((folder/key/(tag+'.png')).is_file() for tag in BODY_TAGS)


def populate_layerdiff(folder, key, record, extra_head=None):
    def populate(target):
        shutil.copy2(record['input'],target/'input.png')
        shutil.copytree(folder/key,target/'raw/layers')
        for item in folder.glob('*.psd'):
            shutil.copy2(item,target/'raw'/item.name)
        for name in ('experiment.json','inference.log'):
            if (folder/name).exists():
                shutil.copy2(folder/name,target/'raw'/name)
        if extra_head:
            shutil.copytree(extra_head,target/'raw/additional-head')
    return populate


def populate_sam(folder, record):
    def populate(target):
        shutil.copy2(record['input'],target/'input.png')
        raw = target/'raw'
        raw.mkdir()
        for name in ['logits.npz','experiment.json',*[name+'.png' for name in CLASSES]]:
            shutil.copy2(folder/name,raw/name)
    return populate


def main():
    migration = CURRENT/'migration.json'
    if migration.exists() and json.loads(migration.read_text()).get('version') == 2:
        with locked():
            for view in SOURCES:
                for model in ('layerdiff','semantic-sam'):
                    verify(view,model)
        print('Initial migration already verified; preserving latest current snapshots.')
        return
    records = json.loads((OUTPUT/'inputs.json').read_text())
    tooling,upstream,_ = settings()
    discovered = []
    candidates = {view:[] for view in SOURCES}
    for path in sorted((OUTPUT/'runs').glob('*/experiment.json')):
        info = json.loads(path.read_text())
        key = info['key']
        view = key.split('-crop-')[0]
        require_input(info,records[key])
        for file,digest in info['psds'].items():
            if sha(file) != digest:
                raise ValueError('Existing PSD checksum changed: '+file)
        valid = body_valid(path.parent,key)
        discovered.append({'kind':'layerdiff','path':str(path),'input_sha256':info['input_sha256'],
                           'process_exit':info['exit_code'],'complete_body_predictions':valid})
        if valid:
            candidates[view].append((path.stat().st_mtime_ns,path.parent,key,info))
    # Inventory controls too; their older PSDs remain untouched and are not selected.
    old = REPO/'tmp/animation-workbench/seethrough-probe'
    controls = json.loads((old/'result-manifest.json').read_text())
    for method,run in controls['runs'].items():
        for item in run['psds']:
            path = old/item['file']
            if sha(path) != item['sha256']:
                raise ValueError('Original control PSD checksum changed: '+str(path))
        discovered.append({'kind':'layerdiff-control','variant':method,'record':str(old/'result-manifest.json'),
                           'verified_psds':len(run['psds']),'selection':'older whole-canvas control retained in place'})
    with locked():
        for view in SOURCES:
            _,folder,key,info = max(candidates[view],key=lambda item:item[0])
            extra = OUTPUT/'heads'/view
            if not (extra/'experiment.json').exists():
                extra = None
            else:
                head = json.loads((extra/'experiment.json').read_text())
                require_input(head['full_input'],records[view+'-crop-nearest-512'])
                for tag,digest in head['raw_layers'].items():
                    if sha(extra/(tag+'.png')) != digest:
                        raise ValueError('Additional raw head checksum changed: '+tag)
            metadata = {'model':'layerdiff','view':view,'input':records[key],
                'inference':'success: all thirteen direct body predictions exist',
                'export':'complete' if info['exit_code']==0 else 'incomplete: historical head localization stopped export after successful body inference',
                'provenance':info,'migration_source':str(folder),
                'recipe_verification':'historical command/parameters retained; absent historical code fingerprints are not invented',
                'additional_head':'separate experiment with its own full_input identity' if extra else None}
            current_contract = contract('layerdiff',tooling,upstream)
            metadata['contract'] = None
            metadata['recipe_verification'] = 'Historical numerical adapter identity does not establish equivalence with the new worker. Preserved for analysis; not an automatic current-recipe cache hit.'
            metadata['observed_implementation'] = {field:info.get(field) for field in (
                'model_revisions','upstream_compatibility_files','head_adapter_sha256','worker_sha256')}
            metadata['implementation_differences'] = {
                'local_worker':'historical worker differs from current raw-capture worker',
                'head_adapter_matches_current':info.get('head_adapter_sha256') == current_contract['head_support_sha256'],
                'upstream_compatibility_matches_current':info.get('upstream_compatibility_files') == current_contract['implementation']}
            metadata['stages'] = {'body':'success','head':'success' if info['exit_code']==0 else 'poor_recognition',
                'depth':'success' if info['exit_code']==0 else 'not_attempted',
                'export':'success' if info['exit_code']==0 else 'not_created'}
            metadata['original_head_coordinates_available'] = False
            # Preserve historical provenance without fabricating a code fingerprint.
            # These observed runs share the pinned upstream and stochastic recipe.
            arguments = info['command']
            for flag,value in (('--seed','42'),('--num_inference_steps','20'),('--resolution','512'),('--quant_mode','nf4')):
                if arguments[arguments.index(flag)+1] != value:
                    raise ValueError('Historical inference parameters differ: '+flag)
            if info['upstream_commit'] != controls['upstream_commit']:
                raise ValueError('Historical upstream differs from the verified probe')
            promote(view,'layerdiff',populate_layerdiff(folder,key,records[key],extra),metadata)
            status_update(view,'layerdiff',{'stage':'migration','outcome':'raw_inference_success',
                'historical_process_exit':info['exit_code'],'export':metadata['export']})
            folder = OUTPUT/'sam'/view
            info = json.loads((folder/'experiment.json').read_text())
            require_input(info,records[view+'-crop-nearest-512'])
            if sha(folder/'logits.npz') != info['logits_sha256']:
                raise ValueError('Existing logits checksum changed: '+view)
            metadata = {'model':'semantic-sam','view':view,'input':records[view+'-crop-nearest-512'],
                'inference':'success','classes':CLASSES,'provenance':info,
                'migration_source':str(folder),'recipe_verification':'historical parameters and checkpoint hash retained'}
            metadata['contract'] = None
            metadata['recipe_verification'] = 'Checkpoint/input are verified; historical local worker/source fingerprints are incomplete. Preserve without asserting current-worker equivalence.'
            if info['checkpoint_sha256'] != contract('semantic-sam',tooling,upstream)['checkpoint_sha256']:
                raise ValueError('Historical SemanticSam checkpoint differs')
            promote(view,'semantic-sam',populate_sam(folder,metadata['input']),metadata)
            status_update(view,'semantic-sam',{'stage':'migration','outcome':'raw_inference_success'})
            discovered.append({'kind':'semantic-sam','path':str(folder),'input_sha256':info['input_sha256'],
                               'logits_sha256':info['logits_sha256']})
        for view in SOURCES:
            for model in ('layerdiff','semantic-sam'):
                verify(view,model)
        write_json(CURRENT/'migration.json',{'version':2,'completed_utc':datetime.now(timezone.utc).isoformat(),
            'sources':discovered,'new_inference':False,'originals_deleted':False,
            'selection':'latest complete body prediction set by experiment timestamp; historical N body success retained with incomplete export'})
    print('Migrated and verified eight independent raw snapshots; no inference or deletion.')


if __name__ == '__main__':
    main()
