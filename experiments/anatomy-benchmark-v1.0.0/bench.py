"""Isolated five-model benchmark. Model workers never read authored masks."""
import argparse
import importlib.metadata
import os
from pathlib import Path
import platform
import subprocess
import sys
import traceback

import numpy as np
from PIL import Image
import psutil

from common import ROOT, REPO, input_image, measured, read, sha, write

MODELS = ['schp', 'bodypix', 'sapiens2', 'seethrough-sam', 'densepose']


def prepare():
    if (ROOT/'protected-before.json').exists():
        raise FileExistsError('Input baseline already exists; do not overwrite provenance')
    config = read(ROOT/'config.json')
    output = ROOT/'input'
    output.mkdir(exist_ok=True)
    before = {}
    frames = {}
    for view, relative in config['sources'].items():
        path = REPO/relative
        before[relative] = sha(path)
        with Image.open(path) as source:
            if source.height not in [110,150] or source.width % source.height:
                raise ValueError(f'Unexpected source atlas size: {path}: {source.size}')
            side = source.height
            raw_frame = source.convert('RGBA').crop((0,0,side,side))
            raw_frame.save(output/(view+'-source-frame.png'))
            offset = (150-side)//2
            frame = Image.new('RGBA',(150,150))
            frame.paste(raw_frame,(offset,offset))
            frames[view] = {'atlas_size': list(source.size), 'crop_xyxy': [0,0,side,side], 'source_frame_size': [side,side],
                            'benchmark_canvas_size': [150,150], 'source_to_canvas_offset_xy': [offset,offset], 'source_pixels_resampled': False}
        frame.save(output/(view+'.png'))
        write(output/'frames.json',frames)
        for method in ['nearest', 'bicubic']:
            image, _, transform = input_image(view, method)
            image.save(output/(view+'-'+method+'.png'))
            write(output/(view+'-'+method+'.json'), {'source': relative, 'source_sha256': before[relative], 'transform': transform})
    write(output/'frames.json',frames)
    protected = ['godot/modules/character-animation-workbench/masks/authored-segmentation.json']
    protected += [str(p.relative_to(REPO)).replace('\\', '/') for p in (REPO/'.agents/skills/hex-anatomical-segmentation').rglob('*') if p.is_file() and '__pycache__' not in p.parts]
    for path in protected:
        before[path] = sha(REPO/path)
    write(ROOT/'protected-before.json', before)
    tooling = Path(config['tooling'])/'see-through-windows/see-through'
    write(ROOT/'existing-stack-before.json', {str(tooling/p): sha(tooling/p) for p in
          ['common/modules/semanticsam.py', 'common/modules/extend_sam.py', 'inference/scripts/infer_sam.py']})
    write(ROOT/'environment-cpu.json', {'python': sys.version, 'platform': platform.platform(),
          'ram': psutil.virtual_memory()._asdict(), 'packages': {n: importlib.metadata.version(n) for n in ['numpy','pillow','onnxruntime','psutil']},
          'nvidia_smi': subprocess.run(['nvidia-smi'], capture_output=True, text=True).stdout,
          'git_status_before': subprocess.run(['git','status','--short','--ignore-submodules'], cwd=REPO, capture_output=True, text=True, encoding='utf-8').stdout})


def download():
    from huggingface_hub import snapshot_download
    config = read(ROOT/'config.json')
    receipts = read(ROOT/'checkpoints.json') if (ROOT/'checkpoints.json').exists() else {}
    for key in ['schp', 'sapiens2']:
        spec = config[key]
        patterns = ['onnx/schp-pascal-7-int8-static.onnx', 'README.md', '*config.json', 'image_processing_schp.py'] if key == 'schp' else ['model.safetensors','config.json','preprocessor_config.json','README.md']
        target = Path(config['model_root'])/key/spec['revision']
        folder = snapshot_download(spec['repo'], revision=spec['revision'], local_dir=target, allow_patterns=patterns, max_workers=2)
        receipts[key] = dict(spec, path=folder, files={str(p.relative_to(target)): {'sha256': sha(p), 'bytes': p.stat().st_size} for p in target.rglob('*') if p.is_file() and '.cache' not in p.parts})
        write(ROOT/'checkpoints.json', receipts)
        print('Downloaded '+key, flush=True)


def run_model(key):
    from outputs import save_outputs, primary_aliases
    from adapters import load_model
    folder = ROOT/key
    folder.mkdir(exist_ok=True)
    if (folder/'metadata.json').exists():
        raise FileExistsError('Model output already exists; preserve the existing benchmark run')
    metadata = {'model': key, 'status': 'INFERENCE_FAILED', 'install_status': 'SUCCESS', 'runs': [],
                'python': sys.version, 'batch_size': 1}
    try:
        model, detail, cuda = load_model(key)
        metadata.update(detail)
        # Main SW succeeds before any other source direction is processed.
        for view in read(ROOT/'config.json')['sources']:
            for method in ['nearest', 'bicubic']:
                size = (768, 1024) if key == 'sapiens2' else (512, 512)
                image, original, transform = input_image(view, method, size)
                destination = folder/(view+'-'+method)
                destination.mkdir(exist_ok=False)
                image.save(destination/'input.png')
                if not metadata['runs']:
                    _, warmup = measured(lambda: model(image), cuda)
                    metadata['warmup'] = warmup
                result, metrics = measured(lambda: model(image), cuda)
                if 'worker_metrics' in result:
                    worker = result['worker_metrics']
                    metrics['worker_process_wall_seconds'] = metrics['seconds']
                    metrics['seconds'] = worker['inference_seconds']
                    metrics['ram_sampled_peak_bytes'] = None
                    metrics['ram_lifetime_peak_bytes'] = worker['ram_lifetime_peak_bytes']
                    metrics['ram_rss_after_request_bytes'] = worker['ram_rss_bytes']
                    metrics['node_worker'] = worker
                save_outputs(destination, result, original, transform, metrics, detail)
                if not metadata['runs']:
                    # Primary SW/nearest aliases expose the requested model-root layout.
                    primary_aliases(folder)
                metadata['runs'].append({'view': view, 'resampling': method, 'path': destination.name, 'metrics': metrics})
                write(folder/'progress.json', metadata)
                print(key+' '+destination.name+' SUCCESS', flush=True)
        metadata['status'] = 'SUCCESS'
    except Exception as error:
        metadata.update(error_type=type(error).__name__, error=str(error), traceback=traceback.format_exc())
        print(metadata['traceback'], file=sys.stderr)
    write(folder/'metadata.json', metadata)
    return 0 if metadata['status']=='SUCCESS' else 1


def verify():
    checks = {}
    for name in ['protected-before.json', 'existing-stack-before.json']:
        checks[name] = all(sha(REPO/path if not Path(path).is_absolute() else path)==expected for path, expected in read(ROOT/name).items())
    if not all(checks.values()):
        raise AssertionError('Protected source or existing stack changed')
    for key in MODELS:
        status = read(ROOT/key/'metadata.json')
        if status['status'] == 'SUCCESS':
            if len(status['runs'])!=8:
                raise AssertionError('Successful model must contain all 4 views x 2 resize methods')
            for run in status['runs']:
                path = ROOT/key/run['path']
                labels = np.load(path/'class-map-native.npy', allow_pickle=False)
                if labels.shape[-2:] != (150,150):
                    raise AssertionError(f'Wrong native shape: {path}: {labels.shape}')
                for name in ['class-map-native.png', 'class-map-preview.png', 'overlay-original.png', 'labels.json', 'metadata.json']:
                    if not (path/name).exists():
                        raise AssertionError('Missing artifact: '+str(path/name))
                spec = read(path/'labels.json')
                details = read(path/'metadata.json')
                original = Image.open(ROOT/'input'/(run['view']+'.png'))
                alpha = np.array(original.getchannel('A'))>0
                if labels.ndim==3:
                    for channel in range(len(labels)):
                        if not np.isin(labels[channel],[-1,channel]).all():
                            raise AssertionError('Multi-label channel lost native class IDs')
                    foreground = np.any(labels>=0,axis=0)
                else:
                    if not np.isin(labels,[int(k) for k in spec['native_labels']]+[spec['background_id']]).all():
                        raise AssertionError('Unknown native class ID')
                    foreground = labels!=spec['background_id']
                if int((foreground & ~alpha).sum()) != details['predicted_pixels_outside_source_alpha']:
                    raise AssertionError('Outside-alpha metric mismatch')
                raw_map = np.load(path/'raw/class-map-model-grid.npy',allow_pickle=False)
                sampling = details['transform']['inverse_sampling_model_grid']
                yy,xx = np.array(sampling['y']),np.array(sampling['x'])
                for indices,length in [(yy,raw_map.shape[-2]),(xx,raw_map.shape[-1])]:
                    target = (np.arange(150)+0.5)*length/150
                    if not np.all(np.abs(indices+0.5-target)<=0.500000001):
                        raise AssertionError('Projection is not nearest to the target pixel centers')
                expected_projection = raw_map[...,yy[:,None],xx[None,:]]
                if not np.array_equal(labels,expected_projection):
                    raise AssertionError('Native projection mismatch')
                for index,name in spec['native_labels'].items():
                    index = int(index)
                    if index==spec['background_id']: continue
                    mask = np.array(Image.open(path/'masks'/(name+'.png')))
                    expected = labels[index]==index if labels.ndim==3 else labels==index
                    if not np.array_equal(mask,expected.astype(np.uint8)*255):
                        raise AssertionError('Mask membership differs from native prediction')
                for raw in (path/'raw').glob('*.npz'):
                    with np.load(raw,allow_pickle=False) as archive:
                        array = archive['values']
                        if not np.isfinite(array).all():
                            raise AssertionError('Nonfinite raw model output: '+str(raw))
                        if raw.stem=='probabilities' and not np.allclose(array.sum(axis=0,dtype=np.float32),1,atol=0.001):
                            raise AssertionError('Class probabilities not normalized')
            checks[key] = {'requests':len(status['runs']),'native_ids_valid':True,'projections_exact':True,
                           'masks_match_native':True,'raw_outputs_finite':True,'alpha_metric_verified':True}
    checks['all_five_have_terminal_status'] = all(read(ROOT/key/'metadata.json')['status'] in ['SUCCESS','INFERENCE_FAILED','INSTALL_FAILED','INCOMPATIBLE','BLOCKED'] for key in MODELS)
    checks['git_status_after'] = subprocess.run(['git','status','--short','--ignore-submodules'], cwd=REPO, capture_output=True, text=True, encoding='utf-8').stdout
    write(ROOT/'verification.json', checks)
    print('Protected files and successful output artifacts verified.')


def main():
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument('action', choices=['prepare','download','compare','verify']+MODELS)
    args = parser.parse_args()
    if args.action == 'prepare': prepare()
    elif args.action == 'download': download()
    elif args.action == 'verify': verify()
    elif args.action == 'compare':
        from compare import compare
        compare()
    else: return run_model(args.action)
    return 0


if __name__ == '__main__':
    sys.exit(main())
