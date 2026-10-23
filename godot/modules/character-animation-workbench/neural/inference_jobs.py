"""Model-isolated cache verification, execution and explicit raw promotion."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import subprocess
import traceback

from evidence_store import CURRENT, CLASSES, locked, promote, recover_temporary, status_update, verify, write_json
from inference_recipe import contract
from infer import settings
from preprocess import OUTPUT, sha
from recipe import require_input


def reset_work(path):
    expected = (OUTPUT/'work').resolve()
    if not path.resolve().is_relative_to(expected):
        raise ValueError('Working directory escapes neural work root')
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True)


def cached(view, model, record, recipe, root=CURRENT):
    if not (Path(root)/view/model/'current.json').exists():
        return None
    path,metadata = verify(view,model,root)
    require_input(metadata['input'],record)
    if metadata.get('contract') != recipe:
        return None
    return path,metadata


def run_one(view, model, record, force=False):
    require_input(record,record)
    tooling,upstream,python = settings()
    recipe = contract(model,tooling,upstream)
    now = datetime.now(timezone.utc).isoformat()
    # Input/recipe mismatch requests inference; corruption remains a real failure.
    with locked():
        if not force:
            recover_temporary(view,model)
        pointer = CURRENT/view/model/'current.json'
        if pointer.exists() and not force:
            _,previous = verify(view,model)
            same_input = all(previous['input'][field] == record[field]
                             for field in ('source_sha256','input_sha256','transform'))
            if same_input:
                reused = cached(view,model,record,recipe)
                if reused:
                    status_update(view,model,{'stage':'inference','outcome':'reused_valid_raw',
                        'time_utc':now,'snapshot':reused[0].name,'export':reused[1].get('export')})
                    print(f'{view}/{model}: reused validated direct outputs',flush=True)
                    return reused[1]
    work = OUTPUT/'work'/view/model
    reset_work(work)
    shutil.copy2(record['input'],work/'input.png')
    request = {'view':view,'model':model,'input':record,'contract':recipe}
    write_json(work/'request.json',request)
    env = dict(os.environ,PYTHONUTF8='1',PYTHONUNBUFFERED='1',HF_HUB_OFFLINE='1',
        HF_HOME=str(tooling/'cache/huggingface'),TORCH_HOME=str(tooling/'cache/torch'),
        PYTHONPATH=os.pathsep.join([str(upstream),str(upstream/'common')]))
    worker = Path(__file__).with_name('layerdiff_worker.py' if model=='layerdiff' else 'sam_worker.py')
    print(f'{view}/{model}: running genuine upstream inference; log: {work / "inference.log"}',flush=True)
    with (work/'inference.log').open('w',encoding='utf-8') as log:
        result = subprocess.run([str(python),'-X','faulthandler',str(worker),str(work)],
                                cwd=upstream,env=env,stdout=log,stderr=subprocess.STDOUT)
    outcome = json.loads((work/'result.json').read_text()) if (work/'result.json').exists() else {}
    failed_model_stage = model=='layerdiff' and outcome.get('stages',{}).get('layerdiff',{}).get('outcome')=='inference_failure'
    if result.returncode or failed_model_stage:
        raise subprocess.CalledProcessError(result.returncode or 1,[str(worker),str(work)],
            output=(work/'inference.log').read_text(encoding='utf-8',errors='replace')[-12000:])
    metadata = {**request,'inference':'success','provenance':outcome,
        'stages':{name:record['outcome'] for name,record in outcome.get('stages',{}).items()},
        'original_head_coordinates_available':model=='layerdiff' and outcome.get('stages',{}).get('head',{}).get('outcome')=='success',
        'export':outcome.get('stages',{}).get('export',{'outcome':'not_applicable'}),
        'classes':CLASSES if model=='semantic-sam' else None}
    def populate(target):
        shutil.copy2(work/'input.png',target/'input.png')
        shutil.copytree(work/'raw',target/'raw')
        for name in ('request.json','result.json','inference.log'):
            if (work/name).exists():
                shutil.copy2(work/name,target/'raw'/name)
    try:
        with locked():
            path,_ = promote(view,model,populate,metadata)
            status_update(view,model,{'stage':'inference','outcome':'inference_success',
                'time_utc':now,'snapshot':path.name,'stages':outcome.get('stages',{})})
    except Exception as error:
        error.add_note('Neural stage: raw persistence')
        raise
    # Only newly created bounded working data is removed, after successful promotion.
    if not work.resolve().is_relative_to((OUTPUT/'work').resolve()):
        raise ValueError('Invalid work cleanup path')
    shutil.rmtree(work)
    return metadata


def attempt_one(view, model, record, force=False):
    try:
        return run_one(view,model,record,force)
    except Exception as error:
        detail = traceback.format_exc()
        if isinstance(error,subprocess.CalledProcessError):
            detail += '\n'+str(error.output)
        persistence = 'Neural stage: raw persistence' in getattr(error,'__notes__',[])
        stage = 'persistence' if persistence else 'inference' if isinstance(error,subprocess.CalledProcessError) else 'validation'
        with locked():
            status_update(view,model,{'stage':stage,'outcome':stage+'_failure',
                'time_utc':datetime.now(timezone.utc).isoformat(),'error':detail,
                'previous_success_preserved':True})
        print(detail,flush=True)
        return None
