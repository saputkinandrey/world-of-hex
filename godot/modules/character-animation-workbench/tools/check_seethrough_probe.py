"""Verify prepared real inputs, provenance, and center-coordinate inversion."""
import argparse
import json
from pathlib import Path

from PIL import Image
from prepare_seethrough_probe import make_input, sha, source_frame


def check(repo):
    output = repo/'tmp/animation-workbench/seethrough-probe'
    manifest = json.loads((output/'manifest.json').read_text(encoding='utf-8'))
    assert manifest['schema'] == 'hex-seethrough-probe/1'
    assert len(manifest['records']) == 8
    for record in manifest['records']:
        for filename, checksum in [('input_file','input_sha256'),('native_rgba_file','native_rgba_sha256'),('baseline_file','baseline_sha256')]:
            assert sha(output/record[filename]) == record[checksum], record[filename]
        for filename, checksum in [('source_atlas','source_atlas_sha256'),('reviewed_owner_mask','reviewed_owner_mask_sha256')]:
            assert sha(repo/record[filename]) == record[checksum], record[filename]
        source, _ = source_frame(repo, record['view'])
        with Image.open(output/record['native_rgba_file']) as saved:
            assert saved.convert('RGBA').tobytes() == source.tobytes()
        with Image.open(repo/record['reviewed_owner_mask']) as original, Image.open(output/record['baseline_file']) as baseline:
            assert baseline.convert('RGB').tobytes() == original.convert('RGB').tobytes()
            assert baseline.getchannel('A').tobytes() == source.getchannel('A').tobytes()
        with Image.open(output/record['input_file']) as image:
            assert image.mode == 'RGB' and list(image.size) == record['input_dimensions']
            expected, _ = make_input(source,image.width,record['resampling'])
            assert image.tobytes() == expected.tobytes(), record['input_file']
        for axis in range(2):
            scale = record['native_to_input_scale'][axis]
            offset = record['native_to_input_offset'][axis]
            for native in range(source.size[axis]):
                model = (native+.5)*scale+offset-.5
                inverse = (model+.5-offset)/scale-.5
                assert abs(inverse-native) < 1e-9
                assert abs(model-(native*scale+record['native_center_to_input_offset'][axis])) < 1e-9
    print('Verified eight real inputs, source/mask checksums, source alpha, and every native pixel-center round trip.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo',type=Path,required=True)
    check(parser.parse_args().repo.resolve())
