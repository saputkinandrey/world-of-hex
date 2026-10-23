"""Additional full-resolution head passes using neural-only crop evidence."""
import json
import math
import os
from pathlib import Path
import sys
import time
from types import SimpleNamespace

import cv2
import numpy as np
from PIL import Image
from head_localization import head_support
from infer import settings
from preprocess import OUTPUT, SOURCES, sha

TAGS = ['headwear','face','irides','eyebrow','eyewhite','eyelash','eyewear','ears','earwear','nose','mouth']


def crop_box(alpha):
    x,y,width,height = cv2.boundingRect(cv2.findNonZero(head_support(alpha)))
    side = math.ceil(max(width,height)*1.4)
    if side > min(alpha.shape):
        raise ValueError('Confident neural head cannot fit a square crop in the input')
    left = max(0,min(alpha.shape[1]-side,round(x+width/2-side/2)))
    top = max(0,min(alpha.shape[0]-side,round(y+height/2-side/2)))
    return [left,top,left+side,top+side]


def main():
    tooling,upstream,_ = settings()
    os.environ.update(HF_HUB_OFFLINE='1',HF_HOME=str(tooling/'cache/huggingface'),
                      TORCH_HOME=str(tooling/'cache/torch'))
    sys.path[:0] = [str(upstream),str(upstream/'common'),str(upstream/'inference/scripts')]
    import torch
    from inference_psd_quantized import build_layerdiff_pipeline
    pipeline = None
    records = json.loads((OUTPUT/'inputs.json').read_text())
    requested = json.loads(Path(__file__).with_name('experiments.json').read_text())['head_views']
    if any(view not in SOURCES for view in requested):
        raise ValueError('Head experiment requested an unsupported original projection')
    for view in requested:
        key = view+'-crop-nearest-512'
        folder = OUTPUT/'heads'/view
        folder.mkdir(parents=True,exist_ok=True)
        body_head = OUTPUT/'runs'/key/key/'head.png'
        previous_path = folder/'experiment.json'
        if previous_path.exists():
            previous = json.loads(previous_path.read_text())
            if previous['source_body_head_sha256'] != sha(body_head):
                raise ValueError('Body head prediction changed for existing head experiment: '+view)
            if not all(sha(folder/(tag+'.png')) == digest for tag,digest in previous['raw_layers'].items()):
                raise ValueError('Detailed head outputs changed: '+view)
            print('Reusing detailed head '+view,flush=True)
            continue
        alpha = np.asarray(Image.open(body_head).convert('RGBA'))[...,3]
        box = crop_box(alpha)
        source = Image.open(records[key]['input']).convert('RGBA')
        image = source.crop(box).resize((512,512),Image.Resampling.NEAREST)
        image.save(folder/'input.png')
        if pipeline is None:
            pipeline = build_layerdiff_pipeline(SimpleNamespace(quant_mode='nf4',cpu_offload=True,
                group_offload=False,repo_id_layerdiff='24yearsold/seethroughv0.0.2_layerdiff3d_nf4'))
        started = time.time()
        torch.cuda.reset_peak_memory_stats()
        with torch.inference_mode():
            result = pipeline(strength=1.0,num_inference_steps=20,batch_size=1,
                generator=torch.Generator(device='cpu').manual_seed(42),guidance_scale=1.0,
                prompt=TAGS,negative_prompt='',fullpage=np.array(image),group_index=1)
        layers = []
        if len(result.images) != len(TAGS):
            raise ValueError('Upstream head output does not match eleven semantic tags')
        for tag,values in zip(TAGS,result.images):
            Image.fromarray(values).save(folder/(tag+'.png'))
            layers.append({'name':tag,'filename':tag+'.png','left':0,'top':0,
                           'right':512,'bottom':512,'depth_median':None})
        (folder/'layers.json').write_text(json.dumps({'width':512,'height':512,'layers':layers},indent=2)+'\n')
        info = {'source_body_head':str(body_head),'source_body_head_sha256':sha(body_head),
            'full_input':records[key],'head_box':box,'head_input_sha256':sha(folder/'input.png'),
            'coordinate_contract':'full model edge = head edge * (head_box side / 512) + head_box origin; compose with full_input.transform for native projection',
            'model':'24yearsold/seethroughv0.0.2_layerdiff3d_nf4','quantization':'nf4',
            'cpu_offload':True,'steps':20,'seed':42,'resolution':512,
            'elapsed_seconds':time.time()-started,'peak_allocated_gib':torch.cuda.max_memory_allocated()/1024**3,
            'raw_layers':{tag:sha(folder/(tag+'.png')) for tag in TAGS},
            'depth':'not rerun for this separate head-only experiment; original full-body depth retained'}
        (folder/'experiment.json').write_text(json.dumps(info,indent=2)+'\n')
        print(view+' detailed head: '+str(box),flush=True)


if __name__ == '__main__':
    main()
