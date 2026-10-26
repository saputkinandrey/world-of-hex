"""Independent-process disk checks for every frame and atlas, without raw archives."""
import numpy as np
from PIL import Image

from core import ROOT, REPO, read, sha, provenance, invariants, write
from pipeline import load_inputs, compute, protected_paths


def verify():
    config,inventory,labels,groups,data = load_inputs()
    calculated = compute(config,groups,data)
    manifest = read(ROOT/'source-manifest.json')
    assert protected_paths() == manifest['protected_files']
    assert all(sha(REPO/path)==digest for path,digest in manifest['compact_inputs'].items())
    checks = 0
    for key,item in data.items():
        row = calculated[key]
        saved = []
        for skin,frame in enumerate(item['frames']):
            folder = ROOT/'results'/key/f'frame-{skin:03d}'
            confirmed = item['alpha_validation'][skin]['binary_silhouette']
            alpha = frame['rgba'][:,:,3]>0
            original = row['original'] if confirmed else np.zeros(alpha.shape,np.uint8)
            np.testing.assert_array_equal(np.load(folder/'densepose-original.npy'),frame['dense'])
            np.testing.assert_array_equal(np.array(Image.open(folder/'source.png')),frame['rgba'])
            for name in ['original','flood','final']:
                expected = row[name] if confirmed else np.zeros_like(original)
                np.testing.assert_array_equal(np.load(folder/f'owners-{name}.npy'),expected)
            final = np.load(folder/'owners-final.npy')
            p = np.load(folder/'provenance.npy')
            invariants(original,final,alpha,p)
            for i,name in enumerate(groups,1):
                np.testing.assert_array_equal(np.array(Image.open(folder/'masks'/f'{name}.png'))>0,final==i)
            saved.append(final)
            for name in ['source','original','flood','final','provenance']:
                atlas = Image.open(ROOT/'atlases'/key/f'{name}.png').convert('RGBA')
                assert atlas.size == tuple(item['atlas']['atlas_size'])
                w,h = item['atlas']['frame_size']
                x,y = (skin%item['atlas']['hframes'])*w,(skin//item['atlas']['hframes'])*h
                expected_file = folder/({'source':'source.png','provenance':'provenance.png'}.get(name,f'owners-{name}.png'))
                np.testing.assert_array_equal(np.array(atlas.crop((x,y,x+w,y+h))),np.array(Image.open(expected_file).convert('RGBA')))
            checks += 1
        if all(v['binary_silhouette'] for v in item['alpha_validation']):
            assert all(np.array_equal(saved[0],s) for s in saved)
        for radius,(owners,ambiguous,distance) in row['variants'].items():
            folder = ROOT/'flood-fill'/key/f'flood-r{radius}'
            np.testing.assert_array_equal(np.load(folder/'anatomical-owners.npy'),owners)
            np.testing.assert_array_equal(np.load(folder/'geodesic-distance.npy'),distance)
        if item['atlas']['mirrored']:
            source_key = f'{item["atlas"]["pose"]}/{item["atlas"]["source_direction"]}'
            for skin in range(5):
                for name in ['owners-original.npy','owners-flood.npy','owners-final.npy','provenance.npy']:
                    original = np.load(ROOT/'results'/source_key/f'frame-{skin:03d}'/name)
                    mirror = np.load(ROOT/'results'/key/f'frame-{skin:03d}'/name)
                    np.testing.assert_array_equal(original[:,::-1],mirror)
    verification = read(ROOT/'verification.json')
    verification.update({'independent_process_frames_checked':checks,'binary_group_masks_checked':checks*len(groups),
                         'atlas_frames_and_order_checked':checks,'saved_maps_equal_recomputation':True})
    write(ROOT/'verification.json',verification)
    print(f'Independent verification passed: {checks} frames, {checks*len(groups)} masks, 48 atlas layouts')


if __name__ == '__main__':
    verify()
