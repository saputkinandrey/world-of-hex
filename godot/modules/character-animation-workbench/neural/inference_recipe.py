"""Numerical inference contract, independent of storage/analysis implementation."""
from pathlib import Path
from preprocess import sha

LAYER_MODEL = '24yearsold/seethroughv0.0.2_layerdiff3d_nf4'
DEPTH_MODEL = '24yearsold/seethroughv0.0.1_marigold_nf4'
SAM_MODEL = '24yearsold/l2d_sam_iter2'
SAM_REVISION = '0b0608310fb7a89e32ecd7397147a249540cf1e7'


def contract(model, tooling, upstream):
    cache = tooling/'cache/huggingface/hub'
    if model == 'semantic-sam':
        checkpoint = cache/('models--'+SAM_MODEL.replace('/','--'))/'snapshots'/SAM_REVISION/'checkpoint-18000.pt'
        return {'model':SAM_MODEL,'revision':SAM_REVISION,'checkpoint_sha256':sha(checkpoint),
                'local_worker_sha256':sha(Path(__file__).with_name('sam_worker.py')),
                'dtype':'bfloat16','class_num':19,'model_type':'h_hq',
                'implementation':{name:sha(upstream/name) for name in (
                    'common/modules/semanticsam.py','common/modules/extend_sam.py')}}
    models = {name:(cache/('models--'+name.replace('/','--'))/'refs/main').read_text().strip()
              for name in (LAYER_MODEL,DEPTH_MODEL)}
    return {'models':models,'seed':42,'steps':20,'resolution':512,'depth_resolution':512,
            'local_worker_sha256':sha(Path(__file__).with_name('layerdiff_worker.py')),
            'head_support_sha256':sha(Path(__file__).with_name('head_localization.py')),
            'quant_mode':'nf4','cpu_offload':True,'group_offload':False,'tblr_split':True,
            'head_policy':'strongest-alpha128-component-with-explicit-64-192-fallback',
            'implementation':{name:sha(upstream/name) for name in (
                'common/modules/layerdiffuse/diffusers_kdiffusion_sdxl.py',
                'inference/scripts/inference_psd_quantized.py')}}
