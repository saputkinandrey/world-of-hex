"""Inspect source texels and anatomical labels together, independent of weights."""
import argparse
import json
from collections import deque

from PIL import Image, ImageDraw
from deformation_masks import ROOT, PROJECT, MASKS, MANIFEST, ASSETS, BONES, PALETTE

OUTPUT = ROOT.parents[2]/'tmp/animation-workbench/segmentation'


def source(view):
    directory,filename = ASSETS[view]
    atlas = Image.open(PROJECT/'assets/Character/Character1/idle'/directory/filename).convert('RGBA')
    return atlas.crop((0,0,atlas.height,atlas.height))


def components(image, owners, connectivity=4):
    palette = {color:index for index,color in enumerate(PALETTE)}
    remaining = {(x,y) for y in range(image.height) for x in range(image.width) if image.getpixel((x,y))[3] > 0}
    result = {bone:[] for bone in BONES}
    offsets = [(1,0),(-1,0),(0,1),(0,-1)]
    if connectivity == 8:
        offsets += [(1,1),(1,-1),(-1,1),(-1,-1)]
    while remaining:
        seed = min(remaining,key=lambda p:(p[1],p[0]))
        owner = palette[owners.getpixel(seed)]
        queue,points = deque([seed]),[]
        remaining.remove(seed)
        neighbors = set()
        while queue:
            x,y = queue.popleft()
            points.append((x,y))
            for dx,dy in offsets:
                p = x+dx,y+dy
                if not (0 <= p[0] < image.width and 0 <= p[1] < image.height):
                    continue
                if image.getpixel(p)[3] and owners.getpixel(p) != PALETTE[owner]:
                    neighbors.add(BONES[palette[owners.getpixel(p)]])
                if p in remaining and owners.getpixel(p) == PALETTE[owner]:
                    remaining.remove(p)
                    queue.append(p)
        result[BONES[owner]].append({'pixels':len(points),'seed':list(seed),
            'bbox':[min(x for x,y in points),min(y for x,y in points),max(x for x,y in points)+1,max(y for x,y in points)+1],
            'neighbors':sorted(neighbors),'opaque_pixels':sum(image.getpixel(p)[3] >= 128 for p in points)})
    for regions in result.values():
        regions.sort(key=lambda c:(-c['pixels'],c['seed']))
    return result


def atlas(view, image, owners, output):
    bounds = image.getchannel('A').getbbox()
    bounds = (max(0,bounds[0]-3),max(0,bounds[1]-3),min(image.width,bounds[2]+3),min(image.height,bounds[3]+3))
    scale = 10
    size = ((bounds[2]-bounds[0])*scale,(bounds[3]-bounds[1])*scale)
    panels = []
    for mode in range(3):
        panel = Image.new('RGB',image.size,(27,31,38))
        for y in range(image.height):
            for x in range(image.width):
                rgba = image.getpixel((x,y))
                if not rgba[3]:
                    continue
                label = owners.getpixel((x,y))
                rgb = rgba[:3] if mode == 0 else tuple(round(rgba[i]*.55+label[i]*.45) for i in range(3)) if mode == 1 else label
                alpha = rgba[3]/255
                panel.putpixel((x,y),tuple(round(rgb[i]*alpha+(1-alpha)*(27,31,38)[i]) for i in range(3)))
        panel = panel.crop(bounds).resize(size,Image.Resampling.NEAREST)
        if mode == 0:
            grid = ImageDraw.Draw(panel)
            for x in range(bounds[0],bounds[2]):
                if x%5 == 0:
                    px = (x-bounds[0])*scale
                    grid.line((px,0,px,size[1]),fill=(60,64,70))
                    grid.text((px+1,2),str(x),fill='white')
            for y in range(bounds[1],bounds[3]):
                if y%5 == 0:
                    py = (y-bounds[1])*scale
                    grid.line((0,py,size[0],py),fill=(60,64,70))
                    grid.text((1,py+1),str(y),fill='white')
        panels.append(panel)
    sheet = Image.new('RGB',(size[0]*3+40,size[1]+140),(27,31,38))
    draw = ImageDraw.Draw(sheet)
    for index,title in enumerate(['Source / pixel coordinates','Source + ownership','Ownership / source alpha']):
        sheet.paste(panels[index],(index*(size[0]+10),30))
        draw.text((index*(size[0]+10),8),view+' | '+title,fill='white')
    for index,(bone,color) in enumerate(zip(BONES,PALETTE)):
        x,y = (index%7)*(sheet.width//7),size[1]+48+(index//7)*30
        draw.rectangle((x,y,x+12,y+12),fill=color)
        draw.text((x+17,y),bone,fill='white')
    sheet.save(output/(view+'-atlas.png'))
    panels[0].save(output/(view+'-source-grid.png'))


def build(phase):
    output = OUTPUT/phase
    output.mkdir(parents=True,exist_ok=True)
    manifest = json.loads(MANIFEST.read_text())
    report = {}
    lines = ['# Segmentation components ('+phase+')','',
             'All source texels with alpha > 0; four-neighbor components.','']
    for view in ASSETS:
        image = source(view)
        profile = manifest['bindings'][view]['Layers/BodyBase']
        owners = Image.open(MASKS/(profile+'-owners.png')).convert('RGB')
        report[view] = {'four_neighbors':components(image,owners),'eight_neighbors':components(image,owners,8)}
        atlas(view,image,owners,output)
        for bone,regions in report[view]['four_neighbors'].items():
            lines.append(f'## {view} / {bone}')
            for index,region in enumerate(regions):
                lines.append(f'- {"Main" if index == 0 else "Additional"}: {region["pixels"]} px; bbox {region["bbox"]}; neighbors {", ".join(region["neighbors"])}')
            if not regions:
                lines.append('- No visible source pixels.')
            lines.append('')
    (output/'components.json').write_text(json.dumps(report,indent=2)+'\n')
    (output/'components.md').write_text('\n'.join(lines)+'\n')
    print(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('phase',choices=['before','after'])
    build(parser.parse_args().phase)
