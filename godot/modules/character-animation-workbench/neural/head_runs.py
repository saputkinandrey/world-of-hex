"""Isolated dual-model evaluations; benchmark records never promote current."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import subprocess
import traceback

import numpy as np
from PIL import Image

from evidence_store import BODY_TAGS, CLASSES, CURRENT, MODELS, inventory, locked, validate_payload, verify, write_json
from infer import settings
from inference_parameters import parameters
from inference_recipe import contract
from preprocess import MODULE, OUTPUT, REPO, prepare, project, sha

SEEDS = [42,42,7,17,23,101,202,303,404,505]
BATCH = MODULE/'neural/evidence/experiments/sw-head-consistency-01'


def evaluation_seeds(batch=BATCH):
    pause = Path(batch)/'pause.json'
    limit = json.loads(pause.read_text())['requested_stop_after'] if pause.exists() else len(SEEDS)
    if type(limit) is not int or not 1 <= limit <= len(SEEDS):
        raise ValueError('Invalid user-requested evaluation boundary')
    return SEEDS[:limit]


def prepare_source(source, destination, resolution=512, method='bicubic', frame_size=None):
    source = Path(source).resolve()
    with Image.open(source) as image:
        original = image.convert('RGBA')
    if frame_size is not None:
        if frame_size < 1 or original.width < frame_size or original.height < frame_size:
            raise ValueError('First square frame does not fit source image')
        original = original.crop((0,0,frame_size,frame_size))
    prepared,transform = prepare(original,'crop',method,size=resolution)
    destination.mkdir(parents=True,exist_ok=True)
    original.save(destination/'source.png')
    prepared.save(destination/'input.png')
    return {'source':str(source),'source_sha256':sha(source),
            'source_frame_sha256':sha(destination/'source.png'),'frame_size':frame_size,
            'input':str((destination/'input.png').resolve()),'input_sha256':sha(destination/'input.png'),'input_mode':prepared.mode,
            'transform':transform}


def execute_model(model, record, output, options, recipe, mode='full'):
    """Exactly one actual process attempt; failed raw outputs remain inspectable."""
    output.mkdir(parents=True,exist_ok=False)
    shutil.copy2(record['input'],output/'input.png')
    request = {'model':model,'input':record,'parameters':options,'contract':recipe,'mode':mode,
               'started_utc':datetime.now(timezone.utc).isoformat(),'cache_used':False}
    write_json(output/'request.json',request)
    tooling,upstream,python = settings()
    env = dict(os.environ,PYTHONUTF8='1',PYTHONUNBUFFERED='1',HF_HUB_OFFLINE='1',
        HF_HOME=str(tooling/'cache/huggingface'),TORCH_HOME=str(tooling/'cache/torch'),
        PYTHONPATH=os.pathsep.join([str(upstream),str(upstream/'common')]))
    worker = Path(__file__).with_name('layerdiff_worker.py' if model=='layerdiff' else 'sam_worker.py')
    print(f"{output.parent.name}/{model}: ACTUAL seed={options['seed']} log={output/'inference.log'}",flush=True)
    outcome = {}
    try:
        with (output/'inference.log').open('w',encoding='utf-8') as log:
            process = subprocess.run([str(python),'-X','faulthandler',str(worker),str(output.resolve())],
                cwd=upstream,env=env,stdout=log,stderr=subprocess.STDOUT)
        outcome = json.loads((output/'result.json').read_text()) if (output/'result.json').exists() else {}
        stages = {key:value['outcome'] for key,value in outcome.get('stages',{}).items()}
        execution_failed = process.returncode != 0 or 'inference_failure' in stages.values()
        result = {**request,'exit_code':process.returncode,'stages':stages,'provenance':outcome,
                  'outcome':'inference_failure' if execution_failed else 'completed',
                  'original_head_coordinates_available':stages.get('head')=='success',
                  'classes':CLASSES if model=='semantic-sam' else None}
        if not execution_failed:
            validate_payload(output,result)
    except Exception:
        result = {**request,'outcome':'execution_or_validation_failure','error':traceback.format_exc(),
                  'provenance':outcome}
        traceback.print_exc()
    write_json(output/'manifest.json',{**result,'files':inventory(output)})
    print(f"{output.parent.name}/{model}: {result['outcome']}",flush=True)
    return result


def run_dual(record, output, options, recipes):
    results = {}
    for model in MODELS:
        folder = output/model
        if folder.exists():
            # Resume only unattempted models: never replace an actual trial with cache.
            manifest = folder/'manifest.json'
            if manifest.exists():
                previous = json.loads(manifest.read_text())
                if inventory(folder) != previous['files']:
                    raise ValueError('Experimental evidence changed: '+str(folder))
                if previous['parameters'] != options or previous['contract'] != recipes[model]:
                    raise ValueError('Existing experimental recipe changed; actual attempts cannot be overwritten')
                results[model] = previous
                continue
            results[model] = {'outcome':'interrupted_execution','reason':'Attempt directory exists without final manifest; no automatic repeat'}
            write_json(folder/'interruption.json',results[model])
            continue
        try:
            results[model] = execute_model(model,record,folder,options,recipes[model])
        except Exception:
            detail = traceback.format_exc()
            traceback.print_exc()
            results[model] = {'outcome':'execution_setup_failure','error':detail}
            write_json(output/(model+'-setup-failure.json'),results[model])
    write_json(output/'evaluation.json',{model:{key:value for key,value in result.items() if key!='files'}
        for model,result in results.items()})
    return results


def benchmark():
    tooling,upstream,_ = settings()
    with locked():
        unchanged = inventory(CURRENT)
        reference,baseline = verify('south-west','layerdiff')
    BATCH.mkdir(parents=True,exist_ok=True)
    config_path = BATCH/'experiment.json'
    recipes = {model:contract(model,tooling,upstream) for model in MODELS}
    if config_path.exists():
        config = json.loads(config_path.read_text())
        if config['recipes'] != recipes or config['current_inventory_before'] != unchanged:
            raise ValueError('Benchmark implementation or protected baseline changed')
        record = config['input']
        if sha(record['input']) != record['input_sha256'] or sha(record['source']) != record['source_sha256']:
            raise ValueError('Benchmark input changed')
    else:
        source = REPO/baseline['input']['source']
        record = prepare_source(source,BATCH/'reference',frame_size=baseline['input']['transform']['native_size'][0])
        if record['transform'] != baseline['input']['transform']:
            raise ValueError('Benchmark preprocessing differs from successful reference')
        if not np.array_equal(np.asarray(Image.open(record['input'])),np.asarray(Image.open(reference/'input.png'))):
            raise ValueError('Benchmark pixels differ from successful reference')
        # Retain the original reference input bytes, including its PNG encoding.
        shutil.copy2(reference/'input.png',record['input'])
        record['input_sha256'] = sha(record['input'])
        shutil.copy2(reference/'raw/layers/head.png',BATCH/'reference/baseline-head-raw.png')
        config = {'schema':'hex-sw-head-consistency/1','seeds':SEEDS,'input':record,
            'baseline_manifest_sha256':sha(reference/'manifest.json'),'baseline_path':str(reference),
            'recipes':recipes,'current_inventory_before':unchanged,
            'fixed':{'steps':20,'resolution':512,'depth_resolution':512,'quant_mode':'nf4','cpu_offload':True},
            'baseline_input_byte_identity':record['input_sha256']==baseline['input']['input_sha256']}
        write_json(config_path,config)
    with locked(OUTPUT/'work/session'):
        for number,seed in enumerate(evaluation_seeds(),1):
            options = parameters({'parameters':{'seed':seed}})
            run_dual(record,BATCH/f'run-{number:02d}',options,recipes)
            if inventory(CURRENT) != unchanged:
                raise ValueError('Protected current evidence changed during benchmark')
    write_json(BATCH/'integrity.json',{'current_unchanged':inventory(CURRENT)==unchanged,
        'bytes':sum(p.stat().st_size for p in BATCH.rglob('*') if p.is_file()),
        'runs':len(evaluation_seeds()),'original_planned_runs':len(SEEDS),'models_per_run':list(MODELS)})


def status():
    for number,seed in enumerate(SEEDS,1):
        states = []
        for model in MODELS:
            directory = BATCH/f'run-{number:02d}'/model
            manifest = directory/'manifest.json'
            if manifest.exists():
                states.append(model+': '+json.loads(manifest.read_text())['outcome'])
            elif (directory/'inference.log').exists():
                lines = (directory/'inference.log').read_text(encoding='utf-8',errors='replace').splitlines()
                states.append(model+': active '+next((line[-160:] for line in reversed(lines) if line.strip()),'starting'))
            else:
                states.append(model+': not attempted')
        print(f'{number:02d} seed={seed}: '+ ' | '.join(states))


def body_diagnostics(folder, record, source_alpha, threshold):
    layers = {}
    for tag in BODY_TAGS:
        path = folder/'raw/layers'/(tag+'.png')
        row = {'present':path.exists()}
        if path.exists():
            with Image.open(path) as image:
                row.update({'mode':image.mode,'size':list(image.size),'sha256':sha(path)})
                if tag == 'head':
                    alpha = np.asarray(image.getchannel('A'))
                    native = project((alpha>threshold).astype(np.uint8),record['transform'])>0
                    row.update({'alpha_threshold_exclusive':threshold,
                        'area_model_px':int((alpha>threshold).sum()),'area_native_px':int(native.sum()),
                        'outside_source_silhouette_native_px':int((native & (source_alpha==0)).sum())})
        layers[tag] = row
    return {'layers':layers,'meaning':'Objective output measurements only; no anatomical correctness classification.'}


def body_batch(plan):
    config = json.loads(Path(plan).read_text(encoding='utf-8'))
    seeds = config['seeds']
    if not isinstance(seeds,list) or not seeds:
        raise ValueError('Expected a nonempty, fixed seed list')
    options = [parameters({'parameters':{'seed':seed,'steps':config['steps'],
        'resolution':config['resolution'],'depth_resolution':config['resolution']}}) for seed in seeds]
    threshold = config['diagnostic_alpha_threshold']
    if type(threshold) is not int or not 0 <= threshold <= 255:
        raise ValueError('Expected an explicit diagnostic alpha threshold in0..255')
    output = (REPO/config['output']).resolve()
    protected = [CURRENT.resolve(),BATCH.resolve()]
    if any(output==root or output.is_relative_to(root) or root.is_relative_to(output) for root in protected):
        raise ValueError('Body-only output overlaps protected historical evidence')
    tooling,upstream,_ = settings()
    recipe = {**contract('layerdiff',tooling,upstream),'mode':'body-only',
              'preprocessing_sha256':sha(Path(__file__).with_name('preprocess.py')),
              'guidance_scale':1.0,'strength':1.0,'body_tags':BODY_TAGS}
    recipe.pop('head_support_sha256',None)
    recipe['head_policy'] = 'not requested: body-only'
    with locked(OUTPUT/'work/session'):
        # No cache, automatic retries, alternate seeds or overwrite of an old batch.
        output.mkdir(parents=True,exist_ok=False)
        record = prepare_source(REPO/config['input'],output/'input',config['resolution'],
                                config['preprocessing'],config.get('frame_size'))
        write_json(output/'plan.json',{'requested':config,'input':record,'contract':recipe})
        with Image.open(output/'input/source.png') as source:
            source_alpha = np.asarray(source.getchannel('A'))
        results = []
        for number,parameters_for_seed in enumerate(options,1):
            folder = output/f'run-{number:02d}'
            target = folder/'layerdiff'
            try:
                result = execute_model('layerdiff',record,target,parameters_for_seed,recipe,mode='body-only')
                write_json(folder/'diagnostics.json',body_diagnostics(target,record,source_alpha,threshold))
                results.append({'run':number,'seed':parameters_for_seed['seed'],'outcome':result['outcome']})
            except Exception:
                detail = traceback.format_exc()
                traceback.print_exc()
                write_json(folder/'failure.json',{'error':detail,'seed':parameters_for_seed['seed']})
                results.append({'run':number,'seed':parameters_for_seed['seed'],'outcome':'execution_setup_or_diagnostics_failure','error':detail})
            write_json(output/'status.json',{'mode':'body-only','results':results,
                'semantic_sam':'not requested','automatic_retries':False})


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action',choices=['benchmark','status','body-only'])
    parser.add_argument('--plan',type=Path,default=Path(__file__).with_name('body-only-plan.json'))
    args = parser.parse_args()
    if args.action=='body-only':
        body_batch(args.plan)
    elif args.action=='benchmark':
        benchmark()
    else:
        status()
