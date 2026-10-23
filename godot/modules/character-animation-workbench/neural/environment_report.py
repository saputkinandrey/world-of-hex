"""Record optional-model compatibility without changing the working environment."""
import json
import os
from pathlib import Path
import shutil
import subprocess

from infer import settings
from preprocess import OUTPUT


def main():
    _,upstream,python = settings()
    folder = OUTPUT/'environment'
    folder.mkdir(parents=True,exist_ok=True)
    env = dict(os.environ,PYTHONUTF8='1',PYTHONPATH=os.pathsep.join([str(upstream),str(upstream/'common')]))
    result = {}
    for name,module in [('semantic-sam','modules.semanticsam'),('bizarre-pose','annotators.bizarre_tagger')]:
        process = subprocess.run([str(python),'-c','import '+module],env=env,
                                 stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        (folder/(name+'.log')).write_bytes(process.stdout)
        result[name] = {'module':module,'exit_code':process.returncode,'log':str(folder/(name+'.log'))}
    result['build_tools_on_path'] = {name:shutil.which(name) for name in ['cl','nvcc','conda']}
    result['decision'] = 'Use SemanticSam if its real import passes. Do not replace torch or install legacy mmpose/mmcv/detectron2 into the working environment.'
    (folder/'compatibility.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))


if __name__ == '__main__':
    main()
