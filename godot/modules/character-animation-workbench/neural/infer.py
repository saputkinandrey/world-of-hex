"""Run the genuine installed upstream PSD pipeline with experimental head bounds."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import traceback

from preprocess import OUTPUT, REPO, sha
from recipe import attempt_folder, fingerprint, require_same

WORKER_SOURCE_SHA256 = sha(__file__)


def settings():
    tooling = Path(json.loads((REPO/'tmp/animation-workbench/seethrough-probe/runtime.json').read_text(encoding='utf-8'))['tooling'])
    upstream = tooling/'see-through-windows/see-through'
    return tooling,upstream,upstream/'.venv/Scripts/python.exe'


def execute_upstream():
    from head_localization import head_support
    _,upstream,_ = settings()
    entry = upstream/'inference/scripts/inference_psd_quantized.py'
    source = entry.read_text(encoding='utf-8')
    old = '(head_img[..., -1] > 15).astype(np.uint8)'
    if source.count(old) != 1:
        raise ValueError('Pinned upstream head-localization seam changed')
    source = source.replace(old,"_hex_head_support(head_img[..., -1], osp.join(saved, 'head-localization.json'))")
    sys.path.insert(0,str(entry.parent))
    exec(compile(source,str(entry),'exec'),{
        '__name__':'__main__','__file__':str(entry),'_hex_head_support':head_support})


def run(key, attempt=None):
    record = json.loads((OUTPUT/'inputs.json').read_text())[key]
    folder = attempt_folder(OUTPUT/'runs'/key,attempt)
    folder.mkdir(parents=True,exist_ok=True)
    metadata = folder/'experiment.json'
    tooling,upstream,python = settings()
    models = {path.parent.parent.name:path.read_text().strip() for path in
              (tooling/'cache/huggingface/hub').glob('models--24yearsold--*/refs/main')}
    recipe = fingerprint('layerdiff-nf4-body-head-depth',[
        Path(__file__),Path(__file__).with_name('head_localization.py')],
        {'seed':42,'steps':20,'resolution':512,'depth_resolution':512,'nf4':True,
         'cpu_offload':True,'group_offload':False,'tblr_split':True,'models':models,
         'source_sha256':record['source_sha256'],'transform':record['transform']},upstream)
    if metadata.exists():
        previous = json.loads(metadata.read_text())
        require_same(previous,recipe)
        if previous['input_sha256'] != record['input_sha256']:
            raise ValueError('Input changed for existing experiment '+key)
        if previous['exit_code'] == 0 and previous['psds'] and all(sha(path) == digest for path,digest in previous['psds'].items()):
            print('Reusing completed experiment '+key,flush=True)
            return
        raise ValueError('Existing unsuccessful experiment retained; choose a new run key: '+key)
    env = dict(os.environ,PYTHONUTF8='1',PYTHONUNBUFFERED='1',HF_HUB_OFFLINE='1',
               HF_HOME=str(tooling/'cache/huggingface'),TORCH_HOME=str(tooling/'cache/torch'),
               PYTHONPATH=os.pathsep.join([str(upstream),str(upstream/'common')]))
    command = [str(python),'-X','faulthandler',str(Path(__file__).resolve()),'--worker',
               '--srcp',record['input'],'--save_dir',str(folder),
               '--save_to_psd','--tblr_split','--seed','42','--resolution','512',
               '--resolution_depth','512','--num_inference_steps','20','--quant_mode','nf4',
               '--cpu_offload','--no_group_offload']
    started = time.time()
    print('Running '+key,flush=True)
    with (folder/'inference.log').open('w',encoding='utf-8') as log:
        result = subprocess.run(command,cwd=upstream,env=env,stdout=log,stderr=subprocess.STDOUT)
    info = {**record,'key':key,'attempt':attempt,'command':command,'elapsed_seconds':time.time()-started,
            'exit_code':result.returncode,'upstream_commit':subprocess.check_output(
                ['git','rev-parse','HEAD'],cwd=upstream,text=True).strip(),
            'head_adapter_sha256':sha(Path(__file__).with_name('head_localization.py')),
            'worker_sha256':WORKER_SOURCE_SHA256,'recipe':recipe,
            'runtime_stats':json.loads((folder/key/'stats.json').read_text()) if (folder/key/'stats.json').exists() else None,
            'model_revisions':{path.parent.parent.name:path.read_text().strip() for path in
                (tooling/'cache/huggingface/hub').glob('models--24yearsold--*/refs/main')},
            'upstream_compatibility_files':{name:sha(upstream/name) for name in [
                'common/modules/layerdiffuse/diffusers_kdiffusion_sdxl.py',
                'inference/scripts/inference_psd_quantized.py']},
            'psds':{str(path):sha(path) for path in folder.glob('*.psd')}}
    metadata.write_text(json.dumps(info,indent=2)+'\n')
    if result.returncode or not info['psds']:
        print((folder/'inference.log').read_text(encoding='utf-8',errors='replace')[-6000:])
        raise subprocess.CalledProcessError(result.returncode or 1,command,output=str(folder/'inference.log'))
    print('Completed '+key,flush=True)


if __name__ == '__main__':
    if '--worker' in sys.argv:
        sys.argv.remove('--worker')
        execute_upstream()
    else:
        parser = argparse.ArgumentParser()
        parser.add_argument('keys',nargs='*')
        parser.add_argument('--attempt')
        args = parser.parse_args()
        keys = args.keys or json.loads(Path(__file__).with_name('experiments.json').read_text())['batch']
        failed = []
        for key in keys:
            try:
                run(key,args.attempt)
            except subprocess.CalledProcessError:
                traceback.print_exc()
                failed.append(key)
        if failed:
            print('Retained unsuccessful experiments: '+', '.join(failed),file=sys.stderr)
            sys.exit(1)
