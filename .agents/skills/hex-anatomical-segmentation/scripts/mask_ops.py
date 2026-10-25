"""Exact binary set operations on saved mask results in native source coordinates."""
import argparse
import gzip
import json
from pathlib import Path

import numpy as np
from PIL import Image

from segment import component_areas, read_json, render_masks, sha, write_json

VERSION = '1.0.0'
OPERATIONS = ('union', 'intersection', 'difference', 'symmetric-difference')


def apply_operation(operation, left, right):
    if left.dtype != np.bool_ or right.dtype != np.bool_ or left.ndim != 2 or left.shape != right.shape:
        raise ValueError('Set operands must be boolean masks on identical two-dimensional grids')
    if operation == 'union':
        return left | right
    if operation == 'intersection':
        return left & right
    if operation == 'difference':
        return left & ~right
    if operation == 'symmetric-difference':
        return left ^ right
    raise ValueError('Unsupported mask operation: ' + operation)


def load_result(directory):
    directory = directory.resolve()
    metadata_path, mask_path = directory / 'metadata.json', directory / 'mask.png'
    metadata_checksum = sha(metadata_path)
    metadata = read_json(metadata_path)
    source_path = Path(metadata['source_image']).resolve()
    mask_checksum, source_checksum = sha(mask_path), sha(source_path)
    if metadata['output_checksums_sha256']['mask.png'] != mask_checksum:
        raise ValueError('Saved mask checksum changed: ' + str(mask_path))
    if metadata['input_checksums_sha256'][str(source_path)] != source_checksum:
        raise ValueError('Original source checksum changed: ' + str(source_path))
    with Image.open(source_path) as image:
        if image.mode != 'RGBA':
            raise ValueError('Expected original color RGBA source: ' + str(source_path))
        source = image.copy()
    with Image.open(mask_path) as image:
        if image.mode != 'L' or image.size != source.size:
            raise ValueError('Mask must be single-channel at native source dimensions: ' + str(mask_path))
        values = np.array(image)
    if not np.isin(values, (0, 255)).all():
        raise ValueError('Mask must contain only 0 and 255: ' + str(mask_path))
    if tuple(metadata['transform']['native_size']) != source.size:
        raise ValueError('Mask/source native coordinate metadata mismatch: ' + str(directory))
    origins = metadata['source_experiments'] if 'source_experiments' in metadata else [metadata['experiment_path']]
    return {'directory': directory, 'metadata': metadata, 'source': source,
            'source_path': source_path, 'source_checksum': source_checksum,
            'mask': values > 0, 'source_experiments': [Path(path).resolve() for path in origins],
            'input_checksums': {str(metadata_path): metadata_checksum,
                                str(mask_path): mask_checksum, str(source_path): source_checksum}}


def combine(operation, left_path, right_path, output):
    left, right = load_result(left_path), load_result(right_path)
    output = output.resolve()
    origins = sorted(set(left['source_experiments'] + right['source_experiments']))
    for protected in [left['directory'], right['directory'], *origins]:
        if output.is_relative_to(protected) or protected.is_relative_to(output):
            raise ValueError('Output overlaps an input result or historical experiment: ' + str(output))
    if left['source_checksum'] != right['source_checksum']:
        raise ValueError('Masks belong to different source images; equal dimensions alone do not establish alignment')
    mask = apply_operation(operation, left['mask'], right['mask'])
    checksums = {**left['input_checksums'], **right['input_checksums']}
    output.mkdir(parents=True, exist_ok=False)
    render_masks(output, left['source'], mask)
    numbers = {'mask_operation_version': VERSION, 'coordinate_space': 'native_source_pixels',
               'operation': operation, 'axis_order': 'rows=y, columns=x', 'mask': mask.astype(np.uint8).tolist()}
    with (output / 'numeric.json.gz').open('wb') as stream:
        with gzip.GzipFile(filename='', mode='wb', fileobj=stream, mtime=0) as archive:
            archive.write(json.dumps(numbers, separators=(',', ':')).encode('utf-8'))
    areas = component_areas(mask)
    metadata = {'mask_operation_version': VERSION, 'operation': operation,
                'coordinate_space': 'native_source_pixels', 'source_image': str(left['source_path']),
                'source_experiments': [str(path) for path in origins],
                'transform': left['metadata']['transform'],
                'transform_usage': 'native_size identifies the grid; no projection or resampling is applied',
                'operands': [{'role': role, 'directory': str(operand['directory']),
                              'area_pixels': int(operand['mask'].sum())}
                             for role, operand in (('left', left), ('right', right))],
                'overlap_area_pixels': int((left['mask'] & right['mask']).sum()),
                'output_area_pixels': int(mask.sum()),
                'connected_components': {'connectivity': 4, 'count': len(areas), 'areas_pixels': areas},
                'input_checksums_sha256': checksums,
                'output_checksums_sha256': {path.relative_to(output).as_posix(): sha(path)
                                            for path in sorted(output.iterdir()) if path.is_file()}}
    write_json(output / 'metadata.json', metadata)
    changed = [path for path, checksum in checksums.items() if sha(path) != checksum]
    write_json(output / 'integrity.json', {'outcome': 'passed' if not changed else 'failed',
                                          'checked_files': len(checksums), 'changed_files': changed})
    if changed:
        raise ValueError('Mask operands/source changed during operation: ' + repr(changed))
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--operation', required=True, choices=OPERATIONS)
    parser.add_argument('--left', required=True, type=Path, help='Saved result directory containing mask.png and metadata.json')
    parser.add_argument('--right', required=True, type=Path, help='Saved result directory; subtracted from left for difference')
    parser.add_argument('--output', required=True, type=Path, help='New result directory outside operands and historical experiments')
    args = parser.parse_args()
    metadata = combine(args.operation, args.left, args.right, args.output)
    print(json.dumps({'output': str(args.output.resolve()), 'operation': args.operation,
                      'operand_areas': {item['role']: item['area_pixels'] for item in metadata['operands']},
                      'overlap_area': metadata['overlap_area_pixels'], 'mask_area': metadata['output_area_pixels'],
                      'component_areas': metadata['connected_components']['areas_pixels'],
                      'artifacts': ['mask.png', 'mask-rgba.png', 'overlay.png', 'overlay-preview.png',
                                    'numeric.json.gz', 'metadata.json', 'integrity.json']}, ensure_ascii=True))


if __name__ == '__main__':
    main()
