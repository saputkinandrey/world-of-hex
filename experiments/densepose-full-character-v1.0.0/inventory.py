"""Resolve actual body atlases through compositor snapshots, not filename guesses."""
import re
import subprocess
import os

from PIL import Image

from core import ROOT, REPO, OLD, read, write, sha, digest, frame


def inventory():
    if (ROOT/'source-inventory.json').exists():
        if (ROOT/'protected-before.json').exists(): raise FileExistsError('Inventory already exists; preserve its baseline')
        protect()
        print(read(ROOT/'source-inventory.json')['counts'],flush=True)
        return
    catalog_path = REPO/'godot/modules/character-animation-workbench/base-catalog.tres'
    text = catalog_path.read_text(encoding='utf-8')
    paths = dict((identifier,'godot/'+path.removeprefix('res://')) for path,identifier in re.findall(r'\[ext_resource type="Texture2D" path="([^"]+)" id="([^"]+)"\]',text))
    labels = {}
    for kind in ['poses','directions']:
        line = re.search(r'metadata/'+kind+r' = PackedStringArray\(([^\n]+)\)',text).group(1)
        labels[kind] = [s.lower().replace('_','-') for s in re.findall(r'"([^"]+)"',line)]
    snapshots = re.findall(r'"Saved source:(\d+):(\d+)": \{(.*?)(?=\n"[^"\n]+:\d+:\d+": \{|\n}\nmetadata/outfits)',text,re.S)
    if len(snapshots)!=len(labels['poses'])*len(labels['directions']): raise ValueError('Catalog snapshot count mismatch')
    atlases,entries,issues = [],[],[]
    mirror_sources = {'south-east':'south-west','north-east':'north-west'}
    for pose_index,direction_index,block in snapshots:
        pose,direction = labels['poses'][int(pose_index)],labels['directions'][int(direction_index)]
        body = re.search(r'"body": \{(.*?)\n\}',block,re.S).group(1)
        texture = re.search(r'"texture": ExtResource\("([^"]+)"\)',body).group(1)
        source = paths[texture]
        hframes = int(re.search(r'"hframes": (\d+)',body).group(1))
        vframes = int(re.search(r'"vframes": (\d+)',body).group(1))
        mirrored = re.search(r'"flip_h": (true|false)',body).group(1)=='true'
        if mirrored != (direction in mirror_sources): raise ValueError('Compositor mirror mismatch: '+pose+'/'+direction)
        path = REPO/source
        if not path.exists():
            issues.append({'missing_file':source,'pose':pose,'direction':direction})
            continue
        with Image.open(path) as image:
            width,height = image.size
        if width%hframes or height%vframes: raise ValueError('Nonintegral atlas grid: '+source)
        size = [width//hframes,height//vframes]
        record = {'pose':pose,'direction':direction,'source_file':source,'source_direction':mirror_sources.get(direction,direction),
                  'mirrored':mirrored,'atlas_size':[width,height],'frame_size':size,'hframes':hframes,'vframes':vframes,'source_sha256':sha(path)}
        atlases.append(record)
        for index in range(hframes*vframes):
            column,row = index%hframes,index//hframes
            entry = dict(record,character='Character1',atlas_frame=index,atlas_box=[column*size[0],row*size[1],(column+1)*size[0],(row+1)*size[1]],
                         frame_role='skin-tone variant selected by CharacterSpriteEntity.skin_color; not animation time')
            entry['frame_rgba_sha256'] = digest({'size':size,'bytes_sha256':__import__('hashlib').sha256(frame(entry).tobytes()).hexdigest()})
            entry['key'] = pose+'/'+direction+f'/frame-{index:03d}'
            entry['inference_source_key'] = pose+'/'+entry['source_direction']+f'/frame-{index:03d}'
            entries.append(entry)
    referenced = {a['source_file'] for a in atlases}
    disk_body = {str(p.relative_to(REPO)).replace('\\','/') for p in (REPO/'godot/assets/Character/Character1').rglob('*.png') if 'body' in p.stem.lower() and 'weapon' not in p.stem.lower()}
    for path in sorted(disk_body-referenced): issues.append({'unreferenced_body_candidate':path})
    for path in sorted(referenced-disk_body): issues.append({'catalog_body_not_matching_filename_heuristic':path})
    counts = {'poses':len(labels['poses']),'directions':len(labels['directions']),'independent_directions':4,
              'source_atlases':len(referenced),'source_frames':sum(a['hframes']*a['vframes'] for a in atlases if not a['mirrored']),
              'expected_inferences':sum(not e['mirrored'] for e in entries),'expected_final_frames':len(entries),
              'expected_mirrored_results':sum(e['mirrored'] for e in entries),
              'unique_rgba_images':len({e['frame_rgba_sha256'] for e in entries if not e['mirrored']})}
    write(ROOT/'source-inventory.json',{'schema':'character-frame-inventory/1','counts':counts,'labels':labels,'issues':issues,'atlases':atlases,'frames':entries,
          'source_evidence':{'catalog':sha(catalog_path),'compositor':sha(REPO/'godot/modules/character-sprite/character-sprite.entity.gd'),
                             'frame_semantics':'_pose_layer_spec: body frame_index=int(skin_color); no temporal frame interpretation'}})
    protect()
    print(counts,flush=True)
    print('Catalog issues:',issues,flush=True)


def protect():
    protected = {}
    for directory in [OLD,REPO/'godot/modules/character-animation-workbench',REPO/'godot/modules/character-sprite-tool',REPO/'godot/modules/character-sprite',REPO/'godot/assets/Character/Character1',REPO/'.agents/skills']:
        for base,dirs,files in os.walk(directory):
            dirs[:] = [name for name in dirs if name not in ['cache','node_modules','.venv','.venv-sapiens','__pycache__','.git']]
            for name in files:
                path = __import__('pathlib').Path(base)/name
                protected[str(path.relative_to(REPO)).replace('\\','/')] = sha(path)
    write(ROOT/'protected-before.json',protected)
