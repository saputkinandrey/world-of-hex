"""Preserved before evidence and readable pixel-space anatomical overlays."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from soma_common import MODULE, ROOT, canonical, case_path, read, write
from soma_sources import inventory
from prepare import owners_for

OUTPUT=ROOT/'anatomy'
MAIN=['Hips','Spine1','Spine2','Chest','Neck1','Neck2','Head','HeadEnd',
      'LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand',
      'LeftLeg','LeftShin','LeftFoot','LeftToeBase','LeftToeEnd','RightLeg','RightShin','RightFoot','RightToeBase','RightToeEnd']
COLORS={'Left':'#53d7fa','Right':'#ffbe63','Center':'#d2ed7c'}


def font(size=16):
    return ImageFont.truetype('C:/Windows/Fonts/arial.ttf',size)


def color(name):
    return COLORS['Left' if name.startswith('Left') else 'Right' if name.startswith('Right') else 'Center']


def skeleton(draw, points, model, origin, scale, labels=True):
    names=model['joint_names']
    def pixel(p): return tuple(np.array(origin)+np.asarray(p)*scale)
    for name in MAIN:
        i=names.index(name); parent=model['parents'][i]
        if parent>=0 and names[parent] in MAIN:
            draw.line([pixel(points[parent]),pixel(points[i])],fill=color(name),width=3)
        x,y=pixel(points[i]);draw.ellipse((x-3,y-3,x+3,y+3),fill=color(name))
        if labels and name in ['Chest','Hips','Head','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftShin','RightShin','LeftFoot','RightFoot','LeftToeEnd','RightToeEnd']:
            draw.text((x+5,y-14),name,fill=color(name),font=font(13),stroke_width=1,stroke_fill='#10151c')


def before():
    folder=OUTPUT/'before'
    folder.mkdir(parents=True,exist_ok=True)
    snapshot=folder/'idle-south.json'
    if not snapshot.exists(): write(snapshot,read(case_path('idle/south')))
    report=folder/'SOMA-CALIBRATION.md'
    if not report.exists(): report.write_bytes((MODULE/'SOMA-CALIBRATION.md').read_bytes())
    case=read(snapshot)
    dataset=inventory();entry,owners,_=owners_for(dataset,'idle/south')
    image=Image.fromarray(entry.textures[entry.baseline])
    scale=6; panel=700; top=90
    canvas=Image.new('RGB',(panel*3,1030),'#151b24');draw=ImageDraw.Draw(canvas)
    captions=['Native sprite + old SOMA','Original owners + old extracted axes','Owners + old SOMA + wrong landmarks']
    rgba=np.zeros_like(entry.textures[0]);rgba[:,:,:3]=dataset.colors[owners];rgba[:,:,3]=entry.alpha*255
    semantic=Image.fromarray(rgba)
    for j,title in enumerate(captions):
        origin=(j*panel+20,top)
        draw.text((j*panel+20,20),title,fill='white',font=font(22))
        base=image if j==0 else semantic if j==1 else Image.blend(image,semantic,.35)
        canvas.paste(base.resize((660,660),Image.Resampling.NEAREST),origin,base.resize((660,660),Image.Resampling.NEAREST))
        if j!=1: skeleton(draw,case['projected_joints'],canonical(),origin,scale)
        if j>0:
            for chunk in case['chunks']:
                if not chunk.get('landmarks'): continue
                a,b=[tuple(np.array(origin)+np.array(p)*scale) for p in chunk['landmarks']]
                draw.line([a,b],fill='white',width=2)
                for n,p in enumerate([a,b]):
                    draw.ellipse((p[0]-5,p[1]-5,p[0]+5,p[1]+5),outline='#f35d6b',width=2)
                    draw.text((p[0]+6,p[1]),f'{chunk["id"]}:{n}',font=font(14),fill='white',stroke_width=1,stroke_fill='black')
    text=['BEFORE: observed failure, not an anatomical reference',
          'Left/Right Foot categories absent. Alpha still contains BOTH visible feet; owner coverage is complete.',
          'PCA endpoints + torso centroid reverse upper-arm shoulder/elbow semantics.',
          'Broad independent intervals permit asymmetric axial/limb solutions. Feet have no image constraint.',
          'Placement is diagnostic only: its estimates are NOT used to initialize FK. Canonical foot offsets survive.',
          'Old 77-joint hierarchy is valid; anatomy inferred from the image is not.']
    for n,line in enumerate(text):draw.text((20,810+n*30),line,font=font(21 if n==0 else 18),fill='#ffad99' if n==0 else 'white')
    canvas.save(folder/'diagnostic.png')
    names=canonical()['joint_names']
    metrics={'alpha_pixels':int(entry.alpha.sum()),'classified_pixels':int(np.sum((owners>0)&entry.alpha)),
             'missing_categories':[c['name'] for c in case['chunks'] if c['status']=='missing'],
             'joints':{n:case['projected_joints'][names.index(n)] for n in MAIN},
             'upper_arm_landmarks':{c['name']:c['constraints'] for c in case['chunks'] if c['id'] in [10,11]},
             'semantic_bounds':{dataset.names[i]:np.array([np.argwhere(owners==i).min(0)[::-1],np.argwhere(owners==i).max(0)[::-1]]).tolist() for i in range(1,15) if np.any(owners==i)}}
    write(folder/'diagnostic.json',metrics)
    print({k:v for k,v in metrics.items() if k not in ['joints','upper_arm_landmarks','semantic_bounds']})
    for name in ['LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftShin','LeftFoot','LeftToeEnd','RightShin','RightFoot','RightToeEnd']:
        print(name,np.round(metrics['joints'][name],2).tolist())
    print('semantic bounds',metrics['semantic_bounds'])


def inspect_cases():
    dataset=inventory()
    keys=['idle/south','aim-pistol/south','walk/south','idle/south-west']
    canvas=Image.new('RGB',(760*2,800),'#151b24');draw=ImageDraw.Draw(canvas)
    for n,key in enumerate(keys):
        entry,owners,_=owners_for(dataset,key)
        image=Image.fromarray(entry.textures[entry.baseline])
        rgba=np.zeros_like(entry.textures[0]);rgba[:,:,:3]=dataset.colors[owners];rgba[:,:,3]=entry.alpha*255
        for j,base in enumerate([image,Image.fromarray(rgba)]):
            w,h=base.size;origin=((n%2)*760+j*375,40+(n//2)*395)
            scaled=base.resize((w*2,h*2),Image.Resampling.NEAREST)
            canvas.paste(scaled,origin,scaled)
            draw.text((origin[0],origin[1]-25),key+(' source' if j==0 else ' owners'),font=font(18),fill='white')
        print(key)
        for i in [1,2,3,6,7,8,9,10,11,12,13,14]:
            p=np.argwhere(owners==i)[:,::-1]+.5
            if len(p): print(i,'q05,50,95',np.round(np.quantile(p,[.05,.5,.95],axis=0),1).tolist())
    canvas.save(OUTPUT/'before/observed-cases.png')
    model=canonical()
    print('Canonical parent / joint anatomy, metres')
    for name in MAIN:
        i=model['joint_names'].index(name);p=model['parents'][i]
        print(name,model['joint_names'][p] if p>=0 else 'ROOT',np.round(model['rest_positions_m'][i],3).tolist())


def hypothesis():
    from soma_anatomy import reconstruct
    dataset=inventory();model=canonical()
    key='idle/south'
    entry,owners,_=owners_for(dataset,key)
    case=read(ROOT/'observations/idle/south.json')
    state=reconstruct(case,model,entry.alpha,owners)
    write(OUTPUT/'hypothesis/idle-south.json',state)
    canvas=Image.new('RGB',(1400,850),'#151b24');draw=ImageDraw.Draw(canvas)
    source=Image.fromarray(entry.textures[entry.baseline])
    old=read(OUTPUT/'before/idle-south.json')
    points=np.zeros((77,2))
    for name,item in state['joints'].items():points[model['joint_names'].index(name)]=item['point']
    for n,title in enumerate(['BEFORE: reversed elbows and unbounded feet','B: anatomical hypothesis before any optimizer']):
        origin=(n*700+20,70);scaled=source.resize((660,660),Image.Resampling.NEAREST)
        canvas.paste(scaled,origin,scaled);draw.text((n*700+20,20),title,font=font(21),fill='white')
        skeleton(draw,old['projected_joints'] if n==0 else points,model,origin,6)
        if n==1:
            for region in state['regions']:
                for p in region['pixels']:
                    x,y=np.array(origin)+np.array(p)*6
                    draw.rectangle((x-2,y-2,x+2,y+2),outline='#fb79d2')
    draw.text((20,790),'Cyan/amber: paired anatomical chains. Pink: FOOT hypotheses from alpha, not corrected owner labels.',font=font(20),fill='white')
    canvas.save(OUTPUT/'hypothesis/south-idle.png')
    print('symmetry',state['knowledge']['pose_symmetry'])
    for name,item in state['joints'].items():print(name,np.round(item['point'],1).tolist(),item['status'])
    print('conflicts',state['conflicts'])
    print('knowledge transfers',state['knowledge']['transfers'])


if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='hypothesis': hypothesis()
    else:
        before()
        inspect_cases()
