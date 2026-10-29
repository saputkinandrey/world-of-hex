"""Real masks and alpha; the previous SouthWest fit is never an input."""
import numpy as np
from scipy import ndimage

from soma_common import ROOT, read
from soma_sources import inventory
from soma_anatomy import reconstruct
from prepare import owners_for

# Actual anatomical edges. Chest->Shoulder is a kinematic connector, not a
# visible physical bone segment and is deliberately absent from mask fitting.
SEGMENTS=[('Hips','Chest',[1]),('Head','HeadEnd',[14])]
for side,upper,lower,hand,thigh,shin,foot in [('Left',10,12,3,7,9,4),('Right',11,13,2,6,8,5)]:
    SEGMENTS.extend([(side+'Arm',side+'ForeArm',[upper]),(side+'ForeArm',side+'Hand',[lower]),
                     (side+'Leg',side+'Shin',[thigh]),(side+'Shin',side+'Foot',[shin]),(side+'Foot',side+'ToeEnd',[foot])])


def load_observations(base,key):
    dataset=inventory();entry,owners,source=owners_for(dataset,key)
    raw=read(ROOT/'observations'/f'{key}.json')
    if raw['source']['signature']!=entry.signature:raise ValueError('Observation signature stale: '+key)
    # Only raw masks/alpha and anatomical relationships. No SW pose, geometry,
    # cached fitted joints, lift(), fit(), or 2D joint refinement is read/called.
    state=reconstruct(raw,base['canonical'],entry.alpha,owners)
    fields=[]
    for first,last,ids in SEGMENTS:
        mask=np.isin(owners,ids)
        if not mask.any():continue
        distance=ndimage.distance_transform_edt(~mask)
        p=np.argwhere(mask)
        thickness=max(1.5,np.sqrt(len(p))/3.)
        fields.append({'start':first,'end':last,'ids':ids,'distance':distance,'radius':thickness,'mask':mask})
    targets=[]
    for name,item in state['joints'].items():
        if item['status']=='occluded-hypothesis' or name.endswith('Shoulder'):continue
        targets.append({'joint':name,'point':item['point'],'radius':item['heuristic_radius_px'],
                        'weight':.35 if name in ['Hips','Spine1','Spine2','Chest'] else .6,
                        'status':item['status'],'sources':item['sources']})
    return {'key':key,'alpha':entry.alpha.copy(),'owners':owners.copy(),'pixels':entry.textures[entry.baseline],
            'colors':dataset.colors,'fields':fields,'targets':targets,'anatomy':state,
            'outside':ndimage.distance_transform_edt(~entry.alpha),'source':raw['source'],
            'input_policy':'raw owners/alpha + unrefined interval hypotheses; previous SW fit excluded'}


def sample(field,points):
    p=np.asarray(points)
    return ndimage.map_coordinates(field,[p[:,1]-.5,p[:,0]-.5],order=1,mode='constant',cval=max(field.shape))


def residual(points,observation,names):
    values=[]
    for target in observation['targets']:
        d=(points[names.index(target['joint'])]-target['point'])/target['radius']
        values.extend(d*np.sqrt(target['weight']))
    for segment in observation['fields']:
        first=points[names.index(segment['start'])];last=points[names.index(segment['end'])]
        samples=first+(last-first)*np.linspace(.15,.85,5)[:,None]
        values.extend(sample(segment['distance'],samples)/segment['radius']*.6)
        values.extend(np.maximum(0.,sample(observation['outside'],samples)-.8)*.4)
    return np.asarray(values)


def metrics(points,observation,names):
    joints=[];segments=[]
    for target in observation['targets']:
        distance=float(np.linalg.norm(points[names.index(target['joint'])]-target['point']))
        joints.append({'joint':target['joint'],'distance_px':distance,'radius_px':target['radius'],
                       'outside_interval_px':max(0.,distance-target['radius']),'point_hypothesis':target['point'],
                       'status':'interval hypothesis, not independent ground truth'})
    for item in observation['fields']:
        first=points[names.index(item['start'])];last=points[names.index(item['end'])]
        p=first+(last-first)*np.linspace(.1,.9,9)[:,None]
        dist=sample(item['distance'],p)
        outside=sample(observation['outside'],p)
        segments.append({'start':item['start'],'end':item['end'],'owner_ids':item['ids'],
                         'mask_mean_distance_px':float(dist.mean()),'mask_max_distance_px':float(dist.max()),
                         'alpha_max_distance_px':float(outside.max()),'mask_support_fraction':float(np.mean(dist<=1.5)),
                         'interpretation':'visible owner support; occlusion/segmentation may disagree with true bone'})
    return {'normalized_residual_norm':float(np.linalg.norm(residual(points,observation,names))),
            'mean_outside_interval_px':float(np.mean([j['outside_interval_px'] for j in joints])),
            'mean_raw_mask_distance_px':float(np.mean([s['mask_mean_distance_px'] for s in segments])),
            'max_alpha_distance_px':max(s['alpha_max_distance_px'] for s in segments),
            'problem_regions':[s['end'] for s in segments if s['mask_mean_distance_px']>2. or s['alpha_max_distance_px']>2.],
            'joints':joints,'segments':segments,'is_ground_truth_accuracy':False}
