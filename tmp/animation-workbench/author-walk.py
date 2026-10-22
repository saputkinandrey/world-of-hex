from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[2] / 'godot/modules/character-animation-workbench'
P = 'Skeleton2D/Pelvis'
SPINE = P+'/Spine'
CHEST = SPINE+'/Chest'
PHASE = 0.0

def rotate(vector, angle):
    x,y = vector
    return (x*math.cos(angle)-y*math.sin(angle), x*math.sin(angle)+y*math.cos(angle))

def gait(phase, amplitude=1.0):
    wave = math.sin(2*math.pi*phase)
    # Fast weight acceptance, a held low position, and a restrained recovery.
    half_step = phase % .5
    heights = [(0, 1), (.08, 2.1), (.18, 1.8), (.32, -.7), (.40, -.9), (.5, 1)]
    bounce = 0
    for (start, first), (end, last) in zip(heights, heights[1:]):
        if start <= half_step <= end:
            fraction = (half_step-start)/(end-start)
            eased = fraction*fraction*(3-2*fraction)
            bounce = first+(last-first)*eased
            break
    pelvis = (.55*wave*amplitude,25+bounce*amplitude)
    pose = {
        P+':position':pelvis,
        SPINE+':rotation':.015*wave*amplitude,
        CHEST+':rotation':-.025*wave*amplitude,
        CHEST+'/Head:rotation':.01*wave*amplitude,
        CHEST+'/Head:position':(0,-12+.18*math.sin(4*math.pi*(phase-.06))*amplitude),
    }
    for side,sign in [('L',-1),('R',1)]:
        step = (phase + (0 if side == 'L' else .5)) % 1.0
        depth = math.cos(2*math.pi*step)
        # Ground travels backward below a stationary character. The planted
        # foot follows it for 60% of the cycle, then swings forward for 40%.
        if step <= .6:
            ground_y = 50 - 10*step/.6
            lift = 0
        else:
            travel = (step-.6)/.4
            ground_y = 40 + 10*travel
            lift = 4.5*math.sin(math.pi*travel)
        thigh = sign*.045*math.sin(2*math.pi*step)*amplitude
        calf = -sign*.025*lift/4.5*amplitude
        scale = (1,1)
        target = (sign*(13+.35*depth*amplitude),47+(ground_y-lift-47)*amplitude)
        hip = (pelvis[0]+sign*10,pelvis[1]+4)
        local_target = rotate((target[0]-hip[0],target[1]-hip[1]),-thigh)
        toe = rotate((sign*3*scale[0],5*scale[1]),calf)
        calf_position = (local_target[0]-toe[0],local_target[1]-toe[1])
        base = P+'/Thigh'+side
        pose[base+':rotation'] = thigh
        pose[base+'/Calf'+side+':position'] = calf_position
        pose[base+'/Calf'+side+':rotation'] = calf
        # The arm on the stepping side moves back; the opposite arm comes
        # toward the viewer. Depth is expressed by foreshortening, not flapping.
        arm_depth = -depth
        arm = CHEST+'/Arm'+side
        pose[arm+':position'] = (sign*23,2+2*arm_depth*amplitude)
        pose[arm+':rotation'] = sign*.025*arm_depth*amplitude
        pose[arm+'/Forearm'+side+':position'] = (sign*4,20+arm_depth*amplitude)
        pose[arm+'/Forearm'+side+':rotation'] = -sign*(.025+.02*arm_depth)*amplitude
    return pose

def number(value):
    if abs(value) < 1e-9:
        value = 0.0
    return str(round(value,8))

def variant(value):
    return 'Vector2('+', '.join(map(number,value))+')' if isinstance(value,tuple) else number(value)

def save(name,duration,times,poses,loop=False):
    text = f'[gd_resource type="Animation" format=3]\n\n[resource]\nresource_name = "{name}"\nlength = {duration}\nloop_mode = {int(loop)}\nstep = 0.033333335\n'
    for index,path in enumerate(poses[0]):
        text += f'''tracks/{index}/type = "value"
tracks/{index}/path = NodePath("{path}")
tracks/{index}/interp = 2
tracks/{index}/loop_wrap = {str(loop).lower()}
tracks/{index}/enabled = true
tracks/{index}/keys = {{
"times": PackedFloat32Array({', '.join(map(number,times))}),
"transitions": PackedFloat32Array({', '.join('1' for _ in times)}),
"update": 0,
"values": [{', '.join(variant(pose[path]) for pose in poses)}]
}}
'''
    (ROOT/'animations'/f'{name}.tres').write_text(text,encoding='utf-8')

times = [i/32 for i in range(33)]
save('walk_loop',1.0,times,[gait(PHASE+t) for t in times],True)

def smooth(value):
    return value**3*(value*(6*value-15)+10)

times = [.5*i/12 for i in range(13)]
# The phase clock accelerates from rest to one cycle/second, then decelerates.
save('idle_to_walk',.5,times,[gait(PHASE-.25+t*t,smooth(t/.5)) for t in times])
save('walk_to_idle',.5,times,[gait(PHASE+t-t*t,1-smooth(t/.5)) for t in times])
