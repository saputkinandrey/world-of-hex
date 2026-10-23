"""Apply explicitly authored anatomical regions to existing data masks."""
import json
from collections import deque
from PIL import Image, ImageDraw
from protected_masks import protect
from deformation_masks import MASKS, MANIFEST, BONES, PALETTE, PARENTS, GARMENT_SLEEVE_LINKS


def separate_body_profile(manifest):
    bindings = manifest['bindings']['south']
    if bindings['Layers/BodyBase'] == 'south-body':
        return
    original = bindings['Layers/BodyBase']
    manifest['profiles']['south-body'] = dict(manifest['profiles'][original])
    for suffix in ['owners', 'rigidity']:
        Image.open(MASKS/f'{original}-{suffix}.png').save(MASKS/f'south-body-{suffix}.png')
    bindings['Layers/BodyBase'] = 'south-body'
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding='utf-8')


def soften_joint_bands(owners, rigid, garment):
    """Use real source texels for connected joints; leave body contacts split."""
    palette = dict((color, i) for i, color in enumerate(PALETTE))
    labels = [palette[color] for color in owners.get_flattened_data()]
    width, height = owners.size
    distances, queue = {}, deque()
    for y in range(height):
        for x in range(width):
            if not rigid.getpixel((x,y)):
                continue
            bone = labels[y*width+x]
            for dy in [-1,0,1]:
                for dx in [-1,0,1]:
                    nx,ny = x+dx,y+dy
                    if not (0 <= nx < width and 0 <= ny < height) or not rigid.getpixel((nx,ny)):
                        continue
                    other = labels[ny*width+nx]
                    sleeve = garment and frozenset((bone,other)) in GARMENT_SLEEVE_LINKS
                    if bone != other and (PARENTS[bone] == other or PARENTS[other] == bone or sleeve):
                        distances[(x,y)] = 0
                        queue.append((x,y))
                        break
                if (x,y) in distances:
                    break
    while queue:
        x,y = queue.popleft()
        distance = distances[(x,y)]
        rigid.putpixel((x,y), min(rigid.getpixel((x,y)), [32,128][distance]))
        if distance == 1:
            continue
        for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if 0 <= nx < width and 0 <= ny < height and rigid.getpixel((nx,ny)) and (nx,ny) not in distances:
                distances[(nx,ny)] = distance+1
                queue.append((nx,ny))


def refine():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    protect(manifest["profiles"],"Legacy anatomical refinement")
    separate_body_profile(manifest)
    anatomy = json.loads((MASKS/'anatomy-regions.json').read_text(encoding='utf-8'))
    for name, profile in manifest['profiles'].items():
        if profile['head']:
            continue
        regions = anatomy[profile['view']]
        body_profile = manifest['bindings'][profile['view']]['Layers/BodyBase']
        body_size = manifest['profiles'][body_profile]['frame'][0]
        labels = Image.new('L', (body_size, body_size))
        joints = Image.new('L', labels.size)
        authored = list(regions['regions'])
        if name == manifest['bindings'][profile['view']]['Layers/BodyBase']:
            authored += regions.get('hands', [])
        for region in authored:
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
        soften_joint_bands(owners, rigid, name != body_profile)
        owners.save(MASKS/f'{name}-owners.png')
        rigid.save(MASKS/f'{name}-rigidity.png')
        print(f'Refined {name}: {changed} anatomical texels', flush=True)


if __name__ == '__main__':
    refine()
