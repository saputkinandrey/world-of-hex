"""Run the isolated upstream See-through experiment; never edit production art."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time


def environment(tooling, upstream):
    result = dict(os.environ)
    result.update(PYTHONUTF8='1', PYTHONUNBUFFERED='1',
                  HF_HOME=str(tooling/'cache/huggingface'),
                  TORCH_HOME=str(tooling/'cache/torch'),
                  PYTHONPATH=os.pathsep.join([str(upstream),str(upstream/'common')]),
                  HF_HUB_DOWNLOAD_TIMEOUT='120')
    return result


def run_logged(command, cwd, env, log):
    print('Command: '+subprocess.list2cmdline([str(part) for part in command]),flush=True)
    print('Log: '+str(log),flush=True)
    with log.open('w',encoding='utf-8') as output:
        result = subprocess.run(command,cwd=cwd,env=env,stdout=output,stderr=subprocess.STDOUT)
    if result.returncode:
        print(log.read_text(encoding='utf-8',errors='replace')[-8000:],file=sys.stderr)
        raise subprocess.CalledProcessError(result.returncode,command)


def main(repo, action):
    output = repo/'tmp/animation-workbench/seethrough-probe'
    settings = json.loads((output/'runtime.json').read_text(encoding='utf-8'))
    tooling = Path(settings['tooling'])
    upstream = tooling/'see-through-windows/see-through'
    python = upstream/'.venv/Scripts/python.exe'
    env = environment(tooling,upstream)
    if action == 'install':
        uv = tooling/'uv-0.5.29/uv.exe'
        # Optional annotator/training tiers are not used by this PSD entrypoint.
        run_logged([str(uv),'pip','install','--python',str(python),'-r','requirements.txt',
                    '-r','requirements-inference-bnb.txt'],upstream,env,output/'dependencies.log')
    elif action == 'cuda':
        run_logged([str(python),str(Path(__file__).with_name('seethrough_cuda_check.py')),
                    str(output/'cuda.json')],upstream,env,output/'cuda.log')
        print((output/'cuda.json').read_text(encoding='utf-8'))
    elif action == 'offload-check':
        run_logged([str(python),str(Path(__file__).with_name('check_seethrough_offload.py'))],
                   upstream,env,output/'offload-check.log')
        print((output/'offload-check.log').read_text(encoding='utf-8'))
    else:
        source = output/'model-inputs'/f'south-west-{action}-512.png'
        started = time.time_ns()
        command = [str(python),'-X','faulthandler','inference/scripts/inference_psd_quantized.py',
                   '--srcp',str(source),'--save_dir',str(output/'results'/action),
                   '--save_to_psd','--tblr_split','--seed','42','--resolution','512',
                   '--resolution_depth','512','--num_inference_steps','20',
                   '--quant_mode','nf4','--cpu_offload','--no_group_offload']
        run_logged(command,upstream,env,output/(action+'-inference.log'))
        psds = sorted(path for path in (output/'results'/action).rglob('*.psd')
                      if path.stat().st_mtime_ns >= started)
        if not psds:
            raise FileNotFoundError('Upstream returned success without a PSD: '+str(output/'results'/action))
        print('PSD files: '+', '.join(map(str,psds)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo',type=Path,required=True)
    parser.add_argument('action',choices=['install','cuda','offload-check','bicubic','nearest'])
    args = parser.parse_args()
    main(args.repo.resolve(),args.action)
