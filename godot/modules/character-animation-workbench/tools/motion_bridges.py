"""Build measured gap corridors; retain disabled volume helpers for reference."""
from collections import defaultdict
import json
import math
from PIL import Image
from deformation_masks import ROOT, PROJECT, MASKS, PALETTE, ASSETS, PARENTS, BONES, connected


CALVES = [BONES.index(name) for name in ("CalfL", "CalfR")]
SHOULDER_ATTACHMENTS = {frozenset(BONES.index(name) for name in pair) for pair in [("Spine", "ArmL"), ("Spine", "ArmR")]}
NECK_ATTACHMENTS = {frozenset(BONES.index(name) for name in pair) for pair in [("Spine", "Head"), ("Head", "ArmL"), ("Head", "ArmR")]}

def convex_hull(points):
    points = sorted(set(points))
    def cross(a,b,c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    parts = []
    for sequence in [points,list(reversed(points))]:
        chain = []
        for p in sequence:
            while len(chain) >= 2 and cross(chain[-2],chain[-1],p) <= 0:
                chain.pop()
            chain.append(p)
        parts.extend(chain[:-1])
    return parts


def calf_fills(view,owners,palette):
    alpha = Image.open(PROJECT/'assets/Character/Character1/idle'/ASSETS[view][0]/ASSETS[view][1]).convert('RGBA').getchannel('A')
    width,height = owners.size
    result = []
    for bone in CALVES:
        pixels = [(x,y) for y in range(height) for x in range(width) if palette[owners.getpixel((x,y))] == bone and alpha.getpixel((x,y)) == 255]
        hull = convex_hull([(x+dx,y+dy) for x,y in pixels for dx,dy in [(0,0),(1,0),(0,1),(1,1)]])
        targets = []
        for y in range(min(p[1] for p in pixels),max(p[1] for p in pixels)+1):
            for x in range(min(p[0] for p in pixels),max(p[0] for p in pixels)+1):
                if alpha.getpixel((x,y)) == 0 and all((b[0]-a[0])*(y+.5-a[1])-(b[1]-a[1])*(x+.5-a[0]) >= 0 for a,b in zip(hull,hull[1:]+hull[:1])):
                    targets.append((x,y))
        def healthy(p):
            x,y = p
            return 1 <= x < width-1 and 1 <= y < height-1 and palette[owners.getpixel(p)] == bone and all(alpha.getpixel((x+dx,y+dy)) == 255 for dx,dy in [(0,0),(1,0),(-1,0),(0,1),(0,-1)])
        if not targets:
            continue
        shift = max([(dx,dy) for dy in range(-8,9) for dx in range(-8,9)],key=lambda d:(sum(healthy((x+d[0],y+d[1])) for x,y in targets),-d[0]*d[0]-d[1]*d[1]))
        for x,y in targets:
            sx,sy = x+shift[0],y+shift[1]
            if healthy((sx,sy)):
                result.append({'type':'calf_fill','x':x,'y':y,'sample_x':sx,'sample_y':sy,'a':bone,'b':bone,'driver':PARENTS[bone]})
    return result


def joint_envelopes(view, owners, palette, groups):
    alpha = Image.open(PROJECT/'assets/Character/Character1/idle'/ASSETS[view][0]/ASSETS[view][1]).convert('RGBA').getchannel('A')
    width,height = owners.size
    result = []
    for child in CALVES:
        parent = PARENTS[child]
        edges = groups.get(frozenset((parent,child)),[])
        if not edges:
            continue
        middle = round(sum(e['y']+e['dy']*.5 for e in edges)/len(edges))
        top,bottom = max(0,middle-3),min(height,middle+4)
        upper = [x for x in range(width) if palette[owners.getpixel((x,top))] == parent and alpha.getpixel((x,top)) == 255]
        lower = [x for x in range(width) if palette[owners.getpixel((x,bottom-1))] == child and alpha.getpixel((x,bottom-1)) == 255]
        if not upper or not lower:
            continue
        corners = [[min(upper),top],[max(upper)+1,top],[max(lower)+1,bottom],[min(lower),bottom]]
        samples = []
        for w in range(3,min(6,len(upper),len(lower))+1):
            for h in range(3,7):
                for sy in range(max(0,middle-10),min(height-h,middle+10)):
                    for sx in range(max(0,min(upper+lower)-4),min(width-w,max(upper+lower)+1)):
                        if all(alpha.getpixel((px,py)) == 255 and palette[owners.getpixel((px,py))] in [parent,child] for py in range(sy,sy+h) for px in range(sx,sx+w)):
                            samples.append((w*h,-abs(sy+h/2-middle),sx,sy,w,h))
        if samples:
            _,_,sx,sy,w,h = max(samples)
            witness = max(edges,key=lambda e:e['max_gap'])
            result.append({'type':'joint_envelope','a':parent,'b':child,'driver':child,'geometry':corners,'uv_rect':[sx,sy,w,h], 'clip':witness['clip'],'time':witness['time'],'max_gap':witness['max_gap']})
    return result


def build():
    audit = json.loads((ROOT.parents[2]/'tmp/animation-workbench/motion-gaps-before.json').read_text())
    palette = {color:index for index,color in enumerate(PALETTE)}
    attachments = SHOULDER_ATTACHMENTS | NECK_ATTACHMENTS
    result = {'sample_count':audit['samples'],'profiles':{}}
    for profile,data in audit['profiles'].items():
        owners = Image.open(MASKS/f'{profile}-owners.png').convert('RGB')
        rigidity = Image.open(MASKS/f'{profile}-rigidity.png').convert('L')
        width,height = owners.size
        groups = defaultdict(list)
        for edge in data['edges']:
            groups[frozenset((edge['a'],edge['b']))].append(edge)
        selected = []
        for pair,edges in groups.items():
            for edge in edges:
                a,b = edge['a'],edge['b']
                if edge['max_gap'] < .75 or not (connected(a,b) or pair in attachments):
                    continue
                if pair in SHOULDER_ATTACHMENTS and edge['y'] > min(e['y'] for e in edges)+3:
                    continue
                x,y,dx,dy = (edge[k] for k in ['x','y','dx','dy'])
                for depth in range(min(3,max(1,math.ceil(edge['max_gap']/3))),0,-1):
                    left,top = x-(depth-1)*dx,y-(depth-1)*dy
                    right,bottom = x+1+depth*dx,y+1+depth*dy
                    if left < 0 or top < 0 or right > width or bottom > height:
                        continue
                    if all(rigidity.getpixel((px,py)) and palette[owners.getpixel((px,py))] in pair for py in range(top,bottom) for px in range(left,right)):
                        selected.append(dict(edge,depth=depth))
                        break
        # Keep joint_envelopes and calf_fills for reference. Only measured
        # corridors are generated while evaluating the borrowed UV patches.
        result['profiles'][profile] = selected
        print(f'{profile}: {len(selected)} measured patches')
    (MASKS/'motion-bridges.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')


if __name__ == '__main__':
    build()
