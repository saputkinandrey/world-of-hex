"""Compare actual Godot captures; analysis only, never a frame renderer."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def comparison(actual, expected):
    a, b = np.array(Image.open(actual).convert('RGBA')), np.array(Image.open(expected).convert('RGBA'))
    assert a.shape == b.shape
    return dict(rgba_different_pixels=int(np.any(a != b, axis=2).sum()),
                silhouette_different_pixels=int(((a[:,:,3]>0)!=(b[:,:,3]>0)).sum()),
                alpha_different_pixels=int((a[:,:,3]!=b[:,:,3]).sum()),
                visible_rgb_different_pixels=int((np.any(a[:,:,:3]!=b[:,:,:3],axis=2)&(b[:,:,3]>0)).sum()))

if __name__ == '__main__':
    report = {}
    for pose in ['idle','aim-pistol']:
        report[pose] = comparison(ROOT/f'stage-b-{pose}.png',ROOT/f'assets/south-west/{pose}/skin-0.png')
    (ROOT/'stage-b-measurements.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report))
    assert all(not v['alpha_different_pixels'] and not v['visible_rgb_different_pixels'] for v in report.values())
