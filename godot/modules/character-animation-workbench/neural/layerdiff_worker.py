"""Instrument the genuine upstream stages, retaining raw outputs before interpretation."""
import json
from pathlib import Path
import sys
import time
import traceback
import shutil
from types import SimpleNamespace

from evidence_store import BODY_TAGS, write_json
from head_localization import MissingNeuralHead, head_support
from infer import settings
from inference_recipe import LAYER_MODEL, DEPTH_MODEL


def patched_source(source):
    old = '    hx0, hy0, hw, hh = cv2.boundingRect(cv2.findNonZero((head_img[..., -1] > 15).astype(np.uint8)))'
    new = '''    try:
        support = _hex_head_support(head_img[..., -1], osp.join(saved, 'head-localization.json'))
    except _hex_missing_head as error:
        _hex_write_json(_hex_path(saved)/'head-stage.json', {'outcome':'poor_recognition','reason':str(error)})
        return
    hx0, hy0, hw, hh = cv2.boundingRect(cv2.findNonZero(support))'''
    seam = '    for rst, tag in zip(pipeline_output.images, head_tag_list):'
    raw = '''    os.makedirs(osp.join(saved, 'raw-head'), exist_ok=True)
    for rst, tag in zip(pipeline_output.images, head_tag_list):
        Image.fromarray(rst).save(osp.join(saved, 'raw-head', tag + '.png'))
'''
    if source.count(old) != 1 or source.count(seam) != 1:
        raise ValueError('Pinned upstream body/head instrumentation seam changed')
    return source.replace(old,new).replace(seam,raw+seam).split("if __name__ == '__main__':")[0]


def main(work):
    work = Path(work)
    record = json.loads((work/'request.json').read_text())
    _,upstream,_ = settings()
    entry = upstream/'inference/scripts/inference_psd_quantized.py'
    sys.path.insert(0,str(entry.parent))
    namespace = {'__name__':'hex_upstream','__file__':str(entry),
                 '_hex_head_support':head_support,'_hex_missing_head':MissingNeuralHead,
                 '_hex_write_json':write_json,'_hex_path':Path}
    exec(compile(patched_source(entry.read_text()),str(entry),'exec'),namespace)
    import torch
    args = SimpleNamespace(quant_mode='nf4',cpu_offload=True,group_offload=False,
        repo_id_layerdiff=LAYER_MODEL,repo_id_depth=DEPTH_MODEL)
    raw = work/'raw'
    raw.mkdir()
    source = work/'input.png'
    # Upstream names its layer directory from the input stem.
    stages = {}
    started = time.time()
    torch.cuda.reset_peak_memory_stats()
    namespace['seed_everything'](42)
    pipeline = namespace['build_layerdiff_pipeline'](args)
    try:
        namespace['run_layerdiff'](pipeline,str(source),str(raw),42,20,512)
        stages['layerdiff'] = {'outcome':'success'}
    except Exception:
        stages['layerdiff'] = {'outcome':'inference_failure','traceback':traceback.format_exc()}
        traceback.print_exc()
    finally:
        del pipeline
        torch.cuda.empty_cache()
    layers = raw/'input'
    # Publish the direct output directory before independent depth/export work;
    # a later native process crash must not hide completed body predictions.
    if layers.exists():
        layers.rename(raw/'layers')
    layers = raw/'layers'
    complete = all((layers/(tag+'.png')).exists() for tag in BODY_TAGS)
    stages['body'] = {'outcome':'success' if complete else 'inference_failure'}
    head_note = layers/'head-stage.json'
    stages['head'] = json.loads(head_note.read_text()) if head_note.exists() else {
        'outcome':'success' if (layers/'raw-head').is_dir() else 'inference_failure'}
    if complete:
        # Head failure/absence must not prevent independent depth/export attempts.
        depth = None
        try:
            depth = namespace['build_marigold_pipeline'](args)
            # The upstream depth helper derives its directory from the input stem.
            depth_source = work/'layers.png'
            shutil.copy2(source,depth_source)
            try:
                namespace['run_marigold'](depth,str(depth_source),str(raw),42,512)
            finally:
                depth_source.unlink()
            stages['depth'] = {'outcome':'success'}
        except Exception:
            stages['depth'] = {'outcome':'inference_failure','traceback':traceback.format_exc()}
            traceback.print_exc()
        finally:
            del depth
            torch.cuda.empty_cache()
        try:
            namespace['further_extr'](str(layers),rotate=False,save_to_psd=True,tblr_split=True)
            stages['export'] = {'outcome':'success'}
        except Exception:
            stages['export'] = {'outcome':'assembly_failure','traceback':traceback.format_exc()}
            traceback.print_exc()
    write_json(work/'result.json',{'stages':stages,'body_complete':complete,
        'elapsed_seconds':time.time()-started,
        'peak_allocated_gib':torch.cuda.max_memory_allocated()/1024**3})
    if not complete:
        raise RuntimeError('LayerDiff did not produce all thirteen raw body predictions')


if __name__ == '__main__':
    main(sys.argv[1])
