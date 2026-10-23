"""Resolve authored native pose resources into ordinary Bone2D key resources."""
import json
import math
from pathlib import Path
from calibrate_rig import (ROOT, MASKS, MANIFEST, BONES, PATHS, local_rest, add, sub,
                          rotate, angle, project, solve_knee, write_animation, number)

UPPER = ('Spine','Chest','Head','ArmL','ForearmL','ArmR','ForearmR')


def resolve_pose(points, size, channels, design, view):
    rest = local_rest(points,size)
    result = {f'Skeleton2D/{path}:position':rest[name] for name,path in zip(BONES,PATHS)}
    result.update({f'Skeleton2D/{path}:rotation':0. for path in PATHS})
    run, amount = channels['Gait:position']
    gain = design['profiles'][view]
    bounce = design['walk_bounce']+(design['amplitude']-design['walk_bounce'])*run
    baseline = design['walk_baseline']+(design['run_baseline']-design['walk_baseline'])*run
    pelvis = channels['Pelvis:position']
    pelvis_shift = (pelvis[0]*gain[2],amount*(baseline+bounce*pelvis[1]))
    root_rotation = channels.get('Pelvis:rotation',0.)
    result['Skeleton2D/Pelvis:position'] = add(rest['Pelvis'],pelvis_shift)
    result['Skeleton2D/Pelvis:rotation'] = root_rotation
    for name in UPPER:
        path = 'Skeleton2D/'+PATHS[BONES.index(name)]
        result[path+':rotation'] = channels.get(name+':rotation',0.)
        result[path+':position'] = add(rest[name],tuple(value*gain[2] for value in channels.get(name+':position',(0.,0.))))
    for side in ('L','R'):
        target = channels['Foot'+side+':position']
        foot_rotation = channels['Foot'+side+':rotation']
        toe_offset = rotate(sub(points['Toe'+side],points['Foot'+side]),foot_rotation)
        toe = (points['Toe'+side][0],points['Toe'+side][1]+target[1]*gain[1],target[0]*gain[0])
        ankle = sub(toe,(*toe_offset,0.))
        hip_offset = rotate(sub(points['Thigh'+side],points['Pelvis']),root_rotation)
        hip = (*add(add(points['Pelvis'],pelvis_shift),hip_offset),0.)
        rest_hip,rest_knee,rest_ankle = [(*points[name+side],0.) for name in ('Thigh','Calf','Foot')]
        knee = solve_knee(hip,ankle,rest_hip,rest_knee,rest_ankle,amount,side)
        for name,point in [('Thigh',hip),('Calf',knee),('Foot',ankle)]:
            result['depth/'+name+side] = point[2]
        hip,knee,ankle = [project(point,points['forward']) for point in (hip,knee,ankle)]
        thigh_rotation = angle(sub(knee,hip))-angle(sub(points['Calf'+side],points['Thigh'+side]))
        calf_rotation = angle(sub(ankle,knee))-angle(sub(points['Foot'+side],points['Calf'+side]))
        leg = 'Skeleton2D/'+PATHS[BONES.index('Thigh'+side)]
        calf = leg+'/Calf'+side
        result[leg+':rotation'] = thigh_rotation-root_rotation
        result[calf+':position'] = rotate(sub(knee,hip),-thigh_rotation)
        result[calf+':rotation'] = calf_rotation-thigh_rotation
        result[calf+'/Foot'+side+':position'] = rotate(sub(ankle,knee),-calf_rotation)
        result[calf+'/Foot'+side+':rotation'] = foot_rotation-calf_rotation
    return result


def unwrap(poses):
    for index in range(1,len(poses)):
        for key,value in poses[index][1].items():
            if key.endswith(':rotation'):
                previous = poses[index-1][1][key]
                poses[index][1][key] = previous+(value-previous+math.pi)%math.tau-math.pi


def write_set(view, points, size):
    library = 'skeletal-library'+('' if view == 'south' else '-'+view)+'.tres'
    text = '[gd_resource type="Resource" format=3]\n'
    text += '[ext_resource type="Script" path="res://modules/character-animation-workbench/bone-animation-set.gd" id="1"]\n'
    text += f'[ext_resource type="AnimationLibrary" path="res://modules/character-animation-workbench/animations/{library}" id="2"]\n'
    text += '[resource]\nscript = ExtResource("1")\nlibrary = ExtResource("2")\nreference_rest = Dictionary[StringName, Transform2D]({'
    text += ', '.join('&"'+name+'": Transform2D(1,0,0,1,'+','.join(number(v) for v in position)+')' for name,position in local_rest(points,size).items())+'})\n'
    (ROOT/'animations'/f'bone-set-{view}.tres').write_text(text)


def compile_all():
    designs = json.loads((ROOT.parents[2]/'tmp/animation-workbench/motion-design-samples.json').read_text())
    calibration = json.loads((ROOT/'rig-calibration.json').read_text())['views']
    manifest = json.loads(MANIFEST.read_text())
    for design in designs:
        main = design['main']
        base = ROOT/'animations' if main else ROOT.parents[2]/f'tmp/animation-workbench/bounce-{int(design["amplitude"])}'
        for view,points in calibration.items():
            folder = base/('' if view == 'south' and main else view)
            folder.mkdir(parents=True,exist_ok=True)
            size = manifest['profiles'][manifest['bindings'][view]['Layers/BodyBase']]['frame'][0]
            rest = local_rest(points,size)
            idle = {f'Skeleton2D/{path}:position':rest[name] for name,path in zip(BONES,PATHS)}
            idle.update({f'Skeleton2D/{path}:rotation':0. for path in PATHS})
            if main:
                write_animation(base/f'rig_reset_{view}.tres','RESET',.001,False,[(0.,idle)])
                write_set(view,points,size)
            for clip in design['clips']:
                source_view,name = clip['name'].split('--')
                if source_view != view:
                    continue
                poses = [(clip['duration']*index/(len(clip['poses'])-1),resolve_pose(points,size,channels,design,view)) for index,channels in enumerate(clip['poses'])]
                unwrap(poses)
                path = folder/f'{name}.tres'
                write_animation(path,name,clip['duration'],clip['loop'],poses)
                with path.open('a') as file:
                    file.write('metadata/stance_fraction = '+number(clip['support'])+'\n')
                    file.write('metadata/stride = '+number(clip['stride']*design['profiles'][view][0])+'\n')
            print(f'Resolved authored poses: {view}, bounce {design["amplitude"]}',flush=True)


if __name__ == '__main__':
    compile_all()
