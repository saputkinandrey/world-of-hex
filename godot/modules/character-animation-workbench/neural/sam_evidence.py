"""Native-resolution SAM semantics, kept separate from skeletal ownership."""
import colorsys
import json
import numpy as np
from PIL import Image, ImageDraw
from preprocess import OUTPUT, SOURCES, frame, project
from sam import CLASSES
from recipe import require_input


def main():
    records = json.loads((OUTPUT/'inputs.json').read_text())
    report = {}
    for view in SOURCES:
        folder = OUTPUT/'sam'/view
        experiment = json.loads((folder/'experiment.json').read_text())
        require_input(experiment,records[view+'-crop-nearest-512'])
        logits = np.load(folder/'logits.npz')['logits']
        positive = logits>0
        unique = positive.sum(axis=0)==1
        labels = np.where(unique,logits.argmax(axis=0)+1,0).astype(np.uint8)
        transform = experiment['transform']
        native = project(labels,transform)
        image,_ = frame(view)
        source = np.array(image)
        visible = source[...,3]>0
        native[~visible] = 0
        Image.fromarray(native).save(folder/'native-semantic-labels.png')
        colored = np.zeros_like(source)
        colored[visible] = [100,100,100,255]
        for index in range(1,20):
            color = [round(channel*255) for channel in colorsys.hsv_to_rgb(index/19,.7,.95)]
            colored[native==index] = [*color,255]
        colored[...,3] = source[...,3]
        Image.fromarray(colored).save(folder/'native-semantics.png')
        panels = [('Original',image),('19 SAM classes; gray=unknown',Image.fromarray(colored))]
        counts = {}
        for name in ('topwear','handwear','legwear'):
            index = CLASSES.index(name)
            mask = (project(positive[index].astype(np.uint8),transform)>0)&visible
            pixels = source.copy()
            pixels[~mask] = 0
            panels.append((name,Image.fromarray(pixels)))
            counts[name] = int(mask.sum())
        side = max(image.size)*5
        atlas = Image.new('RGB',(side*len(panels),side+45),(28,32,39))
        draw = ImageDraw.Draw(atlas)
        for index,(name,panel) in enumerate(panels):
            panel = panel.resize((side,side),Image.Resampling.NEAREST)
            atlas.paste(panel,(index*side,35),panel)
            draw.text((index*side+8,12),name,fill='white')
        atlas.save(folder/'semantic-atlas.png')
        report[view] = {'classes':CLASSES,'source_pixels':int(visible.sum()),
                        'unique_semantic_pixels':int((native>0).sum()),
                        'source_semantic_support':counts,
                        'skeletal_mapping':'not inferred; no elbows/knees/ankles or lateral bone identity are invented'}
    (OUTPUT/'sam/native-summary.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__ == '__main__':
    main()
