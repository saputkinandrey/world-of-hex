"""Render frozen candidates on unchanged Hex clips in an isolated project.

Skeleton/depth metadata enters only this diagnostic integration stage, never
inference or candidate generation. Unknown pixels are omitted, not bone-bound.
"""
import io
import argparse
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
from encode_diagnostics import encode


def main(prepare_only=False):
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
    unknown_assets = target/'tests/neural-diagnostics'
    unknown_assets.mkdir(exist_ok=True)
    resources,nodes = [],[]
    names = ['South','North','SouthWest','NorthWest']
    for view,direction,name in zip(SOURCES,['SOUTH','NORTH','SOUTH_WEST','NORTH_WEST'],names):
        owners = Image.open(OUTPUT/'candidates'/(view+'-crop-nearest-512')/'owners.png').convert('RGB')
        owners.save(compiler.MASKS/(view+'-owners.png'))
        compiler.compile_view(view,view,orders[direction])
        indices = np.asarray(Image.open(OUTPUT/'candidates'/(view+'-crop-nearest-512')/'owners-index.png'))
        source = np.asarray(frame(view)[0]).copy()
        source[indices>0] = 0
        flat = source.copy()
        flat[flat[...,3]>0,:3] = 100
        for mode,values in [('chunks',flat),('source',source)]:
            path = unknown_assets/(view+'-'+mode+'.png')
            Image.fromarray(values).save(path)
            resources.append('[ext_resource type="Texture2D" path="res://modules/character-animation-workbench/tests/neural-diagnostics/'+path.name+'" id="unknown_'+name+'_'+mode+'"]')
        nodes.append('[node name="UnknownSource" type="Sprite2D" parent="Viewport/'+name+'/Preview/Mirror/'+name+'"]\ntexture_filter = 1\ntexture = ExtResource("unknown_'+name+'_chunks")\nmetadata/chunks_texture = ExtResource("unknown_'+name+'_chunks")\nmetadata/source_texture = ExtResource("unknown_'+name+'_source")\n')
    scene_path = target/'tests/segmentation-preview.tscn'
    baseline_scene = subprocess.check_output(['git','show',baseline+':godot/modules/character-animation-workbench/tests/segmentation-preview.tscn'],cwd=REPO).decode('utf-8')
    first_node = baseline_scene.index('[node ')
    scene_path.write_text(baseline_scene[:first_node]+'\n'.join(resources)+'\n'+baseline_scene[first_node:]+'\n'+'\n'.join(nodes))
    shutil.copyfile(Path(__file__).with_name('render-diagnostics.gd'),target/'tests/render-segmentation.gd')
    record = {'baseline_renderer_commit':baseline,'candidates_before_runtime_integration':records,
              'unknown_pixels':'omitted; never assigned a display bone',
              'integration':'existing Hex skeletons, clips and depth order; no candidate mask changes'}
    (OUTPUT/'render/provenance.json').write_text(json.dumps(record,indent=2)+'\n')
    shell = shutil.which('pwsh')
    if shell is None:
        raise FileNotFoundError('PowerShell 7 is required')
    for action in (('parse',) if prepare_only else ('parse','segmentation-video')):
        with (OUTPUT/'render'/(action+'.log')).open('w',encoding='utf-8') as log:
            subprocess.run([shell,'-NoProfile','-File',str(target/'run.ps1'),action],
                           cwd=destination,stdout=log,stderr=subprocess.STDOUT,check=True)
    if not prepare_only:
        encode(destination/'tmp/animation-workbench/segmentation')
    for view,record in records.items():
        if sha(OUTPUT/'candidates'/(view+'-crop-nearest-512')/'owners-index.png') != record['owners_sha256']:
            raise ValueError('Diagnostic integration modified candidate '+view)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare-only',action='store_true')
    main(parser.parse_args().prepare_only)
