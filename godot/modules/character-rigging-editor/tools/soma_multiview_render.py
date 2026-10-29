"""Real-image stage overlays and shoulder-chain diagnostics."""
import numpy as np
from PIL import Image,ImageDraw

from soma_common import project
from soma_multiview_model import MV
from soma_anatomy_diagnostics import MAIN,font,color


def slug(name):return name.lower().replace(' ','-')


def draw_chain(draw,points,model,origin,scale,focus=False):
    names=model['joint_names'];selected=MAIN if not focus else ['Chest']+[s+n for s in ['Left','Right'] for n in ['Shoulder','Arm','ForeArm','Hand']]
    for name in selected:
        i=names.index(name);parent=model['parents'][i]
        p=np.array(origin)+np.array(points[i])*scale
        if parent>=0 and names[parent] in selected:
            q=np.array(origin)+np.array(points[parent])*scale
            if name.endswith('Shoulder'):
                for t in np.arange(0,1,.2):draw.line([tuple(q+(p-q)*t),tuple(q+(p-q)*(t+.1))],fill='#a7adbd',width=2)
            else:draw.line([tuple(q),tuple(p)],fill=color(name),width=3)
        draw.ellipse((p[0]-3,p[1]-3,p[0]+3,p[1]+3),fill=color(name))
        if focus or name in ['Hips','Chest','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftFoot','RightFoot']:
            draw.text((p[0]+5,p[1]-13),name,font=font(13),fill=color(name),stroke_width=1,stroke_fill='#151b24')


def render_stage(name,stage,base,obs):
    folder=MV/'images';folder.mkdir(parents=True,exist_ok=True)
    source=Image.fromarray(obs['pixels']);rgba=np.array(obs['pixels'],copy=True)
    rgba[:,:,:3]=obs['colors'][obs['owners']]
    composite=Image.blend(source,Image.fromarray(rgba),.32)
    canvas=Image.new('RGB',(1400,850),'#151b24');draw=ImageDraw.Draw(canvas)
    w,h=source.size;scale=4
    for column,image in enumerate([composite,source]):
        origin=(column*700+25,90);sized=image.resize((w*scale,h*scale),Image.Resampling.NEAREST)
        canvas.paste(sized,origin,sized)
        draw_chain(draw,stage['projected_joints'],base['canonical'],origin,scale)
        draw.text((column*700+20,20),name+(' + original chunks' if column==0 else ' + original sprite'),font=font(21),fill='white')
        for row in stage['metrics']['segments']:
            if row['mask_mean_distance_px']<=2.:continue
            i=base['canonical']['joint_names'].index(row['end']);p=np.array(origin)+np.array(stage['projected_joints'][i])*scale
            draw.ellipse((p[0]-14,p[1]-14,p[0]+14,p[1]+14),outline='#ff6278',width=2)
        for row in stage['metrics']['joints']:
            if row['outside_interval_px']<=0:continue
            i=base['canonical']['joint_names'].index(row['joint']);p=np.array(origin)+np.array(stage['projected_joints'][i])*scale
            draw.ellipse((p[0]-10,p[1]-10,p[0]+10,p[1]+10),outline='#f8c45c',width=2)
    camera=stage['camera']
    draw.text((20,740),'yaw %.2f deg | pitch %.2f deg | %.3f px/m | shift (%.2f, %.2f)'%(np.degrees(camera['yaw']),np.degrees(camera['pitch']),camera['pixels_per_metre'],camera['tx'],camera['ty']),font=font(20),fill='white')
    draw.text((20,775),'Red: raw masks. Amber: uncertain joint-interval disagreement. Dashed Chest->Shoulder: connector.',font=font(18),fill='white')
    draw.text((20,805),'Image observations are uncertain. The previous SouthWest fitted joints are not used.',font=font(18),fill='white')
    canvas.save(folder/(slug(name)+'.png'))
    # A separate close-up preserves the complete attachment chains on both sides.
    crop=composite.resize((w*7,h*7),Image.Resampling.NEAREST)
    panel=Image.new('RGB',(w*7,h*7),'#151b24');panel.paste(crop,(0,0),crop)
    d=ImageDraw.Draw(panel);draw_chain(d,stage['projected_joints'],base['canonical'],(0,0),7,True)
    names=base['canonical']['joint_names'];selection=['Chest']+[s+n for s in ['Left','Right'] for n in ['Shoulder','Arm','ForeArm','Hand']]
    p=np.array([stage['projected_joints'][names.index(n)] for n in selection])*7
    lower=np.maximum(0,np.floor(p.min(0)-60).astype(int));upper=np.minimum([w*7,h*7],np.ceil(p.max(0)+110).astype(int))
    panel.crop((*lower,*upper)).save(folder/(slug(name)+'-shoulders.png'))


def render_south(base,obs,after_positions):
    from soma_multiview_observations import metrics
    points=project(base['positions_m'],base['camera_south'])
    stage={'camera':base['camera_south'],'projected_joints':points.tolist(),
           'metrics':metrics(points,obs,base['canonical']['joint_names'])}
    render_stage('South baseline',stage,base,obs)
    changed=project(after_positions,base['camera_south'])
    stage=dict(stage,projected_joints=changed.tolist(),metrics=metrics(changed,obs,base['canonical']['joint_names']))
    render_stage('South after shared geometry',stage,base,obs)
