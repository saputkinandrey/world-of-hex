"""Post-inference comparison only: Legacy is a competitor, not ground truth."""
from collections import Counter
import json

import numpy as np
from PIL import Image, ImageDraw
from candidates import BONES, PALETTE
from preprocess import MODULE, OUTPUT, REPO, SOURCES, frame, sha


def main():
    target = OUTPUT/'comparison'
    target.mkdir(exist_ok=True)
    baseline = REPO/'tmp/animation-workbench/frozen-legacy/repo/godot/modules/character-animation-workbench'
    profiles = json.loads((baseline/'masks/profiles.json').read_text())
    report = {'meaning':'Disagreement, not accuracy. Legacy labels are not ground truth.',
              'visual_evaluation':'Subjective; inspect enlarged atlases and clips separately from structural checks.',
              'views':{}}
    for view in SOURCES:
        folder = OUTPUT/'candidates'/(view+'-crop-nearest-512')
        info = json.loads((folder/'candidate.json').read_text())
        if sha(folder/'owners-index.png') != info['owners_sha256']:
            raise ValueError('Candidate changed before comparison: '+view)
        source,_ = frame(view)
        original = np.array(source)
        native = np.array(Image.open(folder/'owners-index.png'))
        name = profiles['bindings'][view]['Layers/BodyBase']
        legacy_rgb = np.array(Image.open(baseline/'masks'/(name+'-owners.png')).convert('RGB'))
        old = np.zeros(native.shape,dtype=np.uint8)
        for index,color in enumerate(PALETTE,1):
            old[np.all(legacy_rgb == color,axis=-1)] = index
        visible = original[...,3]>0
        mismatch = visible&(old != native)
        pairs = Counter((int(a),int(b)) for a,b in zip(old[visible],native[visible]))
        labels = ['Unknown',*BONES]
        report['views'][view] = {'candidate_sha256':info['owners_sha256'],
            'source_pixels':int(visible.sum()),'neural_known':int((native>0).sum()),
            'neural_unknown':info['unknown_pixels'],'disagreement_pixels':int(mismatch.sum()),
            'bone_pairs':[{'legacy':labels[a],'neural':labels[b],'pixels':count} for (a,b),count in sorted(pairs.items())],
            'by_legacy_region':{bone:{'pixels':int((visible&(old==index)).sum()),
                'different':int((mismatch&(old==index)).sum()),
                'neural_unknown':int((visible&(old==index)&(native==0)).sum())} for index,bone in enumerate(BONES,1)}}
        old_image = Image.fromarray(np.dstack([legacy_rgb,original[...,3]]))
        neural = Image.open(folder/'owners.png').convert('RGBA')
        disagreement = np.zeros_like(original)
        disagreement[visible&~mismatch] = [80,120,80,255]
        disagreement[mismatch&(native>0)] = [255,80,60,255]
        disagreement[visible&(native==0)] = [110,110,110,255]
        hidden = Image.new('RGBA',source.size)
        for path in sorted((folder/'generated-candidates').glob('*.png')):
            hidden.alpha_composite(Image.open(path).convert('RGBA'))
        panels = [('Original',source),('Frozen Legacy',old_image),('Neural; gray=unknown',neural),
                  ('Disagreement; gray=unknown',Image.fromarray(disagreement)),('Generated outside source',hidden)]
        side = max(source.size)*5
        atlas = Image.new('RGB',(side*5,side+45),(28,32,39))
        draw = ImageDraw.Draw(atlas)
        for index,(title,image) in enumerate(panels):
            expanded = image.resize((side,side),Image.Resampling.NEAREST)
            atlas.paste(expanded,(index*side,35),expanded)
            draw.text((index*side+8,12),title,fill='white')
        atlas.save(target/(view+'-atlas.png'))
    (target/'disagreement.json').write_text(json.dumps(report,indent=2)+'\n')
    lines = ['# Independent Neural versus frozen Legacy','',report['meaning'],'',
             '| View | Source pixels | Neural known | Neural unknown | Different labels |',
             '| --- | ---: | ---: | ---: | ---: |']
    for view,row in report['views'].items():
        lines.append(f"| {view} | {row['source_pixels']} | {row['neural_known']} | {row['neural_unknown']} | {row['disagreement_pixels']} |")
    (target/'DISAGREEMENT.md').write_text('\n'.join(lines)+'\n')


if __name__ == '__main__':
    main()
