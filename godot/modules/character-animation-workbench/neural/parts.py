"""Invoke upstream rig-parts; retain every refusal and diagnostic verbatim."""
import argparse
import json
from pathlib import Path
import subprocess
import re

from infer import settings
from preprocess import OUTPUT, REPO, SOURCES, sha


def command(arguments, log):
    tooling,_,_ = settings()
    package = tooling/'rig-runtime/node_modules/@rig-c/parts'
    bun = tooling/'rig-runtime/node_modules/bun/bin/bun.exe'
    invocation = [str(bun),str(package/'cli.ts'),*map(str,arguments)]
    result = subprocess.run(invocation,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    log.write_bytes(result.stdout)
    record = {'command':invocation,'exit_code':result.returncode,
              'package_version':json.loads((package/'package.json').read_text())['version'],
              'cli_sha256':sha(package/'cli.ts')}
    log.with_suffix('.command.json').write_text(json.dumps(record,indent=2)+'\n')
    print(log.name+': exit '+str(result.returncode),flush=True)
    if result.returncode and arguments[0] != 'guide':
        for rule in sorted(set(re.findall(rb'FAIL\s+([A-Z][A-Z0-9_]+):',result.stdout))):
            command(['guide',rule.decode()],log.with_name(log.stem+'-'+rule.decode()+'.guide.log'))
    return result


def inspect(key, source, psd, head=None):
    folder = OUTPUT/'parts'/(key+'-head' if head else key)
    folder.mkdir(parents=True,exist_ok=True)
    command(['layers',psd],folder/'psd-layers.log')
    command(['guide','PSD_LAYER_PLAIN'],folder/'psd-mask-guide.log')
    _,_,python = settings()
    wrapper = folder/'wrapper'
    subprocess.run([str(python),str(Path(__file__).with_name('psd_adapter.py')),str(psd),str(wrapper)],check=True)
    command(['layers',wrapper],folder/'layers.log')
    command(['sheet','--source',source,'--layers',wrapper,'--out',folder/'sheet.png','--cols','4'],folder/'sheet.log')
    command(['propose','--head-box','--full',wrapper,'--canvas','512x512'],folder/'head-box.log')
    config = folder/'config.json'
    if not config.exists():
        config.write_text(json.dumps({'key':key,'seethrough':{'resolution':512,'steps':20,
                          'seed':42,'offload':True},'assemble':{'rig_scale':1}},indent=2)+'\n')
    else:
        data = json.loads(config.read_text())
        data['seethrough'].update(steps=20,seed=42,offload=True)
        config.write_text(json.dumps(data,indent=2)+'\n')
    head_arguments = []
    if head:
        data = json.loads(config.read_text())
        data['seethrough']['head_box'] = json.loads((head/'experiment.json').read_text())['head_box']
        config.write_text(json.dumps(data,indent=2)+'\n')
        head_arguments = ['--head',head]
    result = command(['assemble','--propose-plan','--source',source,'--full',wrapper,
                     *head_arguments,'--config',config,'--write-config',config],folder/'plan.log')
    if result.returncode == 0:
        result = command(['assemble','--source',source,'--full',wrapper,'--config',config,
                          *head_arguments,'--out',folder/'assembly','--project','visible','--seam','silhouette'],folder/'assemble.log')
        if result.returncode == 0:
            command(['propose','--parts',folder/'assembly/rig','--source',source,
                     '--out',folder/'proposal'],folder/'propose.log')


def main(action):
    if action == 'controls':
        for method in ('nearest','bicubic'):
            root = REPO/'tmp/animation-workbench/seethrough-probe'
            inspect('control-'+method,root/f'model-inputs/south-west-{method}-512.png',
                    root/f'results/{method}/south-west-{method}-512.psd')
    elif action == 'heads':
        records = json.loads((OUTPUT/'inputs.json').read_text())
        requested = json.loads(Path(__file__).with_name('experiments.json').read_text())['head_views']
        for view in requested:
            key = view+'-crop-nearest-512'
            inspect(key,records[key]['input'],OUTPUT/'runs'/key/(key+'.psd'),OUTPUT/'heads'/view)
    else:
        records = json.loads((OUTPUT/'inputs.json').read_text())
        for metadata in sorted((OUTPUT/'runs').glob('*/experiment.json')):
            record = json.loads(metadata.read_text())
            if record['exit_code']:
                continue
            key = record['key']
            inspect(key,records[key]['input'],OUTPUT/'runs'/key/(key+'.psd'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action',choices=['controls','runs','heads'])
    main(parser.parse_args().action)
