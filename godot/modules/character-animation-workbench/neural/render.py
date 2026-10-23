"""Render frozen candidates on unchanged Hex clips in an isolated project.

Skeleton/depth metadata enters only this diagnostic integration stage, never
inference or candidate generation. Unknown pixels are omitted, not bone-bound.
"""
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import numpy as np

from candidates import BONES, PALETTE
from preprocess import MODULE, OUTPUT, REPO, SOURCES, frame, sha
from PIL import Image


def main():
    destination = OUTPUT/'render/repo'
    baseline = json.loads((MODULE/'legacy/baseline.json').read_text())['commit']
    records = {}
    for view in SOURCES:
        folder = OUTPUT/'candidates'/(view+'-crop-nearest-512')
        records[view] = {'candidate':str(folder/'candidate.json'),
                         'owners_sha256':sha(folder/'owners-index.png')}
    if not destination.exists():
        data = subprocess.check_output(['git','archive',baseline,'godot'],cwd=REPO)
        destination.mkdir(parents=True)
        with tarfile.open(fileobj=io.BytesIO(data)) as archive:
            archive.extractall(destination,filter='data')
    (destination/'godot/project.godot').write_text(
        'config_version=5\n[application]\nconfig/name="Hex Neural Diagnostics"\n'
        '[rendering]\nrenderer/rendering_method="gl_compatibility"\n')
    (destination/'godot/scenes/.gdignore').touch()
    target = destination/'godot/modules/character-animation-workbench'
    sys.path.insert(0,str(target/'tools'))
    import compile_segmentation_preview as compiler
    if compiler.BONES != BONES or compiler.PALETTE != PALETTE:
        raise ValueError('Diagnostic output contract differs from the Hex bone palette')
    compiler.ROOT = target
    compiler.MASKS = OUTPUT/'render/inputs'
    compiler.MASKS.mkdir(parents=True,exist_ok=True)

    def known_source(view):
        source,_ = frame(view)
        indices = Image.open(OUTPUT/'candidates'/(view+'-crop-nearest-512')/'owners-index.png')
        source.putalpha(Image.fromarray(np.where(
            np.array(indices)>0,np.array(source.getchannel('A')),0).astype('uint8')))
        return source

    compiler.source = known_source
    orders = json.loads((target/'directional-depth.json').read_text())['directions']
    for view,direction in zip(SOURCES,['SOUTH','NORTH','SOUTH_WEST','NORTH_WEST']):
        owners = Image.open(OUTPUT/'candidates'/(view+'-crop-nearest-512')/'owners.png').convert('RGB')
        owners.save(compiler.MASKS/(view+'-owners.png'))
        compiler.compile_view(view,view,orders[direction])
    record = {'baseline_renderer_commit':baseline,'candidates_before_runtime_integration':records,
              'unknown_pixels':'omitted; never assigned a display bone',
              'integration':'existing Hex skeletons, clips and depth order; no candidate mask changes'}
    (OUTPUT/'render/provenance.json').write_text(json.dumps(record,indent=2)+'\n')
    shell = shutil.which('pwsh')
    if shell is None:
        raise FileNotFoundError('PowerShell 7 is required')
    for action in ('parse','segmentation-video','segmentation-encode'):
        with (OUTPUT/'render'/(action+'.log')).open('w',encoding='utf-8') as log:
            subprocess.run([shell,'-NoProfile','-File',str(target/'run.ps1'),action],
                           cwd=destination,stdout=log,stderr=subprocess.STDOUT,check=True)
    for view,record in records.items():
        if sha(OUTPUT/'candidates'/(view+'-crop-nearest-512')/'owners-index.png') != record['owners_sha256']:
            raise ValueError('Diagnostic integration modified candidate '+view)


if __name__ == '__main__':
    main()
