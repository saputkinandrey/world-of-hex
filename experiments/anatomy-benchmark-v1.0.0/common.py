"""Benchmark-only I/O, input transforms and phase measurements."""
import hashlib
import json
from pathlib import Path
import threading
import time

import numpy as np
from PIL import Image
import psutil

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
METHODS = {'nearest': Image.Resampling.NEAREST, 'bicubic': Image.Resampling.BICUBIC}


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf-8')


def sha(path):
    result = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(8*1024**2), b''):
            result.update(block)
    return result.hexdigest()


def input_image(view, method, size=(512, 512)):
    source = Image.open(ROOT / 'input' / (view + '.png')).convert('RGBA')
    rgb = Image.new('RGBA', source.size, tuple(read(ROOT/'config.json')['background_rgb'])+(255,))
    rgb.alpha_composite(source)
    result = rgb.convert('RGB').resize(size, METHODS[method])
    frames_path = ROOT/'input/frames.json'
    frame = read(frames_path)[view] if frames_path.exists() else None
    transform = {'original_size': list(source.size), 'source_frame': frame,
                 'input_size': list(size), 'scale_xy': [size[0]/150, size[1]/150], 'offset_xy': [0, 0],
                 'resampling': method, 'background_rgb': [127, 127, 127],
                 'mapping': 'pixel centers: input=(original+0.5)*scale-0.5; inverse labels use nearest neighbor',
                 'aspect': 'square canvas; model-specific anisotropic resize only when size is non-square'}
    return result, source, transform


def measured(call, cuda=False):
    process = psutil.Process()
    peak = [process.memory_info().rss]
    stop = threading.Event()

    def sample():
        while not stop.wait(0.01):
            peak[0] = max(peak[0], process.memory_info().rss)

    if cuda:
        import torch
        torch.cuda.synchronize()
        torch.cuda.reset_peak_memory_stats()
    thread = threading.Thread(target=sample, daemon=True)
    thread.start()
    start = time.perf_counter()
    try:
        result = call()
        if cuda:
            torch.cuda.synchronize()
        elapsed = time.perf_counter()-start
    finally:
        stop.set()
        thread.join()
    memory = process.memory_info()
    return result, {'seconds': elapsed, 'ram_sampled_peak_bytes': max(peak[0], memory.rss),
                    'ram_lifetime_peak_bytes': getattr(memory, 'peak_wset', None), 'ram_sampling_seconds': 0.01,
                    'cuda_peak_allocated_bytes': torch.cuda.max_memory_allocated() if cuda else None,
                    'cuda_peak_reserved_bytes': torch.cuda.max_memory_reserved() if cuda else None}
