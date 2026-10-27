"""Measurements of exported GPU images and recorded joints. No frame synthesis."""
from collections import deque
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

def mask(path):
    return np.array(Image.open(path).convert('RGBA'))[:,:,3]>0

def component_count(a):
    remaining=set(map(tuple,np.argwhere(a)))
    count=0
    while remaining:
        count+=1
        queue=deque([remaining.pop()])
        while queue:
            y,x=queue.popleft()
            for p in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
                if p in remaining:
                    remaining.remove(p)
                    queue.append(p)
    return count

def contour(a):
    padded=np.pad(a,1)
    inner=a&padded[:-2,1:-1]&padded[2:,1:-1]&padded[1:-1,:-2]&padded[1:-1,2:]
    return np.argwhere(a&~inner)

def hausdorff(a,b):
    ca,cb=contour(a),contour(b)
    if not len(ca) or not len(cb):
        return None
    squared=((ca[:,None,:]-cb[None,:,:])**2).sum(axis=2)
    return float(np.sqrt(max(squared.min(axis=0).max(),squared.min(axis=1).max())))

def main():
    report={}
    total=0
    for view in ['south-west','north-west']:
        for folder in sorted((ROOT/'exports'/view).iterdir()):
            if not folder.is_dir(): continue
            logs=json.loads((folder/'frames.json').read_text())
            paths=sorted(folder.glob('frame-*.png'))
            assert len(paths)==len(logs['frames'])==31
            assert logs['fps']==30
            masks=[]
            for path in paths:
                with Image.open(path) as im:
                    assert im.size==(150,150) and im.mode=='RGBA'
                    assert im.getextrema()[3][0]==0
                masks.append(mask(path))
            joints=np.array([frame['joints'] for frame in logs['frames']])
            delta=np.linalg.norm(np.diff(joints,axis=0),axis=2)
            components=[component_count(a) for a in masks]
            switches=[i for i in range(1,len(paths)) if logs['frames'][i]['alpha']!=logs['frames'][i-1]['alpha']]
            held=ROOT/'diagnostics'/view/folder.name
            source,target=mask(held/'held-source.png'),mask(held/'held-target.png')
            baseline=max(components[0],components[-1])
            report[f'{view}/{folder.name}']=dict(frames=len(paths),fps=30,max_joint_step_pixels=float(delta.max()),
                alpha_components_per_frame=components,candidate_disconnected_frames=sum(c>baseline for c in components),
                candidate_disconnection_caveat='Component growth is an indicator, not reliable anatomical gap classification.',
                texture_switch_frame_indices=switches,
                held_skeleton_texture_switch_contour_hausdorff_pixels=hausdorff(source,target),
                held_skeleton_changed_silhouette_pixels=int((source!=target).sum()),
                projected_changed_texture_source_pixel_count=None,max_textured_geometry_stretch=None,
                unmeasured='Projected source attribution under overlaps/blend and maximum texel stretch are not reliably measured.')
            total+=len(paths)
    comparison=sorted((ROOT/'exports/comparison').glob('frame-*.png'))
    assert len(comparison)==181
    for path in comparison:
        with Image.open(path) as im:
            assert im.size==(300,150) and im.mode=='RGBA' and im.getextrema()[3][0]==0
    final=dict(version='1.0.0',renderer='Godot GPU / OpenGL Compatibility',transition_frames=total,comparison_frames=len(comparison),transitions=report)
    (ROOT/'measurements.json').write_text(json.dumps(final,indent=2)+'\n')
    lines=['| Transition | Max joint step, px | Held switch contour, px | Candidate disconnected frames |','| --- | ---: | ---: | ---: |']
    for key,data in report.items():
        lines.append(f'| {key} | {data["max_joint_step_pixels"]:.3f} | {data["held_skeleton_texture_switch_contour_hausdorff_pixels"]:.3f} | {data["candidate_disconnected_frames"]} |')
    (ROOT/'MEASUREMENTS.md').write_text('# GPU measurements v1.0.0\n\n'+'\n'.join(lines)+'\n\nContour displacement compares two textures at the SAME animated skeleton. Components are diagnostic candidates, not accepted gap counts. Projected source-pixel attribution and maximum texel stretch remain unmeasured. Raw frame data is in measurements.json.\n')
    print(f'Validated {total} transition PNGs + {len(comparison)} comparison PNGs; 12 measured transitions')

if __name__=='__main__': main()
