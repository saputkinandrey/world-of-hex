"""Independent upstream SemanticSam evaluation; no Legacy inputs."""
import argparse
import json
import os
from pathlib import Path
import sys
import time

from infer import settings
from preprocess import OUTPUT, SOURCES, sha

MODEL = '24yearsold/l2d_sam_iter2'
REVISION = '0b06083'
CLASSES = ['hair','headwear','face','eyes','eyewear','ears','earwear','nose','mouth',
           'neck','neckwear','topwear','handwear','bottomwear','legwear','footwear',
           'tail','wings','objects']


def main(action):
    tooling,upstream,_ = settings()
    os.environ['HF_HOME'] = str(tooling/'cache/huggingface')
    os.environ['HF_HUB_DOWNLOAD_TIMEOUT'] = '120'
    sys.path[:0] = [str(upstream),str(upstream/'common')]
    from huggingface_hub import hf_hub_download
    checkpoint = hf_hub_download(MODEL,'checkpoint-18000.pt',revision=REVISION)
    folder = OUTPUT/'sam'
    folder.mkdir(parents=True,exist_ok=True)
    provenance = {'model':MODEL,'revision':Path(checkpoint).parent.name,'checkpoint_sha256':sha(checkpoint),
                  'classes':CLASSES,'implementation':'upstream modules.semanticsam.SemanticSam',
                  'model_type':'h_hq','class_num':19}
    (folder/'model.json').write_text(json.dumps(provenance,indent=2)+'\n')
    if action == 'download':
        print('SemanticSam checkpoint cached: '+checkpoint,flush=True)
        return
    pending = []
    records = json.loads((OUTPUT/'inputs.json').read_text())
    for view in SOURCES:
        saved = folder/view/'experiment.json'
        if saved.exists():
            previous = json.loads(saved.read_text())
            if previous['input_sha256'] != records[view+'-crop-nearest-512']['input_sha256']:
                raise ValueError('Input changed for existing SemanticSam experiment: '+view)
            if sha(folder/view/'logits.npz') != previous['logits_sha256']:
                raise ValueError('SemanticSam logits changed: '+view)
        else:
            pending.append(view)
    if not pending:
        print('Reusing four completed SemanticSam experiments.',flush=True)
        return
    import numpy as np
    from PIL import Image
    import torch
    from accelerate import init_empty_weights
    from modules.semanticsam import SemanticSam
    state = torch.load(checkpoint,map_location='cpu',weights_only=True)
    if 'state_dict' in state:
        state = state['state_dict']
    with init_empty_weights(include_buffers=False):
        model = SemanticSam(class_num=19,model_type='h_hq')
    model.load_state_dict(state,strict=True,assign=True)
    del state
    model = model.to(device='cuda',dtype=torch.bfloat16).eval()
    for view in pending:
        key = view+'-crop-nearest-512'
        image = np.array(Image.open(records[key]['input']).convert('RGB'))
        started = time.time()
        torch.cuda.reset_peak_memory_stats()
        with torch.inference_mode():
            logits = model.inference(image)[0].float().cpu().numpy()
        if logits.shape != (19,512,512) or not np.isfinite(logits).all():
            raise ValueError('Unexpected SemanticSam logits: '+repr(logits.shape))
        target = folder/view
        target.mkdir(exist_ok=True)
        np.savez_compressed(target/'logits.npz',logits=logits)
        for index,name in enumerate(CLASSES):
            alpha = (255/(1+np.exp(-np.clip(logits[index],-50,50)))).astype(np.uint8)
            Image.fromarray(alpha).save(target/(name+'.png'))
        info = {**provenance,**records[key],'elapsed_seconds':time.time()-started,
                'peak_allocated_gib':torch.cuda.max_memory_allocated()/1024**3,
                'logits_shape':list(logits.shape),'dtype':'bfloat16',
                'logits_sha256':sha(target/'logits.npz'),
                'positive_pixels':dict(zip(CLASSES,(logits>0).sum(axis=(1,2)).tolist()))}
        (target/'experiment.json').write_text(json.dumps(info,indent=2)+'\n')
        print(view+': '+json.dumps(info['positive_pixels']),flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action',choices=['download','infer'])
    main(parser.parse_args().action)
