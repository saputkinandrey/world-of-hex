"""Apply explicitly authored anatomical regions to existing data masks."""
import json
from PIL import Image, ImageDraw
from deformation_masks import MASKS, MANIFEST, BONES, PALETTE


def refine():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    anatomy = json.loads((MASKS/'anatomy-regions.json').read_text(encoding='utf-8'))
    for name, profile in manifest['profiles'].items():
        if profile['head']:
            continue
        regions = anatomy[profile['view']]
        body_profile = manifest['bindings'][profile['view']]['Layers/BodyBase']
        body_size = manifest['profiles'][body_profile]['frame'][0]
        labels = Image.new('L', (body_size, body_size))
        joints = Image.new('L', labels.size)
        for region in regions['regions']:
            ImageDraw.Draw(labels).polygon([tuple(p) for p in region['polygon']], fill=BONES.index(region['bone'])+1)
        for line in regions['joints']:
            ImageDraw.Draw(joints).line([tuple(p) for p in line], fill=112, width=1)
        owners = Image.open(MASKS/f'{name}-owners.png').convert('RGB')
        rigid = Image.open(MASKS/f'{name}-rigidity.png').convert('L')
        width, height = profile['frame']
        a,b,c,d,tx,ty = profile['transform']
        changed = 0
        for y in range(height):
            for x in range(width):
                if rigid.getpixel((x,y)) == 0:
                    continue
                px,py = x+.5-width/2, y+.5-height/2
                p = (round(a*px+c*py+tx+body_size/2-.5), round(b*px+d*py+ty+body_size/2-.5))
                if not (0 <= p[0] < body_size and 0 <= p[1] < body_size):
                    continue
                label = labels.getpixel(p)
                if label:
                    owners.putpixel((x,y), PALETTE[label-1])
                    rigid.putpixel((x,y), 255)
                    changed += 1
                if joints.getpixel(p):
                    rigid.putpixel((x,y), 112)
        owners.save(MASKS/f'{name}-owners.png')
        rigid.save(MASKS/f'{name}-rigidity.png')
        print(f'Refined {name}: {changed} anatomical texels', flush=True)


if __name__ == '__main__':
    refine()
