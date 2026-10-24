"""Experimental LayerDiff postprocessing; CPU-only NumPy/Pillow, exact integers."""
import argparse
from collections import deque
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import textwrap

import numpy as np
import PIL
from PIL import Image, ImageDraw

VERSION = '1.1.0'
ALPHA_THRESHOLD = 128
ITERATIONS = 4
THRESHOLD_DENOMINATOR = 20
LAYERS = ('front hair', 'back hair', 'head', 'neck', 'neckwear', 'topwear',
          'handwear', 'bottomwear', 'legwear', 'footwear', 'tail', 'wings', 'objects')
REPO = Path(__file__).resolve().parents[4]
PREPROCESS = REPO / 'godot/modules/character-animation-workbench/neural/preprocess.py'


class SeedConflict(ValueError):
    def __init__(self, conflicts):
        super().__init__('Repeated seeds have different RGBA results; see conflicts.json')
        self.conflicts = conflicts


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def projection_function():
    spec = importlib.util.spec_from_file_location('hex_saved_coordinate_projection', PREPROCESS)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.project


def validate_transform(transform, source_size):
    if tuple(transform['native_size']) != source_size:
        raise ValueError('Native transform dimensions differ from source.png')
    for key in ('scale', 'offset', 'input_size'):
        if len(transform[key]) != 2 or not all(np.isfinite(value) for value in transform[key]):
            raise ValueError('Invalid transform field: ' + key)
    if any(value <= 0 for value in transform['scale'] + transform['input_size']):
        raise ValueError('Transform scale and input dimensions must be positive')


def read_rgba(path, expected_size):
    with Image.open(path) as image:
        if image.mode != 'RGBA' or image.size != expected_size:
            raise ValueError(f'Expected original RGBA {expected_size}: {path}, got {image.mode} {image.size}')
        return np.array(image)


def load_observations(experiment, selected):
    source_path = experiment / 'input/source.png'
    with Image.open(source_path) as image:
        if image.mode != 'RGBA':
            raise ValueError('source.png must be the original color RGBA image')
        source = image.copy()
    plan_path = experiment / 'plan.json'
    plan = read_json(plan_path)
    transform = plan['input']['transform']
    validate_transform(transform, source.size)
    project = projection_function()
    files = {str(path.resolve()): sha(path) for path in (source_path, plan_path, PREPROCESS)}
    if files[str(source_path.resolve())] != plan['input']['source_frame_sha256']:
        raise ValueError('source.png checksum differs from the recorded original frame')
    runs = sorted(path for path in experiment.glob('run-*') if path.is_dir())
    if not runs:
        raise ValueError('No saved run-* directories')
    observations, duplicates, conflicts = {}, [], []
    shape = (source.height, source.width)
    hitmaps = {layer: np.zeros(shape, dtype=object) for layer in selected}
    for run in runs:
        request_path, manifest_path = (run / 'layerdiff' / name for name in ('request.json', 'manifest.json'))
        request, manifest = read_json(request_path), read_json(manifest_path)
        for path in (request_path, manifest_path):
            files[str(path.resolve())] = sha(path)
        seed = request['parameters']['seed']
        if type(seed) is not int:
            raise ValueError('Seed must be an integer: ' + str(request_path))
        if request['input']['transform'] != transform:
            raise ValueError('Run uses a different coordinate transform: ' + run.name)
        if manifest['parameters']['seed'] != seed or manifest['stages']['body'] != 'success':
            raise ValueError('Run manifest seed/body status is inconsistent: ' + run.name)
        signatures, masks = {}, {}
        # Compare all semantic RGBA outputs, not only the chosen alpha channels.
        for layer in LAYERS:
            path = run / 'layerdiff/raw/layers' / (layer + '.png')
            before = sha(path)
            rgba = read_rgba(path, tuple(transform['input_size']))
            if sha(path) != before:
                raise ValueError('Input changed while being read: ' + str(path))
            files[str(path.resolve())] = before
            signatures[layer] = hashlib.sha256(rgba.tobytes()).hexdigest()
            if layer in hitmaps:
                masks[layer] = project(rgba[:, :, 3] > ALPHA_THRESHOLD, transform)
        if seed in observations:
            first = observations[seed]
            different = [layer for layer in LAYERS if first['rgba_sha256'][layer] != signatures[layer]]
            comparison = {'seed': seed, 'first_run': first['run'], 'duplicate_run': run.name,
                          'different_layers': different}
            if different:
                conflicts.append(comparison)
            else:
                duplicates.append(comparison)
            continue
        observations[seed] = {'run': run.name, 'rgba_sha256': signatures}
        for layer, mask in masks.items():
            hitmaps[layer] += mask.astype(object)
    if conflicts:
        raise SeedConflict(conflicts)
    provenance = {'experiment_path': str(experiment), 'source_image': str(source_path),
                  'transform': transform, 'unique_seeds': list(observations),
                  'observations': [{'seed': seed, **record} for seed, record in observations.items()],
                  'identical_duplicate_seeds': duplicates, 'input_checksums_sha256': files,
                  'projection_implementation': str(PREPROCESS)}
    return source, hitmaps, provenance


def rank_layers(hitmaps):
    return sorted(hitmaps, key=lambda name: (-int(hitmaps[name].sum()), name))


def recurrence(hitmaps):
    values = [values.astype(object) for values in hitmaps.values()]
    s = np.zeros(values[0].shape, dtype=object)
    p = np.zeros(values[0].shape, dtype=object)
    for index, value in enumerate(values):
        for previous in values[:index]:
            p += previous * value
        s += value
    maps = {'s1': s, 'p1': p}
    for iteration in range(2, ITERATIONS + 1):
        s, p = s + p, s * p
        maps.update({f's{iteration}': s, f'p{iteration}': p})
    return maps


def threshold(s4):
    maximum = int(s4.max())
    return np.asarray(s4 * THRESHOLD_DENOMINATOR >= maximum, dtype=bool) if maximum else np.zeros(s4.shape, dtype=bool)


def component_areas(mask):
    """Four-connected components, matching the reference; diagnostics only."""
    unseen = mask.copy()
    areas = []
    for y, x in zip(*np.where(mask)):
        if not unseen[y, x]:
            continue
        queue = deque([(int(y), int(x))])
        unseen[y, x] = False
        area = 0
        while queue:
            cy, cx = queue.popleft()
            area += 1
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and unseen[ny, nx]:
                    unseen[ny, nx] = False
                    queue.append((ny, nx))
        areas.append(area)
    return sorted(areas, reverse=True)


def palette(levels):
    values = levels.astype(np.int32)
    return np.stack([np.clip(values * 3 - shift, 0, 255) for shift in (0, 255, 510)], axis=-1).astype(np.uint8)


def heatmap(path, name, values):
    maximum = int(values.max())
    levels = np.array([[int(value) * 255 // maximum if maximum else 0 for value in row] for row in values], dtype=np.uint8)
    pixels = Image.fromarray(palette(levels)).resize((values.shape[1] * 2, values.shape[0] * 2), Image.Resampling.NEAREST)
    caption = [name, 'Linear normalization: value / this map maximum', *textwrap.wrap('Maximum = ' + str(maximum), 65),
               'Black = 0; white = maximum (all black if zero).']
    canvas = Image.new('RGB', (max(420, pixels.width), pixels.height + 18 * len(caption) + 22), (24, 27, 33))
    canvas.paste(pixels, (0, 0))
    draw = ImageDraw.Draw(canvas)
    for index, line in enumerate(caption):
        draw.text((4, pixels.height + 4 + 18 * index), line, fill='white')
    ramp = palette(np.arange(256, dtype=np.uint8)[None, :])
    canvas.paste(Image.fromarray(ramp).resize((256, 10), Image.Resampling.NEAREST), (4, canvas.height - 12))
    canvas.save(path)


def render_masks(output, source, mask):
    binary = mask.astype(np.uint8) * 255
    Image.fromarray(binary).save(output / 'mask.png')
    rgba = np.zeros((*mask.shape, 4), dtype=np.uint8)
    rgba[mask] = (255, 255, 255, 255)
    Image.fromarray(rgba).save(output / 'mask-rgba.png')
    tint = np.zeros_like(rgba)
    tint[mask] = (0, 210, 255, 96)
    overlay = Image.alpha_composite(source, Image.fromarray(tint))
    padded = np.pad(mask, 1)
    interior = mask & padded[:-2, 1:-1] & padded[2:, 1:-1] & padded[1:-1, :-2] & padded[1:-1, 2:]
    # The outline is visualization only; the binary result is never changed.
    outlined = np.array(overlay)
    outlined[mask & ~interior] = (255, 45, 140, 255)
    overlay = Image.fromarray(outlined)
    overlay.save(output / 'overlay.png')
    overlay.resize((source.width * 6, source.height * 6), Image.Resampling.NEAREST).save(output / 'overlay-preview.png')


def decimal_grid(values):
    return [[str(int(value)) for value in row] for row in values]


def save_numeric(output, hitmaps, maps, mask):
    numbers = {'algorithm_version': VERSION, 'integer_encoding': 'base-10 decimal strings; arbitrary precision',
               'axis_order': 'rows=y, columns=x',
               'input_hitmaps': {name: decimal_grid(values) for name, values in hitmaps.items()},
               'recurrence': {name: decimal_grid(values) for name, values in maps.items()},
               'mask': mask.astype(np.uint8).tolist()}
    payload = json.dumps(numbers, separators=(',', ':')).encode('utf-8')
    with (output / 'numeric.json.gz').open('wb') as stream:
        with gzip.GzipFile(filename='', mode='wb', fileobj=stream, mtime=0) as compressed:
            compressed.write(payload)


def save_result(output, source, hitmaps, provenance):
    output.mkdir(parents=True, exist_ok=False)
    ranking = rank_layers(hitmaps)
    maps = recurrence(hitmaps)
    mask = threshold(maps['s4'])
    areas = component_areas(mask)
    initialization = ('single_layer_baseline' if len(hitmaps) == 1 else
                      'two_layer_original' if len(hitmaps) == 2 else 'experimental_pairwise_products')
    metadata = {**provenance, 'algorithm_version': VERSION, 'status': 'experimental',
                'selected_layers': list(hitmaps), 'alpha_threshold': ALPHA_THRESHOLD,
                'alpha_comparison': 'alpha > 128', 'iteration_count': ITERATIONS,
                'multi_layer_initialization': initialization,
                'layer_intensity_ranking': [{'layer': name, 'intensity': int(hitmaps[name].sum())} for name in ranking],
                'input_weighting': 'none',
                'final_threshold': {'fraction': '1/20', 'comparison': '20 * S4 >= S4.max()', 'zero_map': 'empty'},
                'max_s4': str(int(maps['s4'].max())), 'output_area_pixels': int(mask.sum()),
                'connected_components': {'connectivity': 4, 'count': len(areas), 'areas_pixels': areas},
                'numeric_arithmetic': 'Python arbitrary-precision integers in NumPy object arrays',
                'visualization_normalization': 'linear value / each map own maximum; numeric values remain unchanged',
                'versions': {'python': sys.version.split()[0], 'numpy': np.__version__, 'pillow': PIL.__version__}}
    render_masks(output, source, mask)
    heatmaps = output / 'heatmaps'
    heatmaps.mkdir()
    for name, values in hitmaps.items():
        heatmap(heatmaps / ('input-' + name.replace(' ', '-') + '.png'), name + ' raw seed hits', values)
    for name, values in maps.items():
        heatmap(heatmaps / (name + '.png'), name.upper(), values)
    save_numeric(output, hitmaps, maps, mask)
    metadata['output_checksums_sha256'] = {path.relative_to(output).as_posix(): sha(path)
                                          for path in sorted(output.rglob('*')) if path.is_file()}
    write_json(output / 'metadata.json', metadata)
    return metadata


def verify_reference(output, hitmaps, provenance, primary):
    checks = {'unique_seed_count': (len(provenance['unique_seeds']), 9),
              'head_intensity': (int(hitmaps['head'].sum()), 4912),
              'back_hair_intensity': (int(hitmaps['back hair'].sum()), 18617),
              'input_weighting': (primary['input_weighting'], 'none'),
              'max_s4': (int(primary['max_s4']), 56769),
              'unweighted_head_area': (primary['output_area_pixels'], 791),
              'component_areas': (primary['connected_components']['areas_pixels'], [790, 1])}
    report = {'outcome': 'passed' if all(actual == expected for actual, expected in checks.values()) else 'failed',
              'purpose': 'unweighted head regression reference',
              'checks': {name: {'actual': actual, 'expected': expected, 'passed': actual == expected}
                         for name, (actual, expected) in checks.items()}}
    write_json(output / 'verification.json', report)
    if report['outcome'] != 'passed':
        raise ValueError('Head reference mismatch; inspect verification.json without parameter tuning')


def main():
    parser = argparse.ArgumentParser(description=__doc__, epilog='Writes masks, original-color overlay, labeled heatmaps, exact numeric.json.gz and metadata.json. Requires NumPy and Pillow only.')
    parser.add_argument('--experiment', required=True, type=Path)
    parser.add_argument('--layers', required=True, nargs='+', choices=LAYERS)
    parser.add_argument('--output', required=True, type=Path, help='New directory outside the historical experiment')
    parser.add_argument('--verify-head-reference', action='store_true', help='Check the unweighted sw-head-consistency-02 head reference (791 pixels)')
    args = parser.parse_args()
    experiment, output = args.experiment.resolve(), args.output.resolve()
    if len(args.layers) != len(set(args.layers)):
        parser.error('Layer names must be unique')
    if output.is_relative_to(experiment) or experiment.is_relative_to(output):
        parser.error('Output must be outside the historical experiment and cannot contain it')
    if output.exists():
        parser.error('Output directory already exists; choose a new one')
    if args.verify_head_reference and set(args.layers) != {'head', 'back hair'}:
        parser.error('Head reference requires exactly head and back hair')
    try:
        source, hitmaps, provenance = load_observations(experiment, args.layers)
    except SeedConflict as exc:
        output.mkdir(parents=True, exist_ok=False)
        write_json(output / 'conflicts.json', {'outcome': 'input_conflict', 'conflicts': exc.conflicts})
        raise
    metadata = save_result(output, source, hitmaps, provenance)
    changed = [path for path, checksum in provenance['input_checksums_sha256'].items() if sha(path) != checksum]
    write_json(output / 'integrity.json', {'outcome': 'passed' if not changed else 'failed',
                                          'checked_files': len(provenance['input_checksums_sha256']), 'changed_files': changed})
    if changed:
        raise ValueError('Inputs changed during execution: ' + repr(changed))
    if args.verify_head_reference:
        verify_reference(output, hitmaps, provenance, metadata)
    print(json.dumps({'output': str(output), 'unique_seeds': len(provenance['unique_seeds']),
                      'layers': args.layers, 'input_weighting': metadata['input_weighting'],
                      'layer_intensity_ranking': metadata['layer_intensity_ranking'],
                      'initialization': metadata['multi_layer_initialization'],
                      'alpha_threshold': ALPHA_THRESHOLD, 'iterations': ITERATIONS,
                      'final_map': 'S4', 'threshold_fraction': '1/20',
                      'mask_area': metadata['output_area_pixels'],
                      'component_areas': metadata['connected_components']['areas_pixels'],
                      'artifacts': ['mask.png', 'mask-rgba.png', 'overlay.png', 'overlay-preview.png',
                                    'metadata.json', 'numeric.json.gz', 'integrity.json']}, ensure_ascii=True))


if __name__ == '__main__':
    main()
