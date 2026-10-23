"""One independent, genuine SemanticSam call; save all logits before visualization."""
import json
from pathlib import Path
import sys
import time
import numpy as np
from PIL import Image
from evidence_store import CLASSES, write_json
from infer import settings
from inference_recipe import SAM_MODEL, SAM_REVISION
from inference_parameters import parameters


def main(work):
    work = Path(work)
    options = parameters(json.loads((work/'request.json').read_text()))
    tooling,upstream,_ = settings()
    sys.path[:0] = [str(upstream),str(upstream/'common')]
    import torch
    from utils.torch_utils import seed_everything
    seed_everything(options['seed'])
    from accelerate import init_empty_weights
    from modules.semanticsam import SemanticSam
    checkpoint = tooling/'cache/huggingface/hub'/('models--'+SAM_MODEL.replace('/','--'))/'snapshots'/SAM_REVISION/'checkpoint-18000.pt'
    state = torch.load(checkpoint,map_location='cpu',weights_only=True)
    if 'state_dict' in state:
        state = state['state_dict']
    with init_empty_weights(include_buffers=False):
        model = SemanticSam(class_num=19,model_type='h_hq')
    model.load_state_dict(state,strict=True,assign=True)
    del state
    model = model.to(device='cuda',dtype=torch.bfloat16).eval()
    torch.cuda.reset_peak_memory_stats()
    started = time.time()
    with torch.inference_mode():
        logits = model.inference(np.array(Image.open(work/'input.png').convert('RGB')))[0].float().cpu().numpy()
    raw = work/'raw'
    raw.mkdir()
    np.savez_compressed(raw/'logits.npz',logits=logits)
    # Original multi-label fields: no exclusive class choice or alpha clipping.
    for index,name in enumerate(CLASSES):
        alpha = (255/(1+np.exp(-np.clip(logits[index],-50,50)))).astype(np.uint8)
        Image.fromarray(alpha).save(raw/(name+'.png'))
    write_json(work/'result.json',{'stages':{'semantic-sam':{'outcome':'success'}},
        'parameters':options,'runtime':{'torch':torch.__version__,'cuda':torch.version.cuda,
            'device':torch.cuda.get_device_name(),'deterministic_algorithms':torch.are_deterministic_algorithms_enabled()},
        'elapsed_seconds':time.time()-started,'peak_allocated_gib':torch.cuda.max_memory_allocated()/1024**3})


if __name__ == '__main__':
    main(sys.argv[1])
