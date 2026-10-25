"""Local contracts and exact geometry; no model initialization at import time."""
import hashlib
import json
from pathlib import Path, PureWindowsPath

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
OLD = ROOT.parent/'anatomy-benchmark-v1.0.0'
GROUPS = {'Torso':[1,2], 'Right_Hand':[3], 'Left_Hand':[4], 'Left_Foot':[5], 'Right_Foot':[6],
          'Right_Upper_Leg':[7,9], 'Left_Upper_Leg':[8,10], 'Right_Lower_Leg':[11,13], 'Left_Lower_Leg':[12,14],
          'Left_Upper_Arm':[15,17], 'Right_Upper_Arm':[16,18], 'Left_Lower_Arm':[19,21], 'Right_Lower_Arm':[20,22], 'Head':[23,24]}
COLORS = {'Torso':[164,106,211], 'Head':[238,136,191], 'Left_Upper_Arm':[235,91,64], 'Right_Upper_Arm':[169,66,46],
          'Left_Lower_Arm':[245,186,45], 'Right_Lower_Arm':[176,134,32], 'Left_Upper_Leg':[65,153,229], 'Right_Upper_Leg':[47,110,165],
          'Left_Lower_Leg':[59,201,142], 'Right_Lower_Leg':[42,145,102], 'Left_Hand':[40,220,218], 'Right_Hand':[34,158,157],
          'Left_Foot':[241,158,62], 'Right_Foot':[174,114,45]}


def read(path): return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary = path.with_suffix(path.suffix+'.tmp')
    temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    temporary.replace(path)


def sha(path):
    value = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda:stream.read(8*1024**2),b''): value.update(chunk)
    return value.hexdigest()


def digest(value): return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False).encode()).hexdigest()


def linux_path(path):
    windows = PureWindowsPath(path)
    return Path('/mnt')/windows.drive[0].lower()/Path(*windows.parts[1:])


def frame(entry):
    if sha(REPO/entry['source_file']) != entry['source_sha256']:
        raise ValueError('Source changed: '+entry['source_file'])
    with Image.open(REPO/entry['source_file']) as image:
        result = image.convert('RGBA').crop(tuple(entry['atlas_box']))
    return ImageOps.mirror(result) if entry['mirrored'] else result


def prepare(image, method):
    config = read(ROOT/'config.json')
    if method=='bicubic512':
        size = max(config['baseline_canvas'],image.width,image.height)
        offset = [(size-image.width)//2,(size-image.height)//2]
        canvas = Image.new('RGBA',(size,size),(0,0,0,0))
        canvas.paste(image,tuple(offset))
    elif method=='direct':
        canvas = image
        offset = [0,0]
    else: raise ValueError('Unknown preprocessing method: '+method)
    composite = Image.new('RGBA',canvas.size,tuple(config['background_rgb'])+(255,))
    composite.alpha_composite(canvas)
    composite = composite.convert('RGB')
    before = list(composite.size)
    if method=='bicubic512':
        composite = composite.resize((config['baseline_size'],config['baseline_size']),Image.Resampling.BICUBIC)
    return composite, {'method':method,'source_size':list(image.size),'canvas_size':before,'source_offset_xy':offset,
                       'predictor_input_size':list(composite.size),'background_rgb':config['background_rgb'],
                       'external_interpolation':'Pillow BICUBIC' if method=='bicubic512' else 'none',
                       'coordinates':'Input pixel-center=(source center + source_offset)*input_size/canvas_size; native labels and UV use the same nearest model-grid sample.'}


def native_indices(transform, shape):
    width,height = transform['source_size']
    canvas_w,canvas_h = transform['canvas_size']
    xx = np.asarray(Image.fromarray(np.arange(shape[-1],dtype=np.int32)[None]).resize((canvas_w,1),Image.Resampling.NEAREST))[0]
    yy = np.asarray(Image.fromarray(np.arange(shape[-2],dtype=np.int32)[:,None]).resize((1,canvas_h),Image.Resampling.NEAREST))[:,0]
    x,y = transform['source_offset_xy']
    return yy[y:y+height],xx[x:x+width]


def project(array, transform):
    yy,xx = native_indices(transform,array.shape)
    return array[...,yy[:,None],xx[None,:]]


def result_path(entry): return ROOT/'results'/entry['pose']/entry['direction']/f"frame-{entry['atlas_frame']:03d}"


def adapter_hash():
    return digest({name:sha(ROOT/name) for name in ['core.py','inference.py','artifacts.py']})
