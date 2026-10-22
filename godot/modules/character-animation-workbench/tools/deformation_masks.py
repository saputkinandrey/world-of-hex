"""Offline compiler for editable pixel ownership and rigidity masks."""
from collections import Counter, deque
from functools import lru_cache
from pathlib import Path
import json
import re
import sys
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parents[1]
RES = 'res://modules/character-animation-workbench/'
MASKS = ROOT / 'masks'
OUTPUT = ROOT / 'rigs/masked'
MANIFEST = MASKS / 'profiles.json'
BONES = ['Pelvis', 'Spine', 'Chest', 'Head', 'ArmL', 'ForearmL', 'ArmR', 'ForearmR', 'ThighL', 'CalfL', 'ThighR', 'CalfR']
PARENTS = [-1, 0, 1, 2, 2, 4, 2, 6, 0, 8, 0, 10]
PATHS = ['Pelvis', 'Pelvis/Spine', 'Pelvis/Spine/Chest', 'Pelvis/Spine/Chest/Head',
         'Pelvis/Spine/Chest/ArmL', 'Pelvis/Spine/Chest/ArmL/ForearmL',
         'Pelvis/Spine/Chest/ArmR', 'Pelvis/Spine/Chest/ArmR/ForearmR',
         'Pelvis/ThighL', 'Pelvis/ThighL/CalfL', 'Pelvis/ThighR', 'Pelvis/ThighR/CalfR']
PALETTE = [(216, 80, 80), (230, 150, 60), (235, 215, 70), (110, 210, 100),
           (50, 190, 180), (60, 130, 240), (130, 80, 230), (210, 80, 210),
           (160, 110, 70), (110, 150, 60), (70, 150, 170), (160, 160, 210)]
HEAD = {'BeardBase', 'MustacheBase', 'SideburnsBase', 'EyesBase', 'EyebrowsBase',
        'EyeBandageBase', 'HairBase', 'HeadwearBase', 'HeadBandageBase'}
ASSETS = {
    'south': ('Char1_south_idle', 'Char1_body.png'),
    'north': ('Char1_north_idle', 'Char1_body_back.png'),
    'south-west': ('Char1_south_west_idle', 'Idle_body_SW1.png'),
    'north-west': ('Char1_north_west_idle', 'Idle_body_NW1.png'),
}
SEEDS = [(0, 24), (0, 5), (0, -12), (0, -33), (-25, -3), (-27, 22),
         (25, -3), (27, 22), (-10, 34), (-12, 45), (10, 34), (12, 45)]


def resource(path):
    return PROJECT / path.removeprefix('res://')


def collect_profiles():
    profiles, bindings = {}, {}
    for view in ASSETS:
        text = (ROOT / f'rigs/{view}-rig.tscn').read_text(encoding='utf-8')
        packed = dict((key, path) for path, key in re.findall(r'\[ext_resource type="PackedScene" path="([^"]+)" id="([^"]+)"\]', text))
        bases = {}
        for match in re.finditer(r'\[node[^\n]+\]\n[^\[]*', text):
            block = match.group()
            name = re.search(r'name="([^"]+)"', block)[1]
            if 'metadata/registration' in block:
                bases[name] = [float(x) for x in re.search(r'metadata/registration = Transform2D\(([^)]+)\)', block)[1].split(',')]
            if name != 'Surface' or 'instance=ExtResource' not in block:
                continue
            parent = re.search(r'parent="([^"]+)"', block)[1]
            base = parent.split('/')[-1]
            source = packed[re.search(r'instance=ExtResource\("([^"]+)"\)', block)[1]]
            frame = [int(x) for x in re.search(r'metadata/frame_size = Vector2i\(([^)]+)\)', resource(source).read_text(encoding='utf-8'))[1].split(',')]
            transform = list(bases[base])
            position = re.search(r'^position = Vector2\(([^)]+)\)', block, re.M)
            if position:
                px, py = map(float, position[1].split(','))
                transform[4] += transform[0]*px + transform[2]*py
                transform[5] += transform[1]*px + transform[3]*py
            signature = (view, source, tuple(round(x, 6) for x in transform), base in HEAD)
            found = next((key for key, value in profiles.items() if value['_signature'] == signature), None)
            if found is None:
                found = f'{view}-{len([key for key in profiles if key.startswith(view+"-")])}'
                profiles[found] = dict(view=view, source=source, frame=frame, transform=transform,
                                       head=base in HEAD, _signature=signature)
            bindings.setdefault(view, {})[parent] = found
    for profile in profiles.values():
        del profile['_signature']
    return dict(profiles=profiles, bindings=bindings, bones=dict(zip(BONES, PALETTE)))


def connected(a, b):
    return a == b or PARENTS[a] == b or PARENTS[b] == a


@lru_cache(None)
def anatomy(view):
    directory, filename = ASSETS[view]
    image = Image.open(PROJECT / 'assets/Character/Character1/idle' / directory / filename).convert('RGBA')
    size = image.height
    foreground = {(x, y) for y in range(size) for x in range(size) if image.getpixel((x, y))[3] > 8}
    width = .65 if 'west' in view else 1
    owners, queue = {}, deque()
    for bone, (x, y) in enumerate(SEEDS):
        target = (x*width+size/2, y+size/2)
        seed = min(foreground - owners.keys(), key=lambda p: (p[0]-target[0])**2+(p[1]-target[1])**2)
        owners[seed] = bone
        queue.append(seed)
    while queue:
        x, y = queue.popleft()
        for p in [(x-1,y), (x+1,y), (x,y-1), (x,y+1)]:
            if p in foreground and p not in owners:
                owners[p] = owners[(x,y)]
                queue.append(p)
    distances, queue = {}, deque()
    for p, bone in owners.items():
        x, y = p
        if any(q in owners and owners[q] != bone and connected(bone, owners[q]) for q in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]):
            distances[p] = 0
            queue.append(p)
    while queue:
        x, y = queue.popleft()
        if distances[(x,y)] >= 3:
            continue
        for p in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if p in owners and p not in distances:
                distances[p] = distances[(x,y)] + 1
                queue.append(p)
    rigidity = {p: [32, 112, 208, 255][min(distances.get(p, 3), 3)] for p in owners}
    queue = deque(owners)
    while queue:
        x, y = queue.popleft()
        for p in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
            if 0 <= p[0] < size and 0 <= p[1] < size and p not in owners:
                owners[p] = owners[(x,y)]
                rigidity[p] = rigidity[(x,y)]
                queue.append(p)
    return size, owners, rigidity


def initial_masks(profile):
    width, height = profile['frame']
    directory = PROJECT / 'assets/Character/Character1/idle' / ASSETS[profile['view']][0]
    union = Image.new('L', (width, height))
    for path in sorted(directory.glob('*.png')):
        if 'weapon' in path.name.lower():
            continue
        with Image.open(path) as atlas:
            if atlas.height != height or atlas.width % width:
                continue
            for offset in range(0, atlas.width, width):
                alpha = atlas.convert('RGBA').crop((offset, 0, offset+width, height)).getchannel('A')
                union = ImageChops.lighter(union, alpha)
    size, owners, rigidity = anatomy(profile['view'])
    owner_image, rigid_image = Image.new('RGB', (width,height)), Image.new('L', (width,height))
    a,b,c,d,tx,ty = profile['transform']
    for y in range(height):
        for x in range(width):
            px, py = x+.5-width/2, y+.5-height/2
            p = (max(0,min(size-1,round(a*px+c*py+tx+size/2))), max(0,min(size-1,round(b*px+d*py+ty+size/2))))
            bone = 3 if profile['head'] else owners[p]
            owner_image.putpixel((x,y), PALETTE[bone])
            value = 255 if profile['head'] else rigidity[p]
            rigid_image.putpixel((x,y), value if union.getpixel((x,y)) > 0 else 0)
    return owner_image, rigid_image


def initialize():
    MASKS.mkdir(parents=True, exist_ok=True)
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text())
    else:
        manifest = collect_profiles()
        MANIFEST.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    for name, profile in manifest['profiles'].items():
        if (MASKS / f'{name}-owners.png').exists() and (MASKS / f'{name}-rigidity.png').exists():
            continue
        owners, rigidity = initial_masks(profile)
        for image, suffix in [(owners, 'owners'), (rigidity, 'rigidity')]:
            path = MASKS / f'{name}-{suffix}.png'
            if not path.exists():
                image.save(path)
        print('Initialized', name, profile['frame'], flush=True)


def seam_triangles(cells, width, height):
    """Join duplicate edge vertices without changing either rigid texel's weights.

    These strips have zero area at rest and sample the shared source texel edge.
    Native skinning opens them only when the two owners move apart.
    """
    triangles = []
    for y in range(height):
        for x in range(width):
            quad = cells[y*width+x]
            edges = []
            if x+1 < width:
                neighbor = cells[y*width+x+1]
                edges.append((quad[1], quad[2], neighbor[0], neighbor[3]))
            if y+1 < height:
                neighbor = cells[(y+1)*width+x]
                edges.append((quad[3], quad[2], neighbor[0], neighbor[1]))
            for a,b,c,d in edges:
                if a != c or b != d:
                    triangles.extend([(a,b,c), (b,d,c)])
    # Edge strips leave a small polygon where three or four owners meet. Fill
    # that junction using the same source corner and its native bone weights.
    for y in range(1, height):
        for x in range(1, width):
            corners = [cells[(y-1)*width+x-1][2], cells[(y-1)*width+x][3],
                       cells[y*width+x][0], cells[y*width+x-1][1]]
            unique = list(dict.fromkeys(corners))
            for index in range(1, len(unique)-1):
                triangles.append((unique[0], unique[index], unique[index+1]))
    return triangles


def compile_profile(name, profile):
    width, height = profile['frame']
    owner_image = Image.open(MASKS / f'{name}-owners.png').convert('RGB')
    rigid_image = Image.open(MASKS / f'{name}-rigidity.png').convert('L')
    if owner_image.size != (width,height) or rigid_image.size != (width,height):
        raise ValueError(f'{name}: mask dimensions must be {width}x{height}')
    palette = dict((color, i) for i, color in enumerate(PALETTE))
    unknown = set(owner_image.get_flattened_data()) - palette.keys()
    if unknown:
        raise ValueError(f'{name}-owners.png: unknown bone colors {sorted(unknown)[:8]}')
    owners = [palette[color] for color in owner_image.get_flattened_data()]
    rigid = list(rigid_image.get_flattened_data())

    def cell(x,y):
        x,y = min(width-1,max(0,x)), min(height-1,max(0,y))
        index = y*width+x
        return owners[index], rigid[index]

    @lru_cache(None)
    def field(x,y):
        around = [cell(x-1,y-1),cell(x,y-1),cell(x-1,y),cell(x,y)]
        hard = {owner for owner, value in around if value == 255}
        if len(hard) == 1:
            return ((next(iter(hard)),1.0),)
        main = Counter(owner for owner,value in around).most_common(1)[0][0]
        counts = Counter()
        for dy in range(-2,3):
            for dx in range(-2,3):
                owner, _ = cell(x+dx,y+dy)
                if connected(main, owner):
                    counts[owner] += 1/(1+dx*dx+dy*dy)
        total = sum(counts.values())
        strength = sum(value for owner,value in around)/(4*255)
        result = dict((bone,(1-strength)*value/total) for bone,value in counts.items())
        result[main] = result.get(main,0)+strength
        selected = sorted(result.items(),key=lambda p:p[1],reverse=True)[:4]
        total = sum(value for bone,value in selected)
        return tuple(sorted((bone,round(value/total,8)) for bone,value in selected if value > .00000001))

    vertices, weights, lookup, triangles, cells = [], [], {}, [], []
    def vertex(x,y,influences):
        key = (x,y,influences)
        if key not in lookup:
            lookup[key] = len(vertices)
            vertices.append((x-width/2,y-height/2))
            weights.append(dict(influences))
        return lookup[key]
    for x,y in [(0,0),(width,0),(width,height),(0,height)]:
        vertex(x,y,field(x,y))
    for y in range(height):
        for x in range(width):
            owner, strength = cell(x,y)
            corners = [(x,y),(x+1,y),(x+1,y+1),(x,y+1)]
            indices = [vertex(px,py,((owner,1.0),) if strength == 255 else field(px,py)) for px,py in corners]
            cells.append(indices)
            triangles.extend([(indices[0],indices[1],indices[2]), (indices[0],indices[2],indices[3])])
    seams = seam_triangles(cells, width, height)
    def number(value):
        return str(round(value,8))
    text = '[gd_scene format=3]\n\n[ext_resource type="Script" path="'+RES+'skin-surface.gd" id="1"]\n\n[node name="Surface" type="Polygon2D"]\nscript = ExtResource("1")\nz_as_relative = false\ntexture_filter = 1\nskeleton = NodePath("../../../Skeleton2D")\n'
    text += f'rigidity_mask_path = "{RES}masks/{name}-rigidity.png"\nownership_mask_path = "{RES}masks/{name}-owners.png"\n'
    text += 'polygon = PackedVector2Array('+', '.join(number(v) for point in vertices for v in point)+')\n'
    text += 'uv = PackedVector2Array('+', '.join(number(v) for x,y in vertices for v in (x+width/2,y+height/2))+')\n'
    text += f'internal_vertex_count = {len(vertices)-4}\nmetadata/frame_size = Vector2i({width}, {height})\nmetadata/mask_profile = "{name}"\n'
    if seams:
        text += f'metadata/base_triangle_count = {len(triangles)}\n'
        text += 'metadata/elastic_triangles = ['+', '.join('PackedInt32Array('+', '.join(map(str, t))+')' for t in seams)+']\n'
    text += 'polygons = ['+', '.join('PackedInt32Array('+', '.join(map(str, t))+')' for t in triangles)+']\n'
    bones = []
    for bone,path in enumerate(PATHS):
        bones.extend(['"'+path+'"','PackedFloat32Array('+', '.join(number(w.get(bone,0)) for w in weights)+')'])
    text += 'bones = ['+', '.join(bones)+']\n'
    (OUTPUT / f'{name}.tscn').write_text(text,encoding='utf-8')
    print(f'Compiled {name}: {len(vertices)} vertices, {len(triangles)} triangles (+{len(seams)} seam candidates)',flush=True)


def bind_rigs(manifest):
    for view, bindings in manifest['bindings'].items():
        path = ROOT / f'rigs/{view}-rig.tscn'
        text = path.read_text(encoding='utf-8')
        surface_ids = {match[1] for match in re.finditer(r'\[node name="Surface" parent="[^"]+" instance=ExtResource\("([^"]+)"\)\]',text)}
        text = re.sub(r'\[ext_resource type="PackedScene"[^\n]+id="([^"]+)"\]\n', lambda match: '' if match[1] in surface_ids else match[0], text)
        resources = ''.join(f'[ext_resource type="PackedScene" path="{RES}rigs/masked/{name}.tscn" id="mask_{name}"]\n' for name in sorted(set(bindings.values())))
        first = re.search(r'^\[(?:sub_resource|node) ',text,re.M).start()
        text = text[:first]+resources+'\n'+text[first:]
        for parent,name in bindings.items():
            pattern = r'(\[node name="Surface" parent="'+re.escape(parent)+r'" instance=ExtResource\(")[^"]+("\)\])'
            text,count = re.subn(pattern,lambda m:m[1]+'mask_'+name+m[2],text)
            if count != 1:
                raise ValueError(f'{view}/{parent}: expected exactly one explicit Surface binding, got {count}')
        path.write_text(re.sub(r'\n{3,}', '\n\n', text),encoding='utf-8')


def bake():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    OUTPUT.mkdir(parents=True,exist_ok=True)
    for name,profile in manifest['profiles'].items():
        compile_profile(name,profile)
    bind_rigs(manifest)


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in ('init','bake'):
        raise SystemExit('Usage: python deformation_masks.py init|bake')
    (initialize if sys.argv[1] == 'init' else bake)()
