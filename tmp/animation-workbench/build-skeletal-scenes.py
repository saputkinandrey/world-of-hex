from pathlib import Path
import math
import json

ROOT = Path(__file__).resolve().parents[2] / 'godot/modules/character-animation-workbench'
RIG = ROOT / 'rigs'
RIG.mkdir(exist_ok=True)

# Initial front-view anatomy in pixels relative to the centre of the 110px frame.
BONES = [
    ('Pelvis', '', (0, 25), 15, -math.pi/2),
    ('Spine', 'Pelvis', (0, -20), 20, -math.pi/2),
    ('Chest', 'Pelvis/Spine', (0, -20), 12, -math.pi/2),
    ('Head', 'Pelvis/Spine/Chest', (0, -12), 15, -math.pi/2),
    ('ArmL', 'Pelvis/Spine/Chest', (-23, 2), 20, math.pi/2),
    ('ForearmL', 'Pelvis/Spine/Chest/ArmL', (-4, 20), 17, math.pi/2),
    ('ArmR', 'Pelvis/Spine/Chest', (23, 2), 20, math.pi/2),
    ('ForearmR', 'Pelvis/Spine/Chest/ArmR', (4, 20), 17, math.pi/2),
    ('ThighL', 'Pelvis', (-10, 4), 13, math.pi/2),
    ('CalfL', 'Pelvis/ThighL', (0, 13), 12, math.pi/2),
    ('ThighR', 'Pelvis', (10, 4), 13, math.pi/2),
    ('CalfR', 'Pelvis/ThighR', (0, 13), 12, math.pi/2),
]

def smooth(a, b, value):
    t = min(1, max(0, (value-a)/(b-a)))
    return t*t*(3-2*t)

def weights(x, y):
    result = {name: 0.0 for name, *_ in BONES}
    if y >= 20:
        leg = smooth(20, 34, y)
        knee = smooth(33, 45, y)
        side = 'L' if x < 0 else 'R'
        result['Pelvis'] = 1-leg
        result['Thigh'+side] = leg*(1-knee)
        result['Calf'+side] = leg*knee
    else:
        head = smooth(-17, -28, y)
        chest = smooth(15, -13, y)
        result['Spine'] = 1-chest
        result['Chest'] = chest*(1-head)
        result['Head'] = chest*head
    arm = smooth(15, 25, abs(x))*(1-smooth(26, 34, y))*(1-smooth(-15, -24, y))
    elbow = smooth(-2, 17, y)
    side = 'L' if x < 0 else 'R'
    result = {key: value*(1-arm) for key,value in result.items()}
    result['Arm'+side] = arm*(1-elbow)
    result['Forearm'+side] = arm*elbow
    active = sorted(result, key=result.get, reverse=True)[:4]
    total = sum(result[k] for k in active)
    return {k: (v/total if k in active else 0) for k, v in result.items()}

def number(n):
    return str(round(n, 7))

def grid(size=110, divisions=22):
    width, height = size if isinstance(size, (tuple, list)) else (size, size)
    coords = [(x, y) for y in range(divisions+1) for x in range(divisions+1)]
    perimeter = [(x, 0) for x in range(divisions+1)] + [(divisions,y) for y in range(1,divisions+1)] + [(x,divisions) for x in range(divisions-1,-1,-1)] + [(0,y) for y in range(divisions-1,0,-1)]
    ordered = perimeter+[p for p in coords if p not in perimeter]
    lookup = {p:i for i,p in enumerate(ordered)}
    vertices = [(x*width/divisions-width/2, y*height/divisions-height/2) for x,y in ordered]
    triangles = []
    for y in range(divisions):
        for x in range(divisions):
            a,b,c,d = [lookup[p] for p in [(x,y),(x+1,y),(x+1,y+1),(x,y+1)]]
            triangles.extend([(a,b,c),(a,c,d)])
    return vertices, triangles, len(ordered)-len(perimeter)

def build_rig(direction, layout):
    size = int(layout['size'])
    vertices, triangles, internal = grid(size)
    name = ['south', 'north', 'south-west', 'north-west'][direction]
    surfaces = {}
    for slot, registration in layout['layers'].items():
        if slot not in ['weapon', 'weapon_secondary']:
            dimensions = layout['sizes'][slot]
            key = tuple(round(v, 5) for v in registration)+tuple(dimensions)
            if key not in surfaces:
                vertices, triangles, internal = grid(dimensions)
                surface_name = f'{name}-surface-{len(surfaces)}'
                text = '[gd_scene format=3]\n\n[ext_resource type="Script" path="res://modules/character-animation-workbench/skin-surface.gd" id="1"]\n\n[node name="Surface" type="Polygon2D"]\nscript = ExtResource("1")\nz_as_relative = false\nskeleton = NodePath("../../../Skeleton2D")\n'
                text += 'polygon = PackedVector2Array('+', '.join(number(n) for p in vertices for n in p)+')\n'
                text += 'uv = PackedVector2Array('+', '.join(number(n) for x,y in vertices for n in (x+dimensions[0]/2,y+dimensions[1]/2))+')\n'
                text += f'internal_vertex_count = {internal}\n'
                text += f'metadata/frame_size = Vector2i({int(dimensions[0])}, {int(dimensions[1])})\n'
                text += 'polygons = ['+', '.join('PackedInt32Array('+', '.join(map(str,t))+')' for t in triangles)+']\n'
                a,b,c,d,tx,ty = registration
                w = [weights((a*x+c*y+tx)/(0.65 if direction >= 2 else 1), b*x+d*y+ty) for x,y in vertices]
                bones = []
                for bone,parent,*_ in BONES:
                    path = parent+'/'+bone if parent else bone
                    bones.extend(['"'+path+'"', 'PackedFloat32Array('+', '.join(number(v[bone]) for v in w)+')'])
                text += 'bones = ['+', '.join(bones)+']\n'
                (RIG/f'{surface_name}.tscn').write_text(text, encoding='utf-8')
                surfaces[key] = surface_name
    text = '''[gd_scene format=3]

[ext_resource type="Script" path="res://modules/character-animation-workbench/skinned-rig.gd" id="1"]
[ext_resource type="Script" path="res://modules/character-animation-workbench/skin-overlay.gd" id="2"]
[ext_resource type="AnimationLibrary" path="res://modules/character-animation-workbench/animations/skeletal-library.tres" id="3"]
[ext_resource type="Script" path="res://modules/character-animation-workbench/module-pivot.gd" id="4"]
'''
    if direction:
        text = text.replace('animations/skeletal-library.tres', f'animations/skeletal-library-{name}.tres')
    for surface_name in surfaces.values():
        text += f'[ext_resource type="PackedScene" path="res://modules/character-animation-workbench/rigs/{surface_name}.tscn" id="{surface_name}"]\n'
    text += f'\n[node name="Rig" type="Node2D"]\nscript = ExtResource("1")\nauthored_direction = {direction}\nframe_size = Vector2i({size}, {size})\nsnapshot_key = "Saved source:0:{direction}"\n\n[node name="Skeleton2D" type="Skeleton2D" parent="."]\n'
    for bone,parent,pos,length,angle in BONES:
        if direction >= 2:
            pos = (round(pos[0]*.65, 3), pos[1])
        parent_path = 'Skeleton2D'+('/'+parent if parent else '')
        text += f'''\n[node name="{bone}" type="Bone2D" parent="{parent_path}"]
position = Vector2{pos}
rest = Transform2D(1, 0, 0, 1, {pos[0]}, {pos[1]})
auto_calculate_length_and_angle = false
length = {length}
bone_angle = {math.degrees(angle)}
'''
    text += '\n[node name="Layers" type="Node2D" parent="."]\n'
    slots = ['body','boots','pants','shirts','armor','beard','mustache','sideburns','eyes','eyebrows','eye_bandage','hair','headwear','head_bandage','weapon','weapon_secondary']
    for slot in slots:
        node = ''.join(s.title() for s in slot.split('_'))+'Base'
        registration = layout['layers'][slot]
        transform = 'Transform2D('+', '.join(map(number, registration))+')'
        text += f'\n[node name="{node}" type="Node2D" parent="Layers"]\nmetadata/slot = "{slot}"\nmetadata/registration = {transform}\n'
        if slot in ['weapon','weapon_secondary']:
            text += 'script = ExtResource("4")\n'
            text += f'\n[node name="PivotOrigin" type="Node2D" parent="Layers/{node}"]\n\n[node name="MotionPivot" type="Node2D" parent="Layers/{node}/PivotOrigin" groups=["skeletal_weapon_motion"]]\n\n[node name="CounterPivot" type="Node2D" parent="Layers/{node}/PivotOrigin/MotionPivot"]\n\n[node name="Surface" type="Sprite2D" parent="Layers/{node}/PivotOrigin/MotionPivot/CounterPivot"]\nz_as_relative = false\n'
        else:
            surface_name = surfaces[tuple(round(v, 5) for v in registration)+tuple(layout['sizes'][slot])]
            text += f'\n[node name="Surface" parent="Layers/{node}" instance=ExtResource("{surface_name}")]\n'
    text += '''
[node name="Overlay" type="Node2D" parent="."]
z_index = 1000
script = ExtResource("2")

[node name="AnimationPlayer" type="AnimationPlayer" parent="."]
libraries = {&"": ExtResource("3")}
'''
    (RIG/f'{name}-rig.tscn').write_text(text, encoding='utf-8')

def animation(name, tracks, length=2, loop=1):
    text = f'[gd_resource type="Animation" format=3]\n\n[resource]\nresource_name = "{name}"\nlength = {length}\nloop_mode = {loop}\n'
    for i,(path,times,values) in enumerate(tracks):
        text += f'''tracks/{i}/type = "value"
tracks/{i}/path = NodePath("{path}")
tracks/{i}/interp = 1
tracks/{i}/enabled = true
tracks/{i}/keys = {{"times": PackedFloat32Array({', '.join(map(str,times))}), "transitions": PackedFloat32Array({', '.join('1' for _ in times)}), "update": 0, "values": [{', '.join(map(str,values))}]}}
'''
    (ROOT/'animations'/f'{name}.tres').write_text(text, encoding='utf-8')

animation('rig_lean', [
    ('Skeleton2D/Pelvis/Spine:rotation',[0,1,2],[0,0.12,0]),
    ('Skeleton2D/Pelvis/Spine/Chest:rotation',[0,1,2],[0,0.04,0]),
    ('Skeleton2D/Pelvis/Spine/Chest/ArmL/ForearmL:rotation',[0,1,2],[0,0.18,0]),
])
for direction, view in enumerate(['south','north','south-west','north-west']):
    reset = []
    for name,parent,pos,*_ in BONES:
        if direction >= 2:
            pos = (round(pos[0]*.65,3),pos[1])
        path = 'Skeleton2D/'+(parent+'/' if parent else '')+name
        for prop,value in [('position',f'Vector2{pos}'),('rotation','0.0'),('scale','Vector2(1, 1)')]:
            reset.append((path+':'+prop,[0],[value]))
    for weapon in ['WeaponBase','WeaponSecondaryBase']:
        path = 'Layers/'+weapon+'/PivotOrigin/MotionPivot'
        for prop,value in [('position','Vector2(0, 0)'),('rotation','0.0'),('scale','Vector2(1, 1)')]:
            reset.append((path+':'+prop,[0],[value]))
    animation('rig_reset_'+view, reset, .001, 0)
    file = 'skeletal-library'+('-'+view if direction else '')+'.tres'
    (ROOT/'animations'/file).write_text(f'''[gd_resource type="AnimationLibrary" format=3]
[ext_resource type="Animation" path="res://modules/character-animation-workbench/animations/rig_lean.tres" id="1"]
[ext_resource type="Animation" path="res://modules/character-animation-workbench/animations/rig_reset_{view}.tres" id="2"]
[resource]
_data = {{&"rig_lean": ExtResource("1"), &"RESET": ExtResource("2")}}
''', encoding='utf-8')
layouts = json.loads((Path(__file__).parent/'rig-layouts.json').read_text(encoding='utf-8-sig'))
for direction in range(4):
    build_rig(direction, layouts[str(direction)])

ui = (ROOT/'character-animation-workbench.tscn').read_text(encoding='utf-8').split('[node name="UI"', 1)[1]
text = '[gd_scene format=3]\n\n[ext_resource type="Script" path="res://modules/character-animation-workbench/skeletal-workbench.gd" id="1"]\n[ext_resource type="AnimationLibrary" path="res://modules/character-animation-workbench/animations/skeletal-library.tres" id="2"]\n'
names = ['South','North','SouthWest','NorthWest']
for i, name in enumerate(['south','north','south-west','north-west']):
    text += f'[ext_resource type="PackedScene" path="res://modules/character-animation-workbench/rigs/{name}-rig.tscn" id="{i+3}"]\n'
text += '\n[node name="SkeletalAnimationWorkbench" type="Node2D"]\nscript = ExtResource("1")\n\n[node name="Preview" type="Node2D" parent="."]\nposition = Vector2(900, 620)\n\n[node name="Mirror" type="Node2D" parent="Preview"]\n'
for i,name in enumerate(names):
    text += f'\n[node name="{name}" parent="Preview/Mirror" instance=ExtResource("{i+3}")]\nvisible = false\n'
text += '\n[node name="AnimationPlayer" type="AnimationPlayer" parent="."]\nroot_node = NodePath("../Preview/Mirror/South")\nlibraries = {&"": ExtResource("2")}\n\n[node name="UI"'+ui
text = text.replace('SPRITE ANIMATION', 'SKELETAL ANIMATION').replace('Keyframe workbench','Mesh deformation v1.1').replace('Author keys in AnimationPlayer.', 'Key bones in AnimationPlayer.')
text += '\n[node name="MeshOverlay" type="CheckButton" parent="UI/Panel/Margin/Controls"]\nlayout_mode = 2\ntext = "Mesh / bones overlay"\n\n[connection signal="toggled" from="UI/Panel/Margin/Controls/MeshOverlay" to="." method="_on_mesh_toggled"]\n'
for name in names:
    text += f'\n[editable path="Preview/Mirror/{name}"]\n'
if not (ROOT/'skeletal-animation-workbench.tscn').exists():
    (ROOT/'skeletal-animation-workbench.tscn').write_text(text, encoding='utf-8')
