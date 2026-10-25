"""Existing DensePose model, gated controls, sequential resumable CPU inference."""
import gc
import importlib.metadata
import re
from pathlib import Path
import shutil
import subprocess
import sys
import traceback

import numpy as np
from PIL import Image

from core import ROOT, REPO, OLD, read, write, sha, digest, frame, prepare, result_path, adapter_hash, linux_path
from artifacts import save_inference, save_mirrored


class Engine:
    def __init__(self):
        config = read(ROOT/'config.json')
        checkpoint = linux_path(config['checkpoint'])
        if not checkpoint.is_file() or sha(checkpoint)!=config['checkpoint_sha256']:
            raise ValueError('Existing checkpoint missing or changed; download is forbidden')
        sys.path.insert(0,str(OLD))
        from densepose_adapter import load
        self.infer,self.info,_ = load()
        self.info['environment'] = {'python':sys.version,'packages':{p:importlib.metadata.version(p) for p in
            ['torch','torchvision','detectron2','detectron2-densepose','numpy','pillow','scipy','psutil']}}
        from detectron2.config import get_cfg
        from densepose import add_densepose_config
        cfg = get_cfg()
        add_densepose_config(cfg)
        cfg.merge_from_file(str(OLD/'cache/wsl-densepose/detectron2'/config['model_config']))
        cfg.MODEL.DEVICE='cpu'
        cfg.MODEL.WEIGHTS=str(checkpoint)
        self.info['effective_configuration'] = cfg.dump()
        self.info['effective_configuration_sha256'] = digest(cfg.dump())
        self.info['adapter_sha256'] = adapter_hash()
        self.info['existing_implementation_sha256'] = {name:sha(OLD/name) for name in ['densepose_adapter.py','common.py','config.json']}
        sources = {}
        config_file = OLD/'cache/wsl-densepose/detectron2'/config['model_config']
        while config_file:
            sources[str(config_file.relative_to(OLD))] = sha(config_file)
            base = re.search(r'^_BASE_:\s*["\']([^"\']+)',config_file.read_text(),re.M)
            config_file = (config_file.parent/base.group(1)).resolve() if base else None
        self.info['configuration_sources_sha256'] = sources
        self.info['checkpoint_sha256'] = config['checkpoint_sha256']
        write(ROOT/('execution-model.json' if (ROOT/'model.json').exists() else 'model.json'),self.info)

    def predict(self, image):
        from common import measured
        return measured(lambda:self.infer(image),False)


def contract(entry, info, method):
    return digest({'source_sha256':entry['source_sha256'],'frame':entry['atlas_frame'],'frame_rgba_sha256':entry['frame_rgba_sha256'],
                   'atlas_box':entry['atlas_box'],'frame_size':entry['frame_size'],
                   'checkpoint_sha256':info['checkpoint_sha256'],'configuration_sha256':info['effective_configuration_sha256'],
                   'preprocess':{'method':method,'config':read(ROOT/'config.json')},'adapter_sha256':adapter_hash(),
                   'implementation':info['existing_implementation_sha256'],'configuration_sources':info['configuration_sources_sha256'],'environment':info['environment'],
                   'mirrored':entry['mirrored'],'direction':entry['direction']})


def one(engine, entry, method, folder):
    image = frame(entry)
    prepared,transform = prepare(image,method)
    result,metrics = engine.predict(prepared)
    metadata = {'entry':entry,'execution':'inference','contract_sha256':contract(entry,engine.info,method),
                'checkpoint_sha256':engine.info['checkpoint_sha256'],'configuration_sha256':engine.info['effective_configuration_sha256'],
                'adapter_sha256':adapter_hash(),'metrics':metrics,'model_grid_shape':list(result['class_map'].shape)}
    save_inference(folder,image,prepared,transform,result,metadata)
    return result


def compare_old(result):
    old = OLD/'densepose/south-west-bicubic/raw'
    checks = {}
    for name in ['scores','boxes_xyxy','uv-model-grid']:
        previous = np.load(old/(name+'.npz'))['values']
        current = result['raw'][name]
        checks[name] = {'bitwise_equal':bool(np.array_equal(previous,current)),'shape':list(current.shape),
                        'max_absolute_difference':float(np.max(np.abs(current-previous))) if current.size else 0.0}
    previous = np.load(old/'class-map-model-grid.npy')
    checks['class_map'] = {'bitwise_equal':bool(np.array_equal(previous,result['class_map'])),'shape':list(result['class_map'].shape)}
    return checks


def preflight():
    gate = ROOT/'preprocess-comparison/preflight.json'
    if gate.exists(): raise FileExistsError('Preflight already saved; preserve the controls')
    inventory = read(ROOT/'source-inventory.json')
    if inventory['issues']: raise ValueError('Unresolved inventory issues: '+str(inventory['issues']))
    if not (ROOT/'protected-before.json').exists(): raise ValueError('Source protection baseline missing')
    controls = [e for e in inventory['frames'] if e['pose']=='idle' and e['atlas_frame']==0 and not e['mirrored']]
    engine = Engine()
    rows = []
    sw_result = None
    for entry in controls:
        for method in ['bicubic512','direct']:
            folder = ROOT/'preprocess-comparison'/entry['direction']/method
            result = one(engine,entry,method,folder)
            rows.append({'direction':entry['direction'],'method':method,'metadata':str((folder/'metadata.json').relative_to(ROOT))})
            if entry['direction']=='south-west' and method=='bicubic512': sw_result=result
            print('Control',entry['direction'],method,'SUCCESS',flush=True)
    replay_checks = compare_old(sw_result)
    current_input = np.asarray(Image.open(ROOT/'preprocess-comparison/south-west/bicubic512/raw/predictor-input.png'))
    old_input = np.asarray(Image.open(OLD/'densepose/south-west-bicubic/input.png'))
    inputs_equal = bool(np.array_equal(current_input,old_input))
    info = engine.info
    del engine
    gc.collect()
    upstream = OLD/'cache/wsl-densepose/detectron2/projects/DensePose'
    source = upstream/'doc'
    (ROOT/'provenance').mkdir(exist_ok=True)
    for name in ['GETTING_STARTED.md','DENSEPOSE_IUV.md','TOOL_APPLY_NET.md']:
        shutil.copy2(source/name,ROOT/'provenance'/name)
    apply_output = ROOT/'preprocess-comparison/apply-net/raw/official.pt'
    apply_output.parent.mkdir(parents=True,exist_ok=True)
    command = [sys.executable,str(upstream/'apply_net.py'),'dump',str(upstream/'configs/densepose_rcnn_R_50_FPN_s1x.yaml'),
               str(linux_path(read(ROOT/'config.json')['checkpoint'])),str(ROOT/'preprocess-comparison/south-west/bicubic512/raw/predictor-input.png'),
               '--output',str(apply_output),'--opts','MODEL.DEVICE','cpu']
    with (apply_output.parent.parent/'official.log').open('w',encoding='utf-8') as log:
        completed = subprocess.run(command,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT)
    if completed.returncode: raise RuntimeError('Official apply_net failed; see preprocess-comparison/apply-net/official.log')
    import torch
    official = torch.load(apply_output,map_location='cpu',weights_only=False)[0]
    raw = sw_result['raw']
    official_checks = {'scores':bool(np.array_equal(raw['scores'],official['scores'].numpy())),
                       'boxes':bool(np.array_equal(raw['boxes_xyxy'],official['pred_boxes_XYXY'].numpy()))}
    for index,chart in enumerate(official['pred_densepose']):
        official_checks[f'instance_{index}_I'] = bool(np.array_equal(raw[f'instance_{index}_labels'],chart.labels.numpy()))
        official_checks[f'instance_{index}_UV'] = bool(np.array_equal(raw[f'instance_{index}_uv'],chart.uv.numpy()))
    ready = inputs_equal and all(r['bitwise_equal'] for r in replay_checks.values()) and all(official_checks.values())
    data = {'status':'PASS' if ready else 'REVIEW_REQUIRED','controls':rows,'checkpoint_sha256':info['checkpoint_sha256'],
            'configuration_sha256':info['effective_configuration_sha256'],'adapter_sha256':adapter_hash(),
            'sw_preprocessing_pixels_equal':inputs_equal,'old_sw_reproduction':replay_checks,'official_apply_net':official_checks,
            'selected_method':'bicubic512','decision':'Keep the existing baseline unless direct input is unambiguously better; no automated parameter search.',
            'mass_run_authorized_by_controls':ready}
    write(gate,data)
    if not ready: raise AssertionError('Control mismatch. Preserve both variants and explain before mass inference.')


def completed(folder, expected):
    path = folder/'metadata.json'
    if not path.exists(): return False
    record = read(path)
    if record.get('status')!='SUCCESS': return False
    if record.get('contract_sha256')!=expected: raise ValueError('Successful result has another contract; do not overwrite '+str(folder))
    for name,expected_sha in record['artifact_sha256'].items():
        if not (folder/name).is_file() or sha(folder/name)!=expected_sha:
            raise ValueError('Successful artifact missing/changed; do not overwrite '+str(folder/name))
    for name,raw in record.get('raw_tensors',{}).items():
        path = folder/'raw'/raw['file']
        if not path.is_file() or sha(path)!=raw['sha256']: raise ValueError('Raw output missing/changed: '+str(path))
    return True


def run():
    gate = read(ROOT/'preprocess-comparison/preflight.json')
    if not gate['mass_run_authorized_by_controls'] or gate['adapter_sha256']!=adapter_hash(): raise ValueError('Preflight controls missing or adapter changed')
    info = read(ROOT/'model.json')
    for name,expected in {**info['existing_implementation_sha256'],**info['configuration_sources_sha256']}.items():
        if sha(OLD/name)!=expected: raise ValueError('Existing model implementation/configuration changed: '+name)
    if sha(linux_path(read(ROOT/'config.json')['checkpoint']))!=info['checkpoint_sha256']: raise ValueError('Checkpoint changed')
    entries = read(ROOT/'source-inventory.json')['frames']
    method = gate['selected_method']
    pending = []
    skipped = 0
    for entry in entries:
        if completed(result_path(entry),contract(entry,info,method)): skipped+=1
        else: pending.append(entry)
    print('Resume: skipped',skipped,'pending',len(pending),flush=True)
    if not pending:
        write(ROOT/'resume-check.json',{'skipped':skipped,'pending':0,'new_inferences':0})
        return
    engine = Engine() if any(not e['mirrored'] for e in pending) else None
    if engine and (engine.info['effective_configuration_sha256']!=info['effective_configuration_sha256'] or engine.info['environment']!=info['environment']): raise ValueError('Model configuration/environment changed')
    failures = []
    independent = [e for e in pending if not e['mirrored']]
    mirrored = [e for e in pending if e['mirrored']]
    for index,entry in enumerate(independent+mirrored,1):
        folder = result_path(entry)
        try:
            if entry['mirrored']:
                source_entry = next(e for e in entries if e['key']==entry['inference_source_key'])
                source_folder = result_path(source_entry)
                if not completed(source_folder,contract(source_entry,info,method)): raise ValueError('Mirror source not successful: '+entry['inference_source_key'])
                metadata = {'entry':entry,'execution':'spatial_mirror','contract_sha256':contract(entry,info,method),
                            'checkpoint_sha256':info['checkpoint_sha256'],'configuration_sha256':info['effective_configuration_sha256'],
                            'adapter_sha256':adapter_hash(),'metrics':None}
                save_mirrored(folder,source_folder,frame(entry),metadata)
            else: one(engine,entry,method,folder)
            print(f'{index}/{len(pending)} {entry["key"]} SUCCESS',flush=True)
        except Exception as error:
            failure = {'key':entry['key'],'status':'ERROR','error_type':type(error).__name__,'error':str(error),'traceback':traceback.format_exc()}
            failures.append(failure)
            write(folder/'metadata.json',failure)
            print(failure['traceback'],file=sys.stderr,flush=True)
        write(ROOT/'progress.json',{'processed_this_run':index,'pending_at_start':len(pending),'skipped':skipped,'failures':failures,'last':entry['key']})
    if failures: raise RuntimeError('Frame errors retained: '+str([f['key'] for f in failures]))
