"""Author calibrated native rigs, foot masks and fixed-length leg keyframes."""
import json
import math
import re
from pathlib import Path
from PIL import Image, ImageDraw
from deformation_masks import ROOT, MASKS, MANIFEST, BONES, PALETTE, PATHS, PARENTS

CALIBRATION = ROOT / 'rig-calibration.json'
PARENT_NAMES = {name: BONES[parent] if parent >= 0 else None for name, parent in zip(BONES, PARENTS)}
TERMINALS = {'Head': 'HeadTip', 'ForearmL': 'HandL', 'ForearmR': 'HandR', 'FootL': 'ToeL', 'FootR': 'ToeR'}
CLIPS = {'walk_loop': (1., True), 'run_loop': (2/3, True),
         'idle_to_walk': (.5, False), 'walk_to_idle': (.5, False),
         'walk_to_run': (.8, False), 'run_to_walk': (.8, False),
         'idle_to_run': (.5, False), 'run_to_idle': (.5, False)}
KEY_RATE = 120


def add(a, b):
    return tuple(x+y for x,y in zip(a,b))


def sub(a, b):
    return tuple(x-y for x,y in zip(a,b))


def mul(a, scalar):
    return tuple(x*scalar for x in a)


def dot(a, b):
    return sum(x*y for x,y in zip(a,b))


def normalized(a):
    return mul(a,1/math.sqrt(dot(a,a)))


def project(point, forward):
    return (point[0]+forward[0]*point[2],point[1]+forward[1]*point[2])


def rotate(a, angle):
    c, s = math.cos(angle), math.sin(angle)
    return (c*a[0]-s*a[1], s*a[0]+c*a[1])


def angle(a):
    return math.atan2(a[1], a[0])


def number(value):
    text = f'{value:.9f}'.rstrip('0').rstrip('.') or '0'
    # RESET establishes AnimationMixer's value type. Integer zero would
    # quantize rotation tracks to whole radians when blending native keys.
    return text if '.' in text else text+'.0'


def vector(point):
    return 'Vector2('+', '.join(number(v) for v in point)+')'


def local_rest(points, size):
    return {name: sub(points[name], points[parent] if parent else (size/2, size/2)) for name, parent in PARENT_NAMES.items()}


def calibrate_scene(view, points, size):
    path = ROOT / 'rigs' / f'{view}-rig.tscn'
    text = path.read_text(encoding='utf-8')
    local = local_rest(points, size)
    for name, bone_path in zip(BONES, PATHS):
        target = next((child for child, parent in PARENT_NAMES.items() if parent == name), TERMINALS.get(name))
        axis = sub(points[target], points[name])
        block = f'[node name="{name}" type="Bone2D" parent="Skeleton2D'+('/'+bone_path.rsplit('/', 1)[0] if '/' in bone_path else '')+'"]\n'
        p = local[name]
        block += f'position = {vector(p)}\nrest = Transform2D(1, 0, 0, 1, {number(p[0])}, {number(p[1])})\n'
        block += f'auto_calculate_length_and_angle = false\nlength = {number(math.hypot(*axis))}\nbone_angle = {number(math.degrees(angle(axis)))}\n'
        pattern = r'\[node name="'+name+r'" type="Bone2D"[^\n]*\n.*?(?=\n\[node|\Z)'
        if re.search(pattern, text, re.S):
            text = re.sub(pattern, lambda _: block, text, count=1, flags=re.S)
        else:
            text = text.replace('[node name="Layers"', block+'\n[node name="Layers"', 1)
        marker = TERMINALS.get(name)
        if marker:
            marker_block = f'[node name="{marker}" type="Marker2D" parent="Skeleton2D/{bone_path}"]\nposition = {vector(sub(points[marker], points[name]))}\n'
            marker_pattern = r'\[node name="'+marker+r'" type="Marker2D"[^\n]*\n.*?(?=\n\[node|\Z)'
            if re.search(marker_pattern, text, re.S):
                text = re.sub(marker_pattern, lambda _: marker_block, text, count=1, flags=re.S)
            else:
                text = text.replace('[node name="Layers"', marker_block+'\n[node name="Layers"', 1)
    path.write_text(text, encoding='utf-8')


def paint_feet(manifest, view, points):
    body_name = manifest['bindings'][view]['Layers/BodyBase']
    body_size = manifest['profiles'][body_name]['frame'][0]
    labels = Image.new('L', (body_size, body_size))
    for side in ('L', 'R'):
        ImageDraw.Draw(labels).polygon(points['foot_polygons'][side], fill=BONES.index('Foot'+side)+1)
    for profile, spec in manifest['profiles'].items():
        if spec['view'] != view or spec['head']:
            continue
        # Always paint onto the authored pre-foot masks. Moving or shrinking
        # a foot polygon must not leave ownership/bands from the previous run.
        owners = Image.open(MASKS/'calibration-source'/f'{profile}-owners.png').convert('RGB')
        rigid = Image.open(MASKS/'calibration-source'/f'{profile}-rigidity.png').convert('L')
        a,b,c,d,tx,ty = spec['transform']
        width,height = spec['frame']
        for y in range(height):
            for x in range(width):
                px,py = x+.5-width/2,y+.5-height/2
                bx,by = round(a*px+c*py+tx+body_size/2-.5),round(b*px+d*py+ty+body_size/2-.5)
                if not (0 <= bx < body_size and 0 <= by < body_size):
                    continue
                label = labels.getpixel((bx,by))
                if label:
                    owners.putpixel((x,y), PALETTE[label-1])
                    if rigid.getpixel((x,y)):
                        rigid.putpixel((x,y), 255)
        # A finite one-texel ankle band joins the calf and its own foot only.
        original = owners.copy()
        for y in range(height):
            for x in range(width):
                if not rigid.getpixel((x,y)):
                    continue
                owner = PALETTE.index(original.getpixel((x,y)))
                for side in ('L','R'):
                    pair = {BONES.index('Calf'+side), BONES.index('Foot'+side)}
                    if owner not in pair:
                        continue
                    if any(0 <= x+dx < width and 0 <= y+dy < height and PALETTE.index(original.getpixel((x+dx,y+dy))) in pair-{owner} for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]):
                        rigid.putpixel((x,y), 112)
        owners.save(MASKS/f'{profile}-owners.png')
        rigid.save(MASKS/f'{profile}-rigidity.png')
        print(f'Foot ownership and ankle bands: {profile}', flush=True)


def solve_knee(hip, ankle, rest_hip, rest_knee, rest_ankle, amount, side):
    upper = math.dist(rest_hip, rest_knee)
    lower = math.dist(rest_knee, rest_ankle)
    delta = sub(ankle, hip)
    distance = math.sqrt(dot(delta,delta))
    if not abs(upper-lower)+.0001 < distance <= upper+lower+.000001:
        raise ValueError(f'Unreachable ankle {side}: distance={distance}, lengths={upper},{lower}')
    direction = mul(delta, 1/distance)
    along = (upper*upper-lower*lower+distance*distance)/(2*distance)
    across = math.sqrt(max(0, upper*upper-along*along))
    rest_axis = normalized(sub(rest_ankle,rest_hip))
    rest_bend = sub(rest_knee,rest_hip)
    rest_bend = sub(rest_bend,mul(rest_axis,dot(rest_bend,rest_axis)))
    rest_bend = normalized(rest_bend) if dot(rest_bend,rest_bend) > .000001 else (0.,0.,1.)
    # Bend in forward depth, rather than sideways across the screen. Blend
    # from the source-art rest bend so idle transitions retain that exact pose.
    bend = add(mul(rest_bend,1-amount), (0.,0.,amount))
    bend = normalized(sub(bend,mul(direction,dot(bend,direction))))
    return add(add(hip,mul(direction,along)),mul(bend,across))


def gait(clip, time, duration):
    u = time/duration
    smooth = u*u*(3-2*u)
    if clip == 'walk_loop':
        return time, 1., 0.
    if clip == 'run_loop':
        return time*1.5, 1., 1.
    if clip == 'idle_to_walk':
        return time-.5, smooth, 0.
    if clip == 'walk_to_idle':
        return time, 1-smooth, 0.
    if clip == 'walk_to_run':
        return time+.25*time*time/duration, 1., smooth
    if clip == 'run_to_walk':
        return time*1.5-.25*time*time/duration, 1., 1-smooth
    if clip == 'idle_to_run':
        return -.375+1.5*time*time, smooth, 1.
    if clip == 'run_to_idle':
        return 1.5*time-1.5*time*time, 1-smooth, 1.
    raise ValueError(clip)


def pose(points, size, phase, amount, run):
    local = local_rest(points, size)
    result = {f'Skeleton2D/{path}:position': local[name] for name,path in zip(BONES,PATHS)}
    result.update({f'Skeleton2D/{path}:rotation': 0. for path in PATHS})
    stride = 2.5+1.3*run
    stance = .6-.22*run
    bob = (.10+.05*run)*math.cos(phase*math.tau*2)
    pelvis_shift = (0., amount*(.65+.25*run+bob))
    result['Skeleton2D/Pelvis:position'] = add(local['Pelvis'], pelvis_shift)
    for side in ('L','R'):
        step = (phase+(0 if side == 'L' else .5)) % 1.
        if step <= stance:
            travel = 1-2*step/stance
            lift, foot_rotation = 0., 0.
        else:
            swing = (step-stance)/(1-stance)
            eased = swing*swing*(3-2*swing)
            travel = -1+2*eased
            lift = (2.+2.*run)*math.sin(math.pi*swing)
            foot_rotation = -.20*math.sin(math.pi*swing)
        foot_rotation *= amount
        toe_offset = sub(points['Toe'+side], points['Foot'+side])
        toe_rest = points['Toe'+side]
        toe = (toe_rest[0],toe_rest[1]-lift*amount,stride*travel*amount)
        rotated_offset = rotate(toe_offset,foot_rotation)
        ankle = sub(toe,(*rotated_offset,0.))
        hip = (*add(points['Thigh'+side],pelvis_shift),0.)
        rest_hip,rest_knee,rest_ankle = [(*points[n+side],0.) for n in ('Thigh','Calf','Foot')]
        knee = solve_knee(hip,ankle,rest_hip,rest_knee,rest_ankle,amount,side)
        for name,point in [('Thigh',hip),('Calf',knee),('Foot',ankle)]:
            result['depth/'+name+side] = point[2]
        hip,knee,ankle = [project(point,points['forward']) for point in (hip,knee,ankle)]
        thigh_rotation = angle(sub(knee,hip))-angle(sub(points['Calf'+side],points['Thigh'+side]))
        calf_rotation = angle(sub(ankle,knee))-angle(sub(points['Foot'+side],points['Calf'+side]))
        leg = 'Skeleton2D/'+PATHS[BONES.index('Thigh'+side)]
        calf = leg+'/Calf'+side
        result[leg+':rotation'] = thigh_rotation
        result[calf+':position'] = rotate(sub(knee,hip),-thigh_rotation)
        result[calf+':rotation'] = calf_rotation-thigh_rotation
        result[calf+'/Foot'+side+':position'] = rotate(sub(ankle,knee),-calf_rotation)
        result[calf+'/Foot'+side+':rotation'] = foot_rotation-calf_rotation
        arm = 'Skeleton2D/'+PATHS[BONES.index('Arm'+side)]
        result[arm+':rotation'] = amount*(.045+.025*run)*math.sin(math.tau*step)
    return result


def write_animation(path, name, duration, loop, poses):
    text = '[gd_resource type="Animation" format=3]\n\n[resource]\n'
    text += f'resource_name = "{name}"\nlength = {number(duration)}\nloop_mode = {1 if loop else 0}\nstep = {number(1/KEY_RATE)}\n'
    times = ', '.join(number(t) for t,_ in poses)
    depths = [key for key in poses[0][1] if key.startswith('depth/')]
    for index, track_path in enumerate(key for key in poses[0][1] if not key.startswith('depth/')):
        values = ', '.join(vector(p[track_path]) if isinstance(p[track_path],tuple) else number(p[track_path]) for _,p in poses)
        text += f'tracks/{index}/type = "value"\ntracks/{index}/path = NodePath("{track_path}")\ntracks/{index}/interp = 1\ntracks/{index}/enabled = true\n'
        text += f'tracks/{index}/keys = {{"times": PackedFloat32Array({times}), "transitions": PackedFloat32Array({", ".join("1" for _ in poses)}), "update": 0, "values": [{values}]}}\n'
    if depths:
        text += 'metadata/leg_depths = {'+', '.join('"'+key.split('/')[1]+'": PackedFloat32Array('+', '.join(number(p[key]) for _,p in poses)+')' for key in depths)+'}\n'
    path.write_text(text,encoding='utf-8')


def author_animations(view, points, size):
    library = ROOT/'animations'/('skeletal-library.tres' if view == 'south' else f'skeletal-library-{view}.tres')
    resources = dict(re.findall(r'path="res://([^\"]+)" id="([^\"]+)"',library.read_text()))
    by_id = {resource_id: ROOT.parents[1]/path for path,resource_id in resources.items()}
    bindings = dict(re.findall(r'&"([^\"]+)": ExtResource\("([^\"]+)"\)',library.read_text()))
    rest = local_rest(points,size)
    idle = {f'Skeleton2D/{p}:position':rest[n] for n,p in zip(BONES,PATHS)}
    idle.update({f'Skeleton2D/{p}:rotation':0. for p in PATHS})
    write_animation(by_id[bindings['RESET']], 'RESET', .001, False, [(0.,idle)])
    for clip,(duration,loop) in CLIPS.items():
        poses = []
        count = round(duration*KEY_RATE)
        for frame in range(count+1):
            time = duration*frame/count
            sample = pose(points,size,*gait(clip,time,duration))
            if poses:
                for key in sample:
                    if key.endswith(':rotation'):
                        previous = poses[-1][1][key]
                        sample[key] = previous+(sample[key]-previous+math.pi)%math.tau-math.pi
            poses.append((time,sample))
        write_animation(by_id[bindings[clip]], clip, duration, loop, poses)
    print(f'Calibrated rest and 8 leg clips: {view}',flush=True)


def build():
    calibration = json.loads(CALIBRATION.read_text())['views']
    manifest = json.loads(MANIFEST.read_text())
    for name in ('FootL','FootR'):
        manifest['bones'][name] = PALETTE[BONES.index(name)]
    MANIFEST.write_text(json.dumps(manifest,indent=2)+'\n')
    for view,points in calibration.items():
        profile = manifest['bindings'][view]['Layers/BodyBase']
        size = manifest['profiles'][profile]['frame'][0]
        calibrate_scene(view,points,size)
        paint_feet(manifest,view,points)
        author_animations(view,points,size)


if __name__ == '__main__':
    build()
