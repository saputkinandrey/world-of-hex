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
MOTION_BRIDGE_TRIANGLES = [(0,1,2),(0,2,3),(0,1,3),(1,2,3)]
GARMENT_SLEEVE_LINKS = {frozenset((BONES.index('Spine'), BONES.index(arm))) for arm in ['ArmL','ArmR']}
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
DRAW_ORDER = {
    'south': ['ThighL','CalfL','ThighR','CalfR','Pelvis','Spine','Chest','Head','ArmL','ForearmL','ArmR','ForearmR'],
    'north': ['ThighL','CalfL','ThighR','CalfR','Pelvis','Spine','Chest','Head','ArmL','ForearmL','ArmR','ForearmR'],
    'south-west': ['ArmL','ForearmL','ThighL','CalfL','ThighR','CalfR','Pelvis','Spine','Chest','Head','ArmR','ForearmR'],
    'north-west': ['ArmR','ForearmR','ThighR','CalfR','ThighL','CalfL','Pelvis','Spine','Chest','Head','ArmL','ForearmL'],
}


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


def compile_profile(name, profile, body_profile):
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

    regions, links = [], []
    region_image = Image.new('RGBA', (width,height))
    region_colors = [(0,0,0,0),(216,80,80,255),(60,190,100,255),(65,135,240,255)]
    for y in range(height):
        for x in range(width):
            owner, strength = cell(x,y)
            kind, child = (1 if strength else 0), 255
            if 0 < strength < 255:
                candidates = []
                for dy in range(-2,3):
                    for dx in range(-2,3):
                        other, amount = cell(x+dx,y+dy)
                        if amount and other != owner and connected(owner,other):
                            candidates.append((dx*dx+dy*dy, other if PARENTS[other] == owner else owner))
                if candidates:
                    kind, child = 2, min(candidates)[1]
            if kind == 1 and any(cell(x+dx,y+dy)[1] == 0 for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]):
                kind = 3
            regions.append(owner*4+kind)
            links.append(child)
            region_image.putpixel((x,y), region_colors[kind])
    region_image.save(MASKS/f'{name}-regions.png')

    def joined(a,b):
        return connected(a,b) or (not body_profile and frozenset((a,b)) in GARMENT_SLEEVE_LINKS)

    @lru_cache(None)
    def chart(x,y,cx,cy):
        positions = [(x-1,y-1),(x,y-1),(x,y),(x-1,y)]
        start = positions.index((cx,cy))
        selected, queue = {start}, [start]
        while queue:
            index = queue.pop()
            for other in [(index-1)%4,(index+1)%4]:
                if other not in selected and joined(cell(*positions[index])[0],cell(*positions[other])[0]):
                    selected.add(other)
                    queue.append(other)
        return tuple(sorted({cell(*positions[index])[0] for index in selected}))

    @lru_cache(None)
    def field(x,y,region):
        around = [pair for pair in [cell(x-1,y-1),cell(x,y-1),cell(x-1,y),cell(x,y)] if pair[0] in region]
        hard = {owner for owner, value in around if value == 255}
        if len(hard) == 1:
            return ((next(iter(hard)),1.0),)
        main = Counter(owner for owner,value in around).most_common(1)[0][0]
        counts = Counter()
        for dy in range(-2,3):
            for dx in range(-2,3):
                owner, _ = cell(x+dx,y+dy)
                if owner in region:
                    counts[owner] += 1/(1+dx*dx+dy*dy)
        total = sum(counts.values())
        strength = sum(value for owner,value in around)/(4*255)
        result = dict((bone,(1-strength)*value/total) for bone,value in counts.items())
        result[main] = result.get(main,0)+strength
        selected = sorted(result.items(),key=lambda p:p[1],reverse=True)[:4]
        total = sum(value for bone,value in selected)
        return tuple(sorted((bone,round(value/total,8)) for bone,value in selected if value > .00000001))

    vertices, weights, lookup, triangles = [], [], {}, []
    def vertex(x,y,influences,region):
        key = (x,y,influences,region)
        if key not in lookup:
            lookup[key] = len(vertices)
            vertices.append((x-width/2,y-height/2))
            weights.append(dict(influences))
        return lookup[key]
    for x,y in [(0,0),(width,0),(width,height),(0,height)]:
        region = chart(x,y,min(x,width-1),min(y,height-1))
        vertex(x,y,field(x,y,region),region)
    for y in range(height):
        for x in range(width):
            owner, strength = cell(x,y)
            corners = [(x,y),(x+1,y),(x+1,y+1),(x,y+1)]
            indices = []
            for px,py in corners:
                region = chart(px,py,x,y)
                # Preserve painted rim weights: automatic Skin relaxation made
                # a visible comb at SW run .5 (see V1.3-WORKFLOW.md).
                influences = ((owner,1.0),) if strength == 255 else field(px,py,region)
                indices.append(vertex(px,py,influences,region))
            triangles.extend([(indices[0],indices[1],indices[2]), (indices[0],indices[2],indices[3])])
    # Flexible bands share actual textured vertices. No zero-area UV skirts:
    # unrelated touching parts remain separate instead of extruding a texel.
    ranks = {BONES.index(bone): rank for rank,bone in enumerate(DRAW_ORDER[profile['view']])}
    order = sorted(range(len(triangles)), key=lambda index: ranks[owners[index//2]])
    cell_triangles = [0]*len(triangles)
    for destination,source in enumerate(order):
        cell_triangles[source] = destination
    triangles = [triangles[index] for index in order]
    # Rigid margins overlap the finite elastic band. The band is revealed
    # between these margins when chunks separate, and covered on compression.
    overlap_start = len(vertices)
    overlap_cells, overlap_polygons = [], []
    for cell_index, region_kind in enumerate(regions):
        if region_kind % 4 != 2:
            continue
        x,y = cell_index % width, cell_index // width
        owner = owners[cell_index]
        corners = [(x,y),(x+1,y),(x+1,y+1),(x,y+1)]
        indices = [vertex(px,py,((owner,1.0),),('overlap',cell_index)) for px,py in corners]
        overlap_cells.append(cell_index)
        overlap_polygons.extend([(indices[0],indices[1],indices[2]),(indices[0],indices[2],indices[3])])
    bridge_start = len(vertices)
    bridge_polygons, bridge_owners = [], []
    reveal_hands, reveal_points = [], []
    bridge_uv = {}
    motion_path = MASKS/'motion-bridges.json'
    measured = json.loads(motion_path.read_text())['profiles'].get(name,[]) if motion_path.exists() else []
    for index, edge in enumerate(measured):
        envelope = edge.get('type') == 'joint_envelope'
        calf_fill = edge.get('type') == 'calf_fill'
        a,b = edge['a'],edge['b']
        if envelope:
            corners = [tuple(p) for p in edge['geometry']]
            left,top = corners[0]
            right,bottom = corners[2]
            sx,sy,uw,uh = edge['uv_rect']
            uv_corners = [(sx,sy),(sx+uw,sy),(sx+uw,sy+uh),(sx,sy+uh)]
            cells = [(corners[0][0],corners[0][1]),(corners[1][0]-1,corners[1][1]),(corners[2][0]-1,corners[2][1]-1),(corners[3][0],corners[3][1]-1)]
        elif calf_fill:
            left,top = edge['x'],edge['y']
            right,bottom = left+1,top+1
            corners = [(left,top),(right,top),(right,bottom),(left,bottom)]
            sx,sy = edge['sample_x'],edge['sample_y']
            uv_corners = [(sx,sy),(sx+1,sy),(sx+1,sy+1),(sx,sy+1)]
            cells = [(left,top)]*4
        else:
            x,y,dx,dy,depth = (edge[key] for key in ['x','y','dx','dy','depth'])
            left,top = x-(depth-1)*dx,y-(depth-1)*dy
            right,bottom = x+1+depth*dx,y+1+depth*dy
            corners = [(left,top),(right,top),(right,bottom),(left,bottom)]
            uv_corners = corners
            cells = [(left,top),(right-1,top),(right-1,bottom-1),(left,bottom-1)]
        reveal_hands.append(edge.get('driver',b))
        reveal_points.append(((left+right)/2-width/2,(top+bottom)/2-height/2))
        influences_at_corner = []
        for (px,py),(cx,cy) in zip(corners,cells):
            owner,strength = cell(cx,cy)
            influences = ((a,1.0),) if calf_fill else (((owner,1.0),) if strength == 255 else field(px,py,chart(px,py,cx,cy)))
            influences_at_corner.append(influences)
        # All four triangles cover the moving convex envelope. A paired UV
        # winding lets the shader reject the folded mapping, never the gap.
        for triangle_index, triangle in enumerate(MOTION_BRIDGE_TRIANGLES):
            for reverse_uv in [False,True]:
                uv_order = (triangle[0],triangle[2],triangle[1]) if reverse_uv else triangle
                ids = []
                for corner, uv_corner in zip(triangle,uv_order):
                    px,py = corners[corner]
                    vertex_id = vertex(px,py,influences_at_corner[corner],('motion_bridge',index,triangle_index,reverse_uv))
                    ids.append(vertex_id)
                    bridge_uv[vertex_id] = uv_corners[uv_corner]
                bridge_polygons.append(tuple(ids))
        bridge_owners.extend([a,b])
    def number(value):
        return str(round(value,8))
    text = '[gd_scene format=3]\n\n[ext_resource type="Script" path="'+RES+'skin-surface.gd" id="1"]\n'
    text += '[ext_resource type="Shader" path="'+RES+'region-composition.gdshader" id="composition"]\n\n[sub_resource type="ShaderMaterial" id="CompositionMaterial"]\nresource_local_to_scene = true\nshader = ExtResource("composition")\n\n'
    text += '[node name="Surface" type="Polygon2D"]\nscript = ExtResource("1")\nmaterial = SubResource("CompositionMaterial")\nz_as_relative = false\ntexture_filter = 1\nskeleton = NodePath("../../../Skeleton2D")\n'
    text += f'rigidity_mask_path = "{RES}masks/{name}-rigidity.png"\nownership_mask_path = "{RES}masks/{name}-owners.png"\n'
    text += 'polygon = PackedVector2Array('+', '.join(number(v) for point in vertices for v in point)+')\n'
    text += 'uv = PackedVector2Array('+', '.join(number(v) for index,(x,y) in enumerate(vertices) for v in bridge_uv.get(index,(x+width/2,y+height/2)))+')\n'
    text += f'internal_vertex_count = {len(vertices)-4}\nmetadata/frame_size = Vector2i({width}, {height})\nmetadata/mask_profile = "{name}"\n'
    text += 'metadata/cell_triangle_indices = PackedInt32Array('+', '.join(map(str,cell_triangles))+')\n'
    text += 'metadata/cell_regions = PackedByteArray('+', '.join(map(str,regions))+')\n'
    text += 'metadata/cell_ligament_child = PackedByteArray('+', '.join(map(str,links))+')\n'
    text += f'metadata/flesh_overlap_vertex_start = {overlap_start}\n'
    text += 'metadata/flesh_overlap_cells = PackedInt32Array('+', '.join(map(str,overlap_cells))+')\n'
    text += 'metadata/flesh_overlap_polygons = ['+', '.join('PackedInt32Array('+', '.join(map(str,t))+')' for t in overlap_polygons)+']\n'
    text += f'metadata/motion_bridge_vertex_start = {bridge_start}\n'
    text += 'metadata/motion_bridge_owners = PackedByteArray('+', '.join(map(str,bridge_owners))+')\n'
    text += 'metadata/motion_bridge_polygons = ['+', '.join('PackedInt32Array('+', '.join(map(str,t))+')' for t in bridge_polygons)+']\n'
    text += 'metadata/motion_reveal_hands = PackedInt32Array('+', '.join(map(str,reveal_hands))+')\n'
    text += 'metadata/motion_reveal_points = PackedVector2Array('+', '.join(number(v) for point in reveal_points for v in point)+')\n'
    text += 'polygons = ['+', '.join('PackedInt32Array('+', '.join(map(str, t))+')' for t in triangles)+']\n'
    bones = []
    for bone,path in enumerate(PATHS):
        bones.extend(['"'+path+'"','PackedFloat32Array('+', '.join(number(w.get(bone,0)) for w in weights)+')'])
    text += 'bones = ['+', '.join(bones)+']\n'
    destination = OUTPUT / f'{name}.tscn'
    temporary = destination.with_suffix('.tscn.tmp')
    temporary.write_text(text,encoding='utf-8')
    temporary.replace(destination)
    print(f'Compiled {name}: {len(vertices)} vertices, {len(triangles)} textured triangles',flush=True)


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
        compile_profile(name,profile,name == manifest['bindings'][profile['view']]['Layers/BodyBase'])
    bind_rigs(manifest)


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in ('init','bake'):
        raise SystemExit('Usage: python deformation_masks.py init|bake')
    (initialize if sys.argv[1] == 'init' else bake)()
