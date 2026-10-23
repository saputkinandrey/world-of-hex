"""Compile reviewed source-art contours into ownership data, without flood fill."""
import argparse
import hashlib
import json

from PIL import Image, ImageDraw
from deformation_masks import MASKS, MANIFEST, ASSETS, BONES, PALETTE
from segmentation_atlas import source, OUTPUT

ANNOTATIONS = MASKS/'authored-segmentation.json'
LOCK = MASKS/'segmentation-lock.json'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def annotated(view, document):
    image = source(view)
    labels = Image.new('L',image.size)
    draw = ImageDraw.Draw(labels)
    for region in document['views'][view]:
        draw.polygon([tuple(p) for p in region['polygon']],fill=BONES.index(region['bone'])+1)
    for correction in document['pixel_corrections'][view]:
        for point in correction['pixels']:
            labels.putpixel(tuple(point),BONES.index(correction['bone'])+1)
    missing = [(x,y) for y in range(image.height) for x in range(image.width)
               if image.getpixel((x,y))[3] and not labels.getpixel((x,y))]
    return image,labels,missing


def build(write=False):
    document = json.loads(ANNOTATIONS.read_text())
    manifest = json.loads(MANIFEST.read_text())
    prepared = {}
    missing = {}
    for view in ASSETS:
        image,labels,unassigned = annotated(view,document)
        prepared[view] = image,labels
        missing[view] = unassigned
    print(json.dumps({'unassigned':missing},indent=2))
    if any(missing.values()):
        raise ValueError('Authored contours must cover every visible source pixel; no automatic assignment is made')
    if not write:
        return
    if LOCK.exists():
        previous = json.loads(LOCK.read_text())
        for filename,expected in previous['files'].items():
            if digest(MASKS/filename) != expected:
                raise ValueError('Preserving a manually edited mask: '+filename+' differs from last authored compilation')
    outputs = {}
    before = OUTPUT/'before'
    before.mkdir(parents=True,exist_ok=True)
    for name,profile in manifest['profiles'].items():
        if profile['head']:
            continue
        view = profile['view']
        image,labels = prepared[view]
        current = Image.open(MASKS/(name+'-owners.png')).convert('RGB')
        # Keep an immutable baseline for reports and projection comparisons.
        for suffix in ['owners','rigidity']:
            baseline = before/(name+'-'+suffix+'.png')
            if not baseline.exists():
                baseline.write_bytes((MASKS/(name+'-'+suffix+'.png')).read_bytes())
        a,b,c,d,tx,ty = profile['transform']
        width,height = profile['frame']
        for y in range(height):
            for x in range(width):
                px,py = x+.5-width/2,y+.5-height/2
                point = round(a*px+c*py+tx+image.width/2-.5),round(b*px+d*py+ty+image.height/2-.5)
                if not (0 <= point[0] < image.width and 0 <= point[1] < image.height):
                    continue
                # Project reviewed visible anatomy onto registered equipment;
                # garment-only silhouette extensions retain their own labels.
                if image.getpixel(point)[3] and labels.getpixel(point):
                    current.putpixel((x,y),PALETTE[labels.getpixel(point)-1])
        outputs[name] = current
    for name,image in outputs.items():
        image.save(MASKS/(name+'-owners.png'))
    files = {name+'-'+suffix+'.png':digest(MASKS/(name+'-'+suffix+'.png'))
             for name in outputs for suffix in ['owners','rigidity']}
    LOCK.write_text(json.dumps({'source':'authored-segmentation.json','profiles':sorted(outputs),'files':files},indent=2)+'\n')
    print('Authored ownership saved; rigidity, clips, rigs and ligament geometry unchanged.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--write',action='store_true')
    build(parser.parse_args().write)
