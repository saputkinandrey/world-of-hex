"""Refine an anatomical hypothesis, then express it in the ORIGINAL SOMA FK.

No alternate hierarchy or 12-bone surrogate. Full local offsets/rotations are
stored separately; unobserved children retain their canonical local prior.
"""
import copy

import numpy as np
from scipy import ndimage
from scipy.optimize import least_squares
from scipy.spatial.transform import Rotation

from soma_common import camera_basis, fk, project

YAW={'south':0.,'north':np.pi,'south-west':-np.pi/4,'north-west':-3*np.pi/4}
PAIRS=['Arm','ForeArm','Hand','Leg','Shin','Foot','ToeBase','ToeEnd']


def refine(state,alpha,model,pins):
    """The actual sequential reconstruction is the initial state, not a log."""
    names=list(state['joints'])
    original=np.array([state['joints'][n]['point'] for n in names])
    radius=np.array([state['joints'][n]['heuristic_radius_px'] for n in names])
    outside=ndimage.distance_transform_edt(~alpha)
    symmetry=state['knowledge']['pose_symmetry']
    def residual(flat):
        points=flat.reshape(-1,2)
        values=list(((points-original)/radius[:,None]).ravel())
        for name,target in pins.items():
            if name in names: values.extend((points[names.index(name)]-target)*3.)
        for name in names:
            i=names.index(name)
            if state['joints'][name]['status']=='occluded-hypothesis': continue
            x,y=points[i]
            distance=ndimage.map_coordinates(outside,[[y-.5],[x-.5]],order=1,mode='constant',cval=max(alpha.shape))[0]
            values.append(max(0.,distance-.5)*1.5)
            parent=model['parents'][model['joint_names'].index(name)]
            if parent<0 or model['joint_names'][parent] not in names:continue
            a=points[names.index(model['joint_names'][parent])]
            samples=a+(points[i]-a)*np.linspace(.1,.9,5)[:,None]
            distances=ndimage.map_coordinates(outside,[samples[:,1]-.5,samples[:,0]-.5],order=1,mode='constant',cval=max(alpha.shape))
            values.extend(np.maximum(0.,distances-1.2)*.5)
        if symmetry['pose_symmetric']:
            cx=symmetry['axis_x']
            for suffix in PAIRS:
                left,right='Left'+suffix,'Right'+suffix
                if left not in names or right not in names:continue
                a,b=points[names.index(left)],points[names.index(right)]
                values.extend([(a[0]+b[0]-2*cx)/3.,(a[1]-b[1])/3.])
        return np.array(values)
    result=least_squares(residual,original.ravel(),loss='soft_l1',f_scale=1.,max_nfev=60)
    for name,p in zip(names,result.x.reshape(-1,2)):state['joints'][name]['point']=p.tolist()
    return {'success':bool(result.success),'message':result.message,'cost':float(result.cost),'evaluations':result.nfev,
            'initial_points':dict(zip(names,original.tolist())),'hypothesis_used_as_initial_state':True}


def calibrated_model(model,geometry):
    current=copy.deepcopy(model)
    if 'local_offsets_m' in geometry: current['offsets_m']=geometry['local_offsets_m']
    else: current['offsets_m']=(np.array(model['offsets_m'])*np.array(geometry['length_factors'])[:,None]).tolist()
    return current


def fitted_camera(model,state,view,alpha):
    rest=np.array(model['rest_positions_m']);right,down=camera_basis({'yaw':YAW[view],'pitch':0.})
    size=np.ptp(np.argwhere(alpha)[:,0])
    scale=float(size/np.ptp(rest[:,1]))
    hips=np.array(state['joints']['Hips']['point']);root=rest[0]
    translation=hips-np.array([right@root,down@root])*scale
    return {'kind':'orthographic','yaw':YAW[view],'pitch':0.,'pixels_per_metre':scale,'tx':float(translation[0]),'ty':float(translation[1]),
            'axis':'Y-up; image Y-down; native pixels','depth':'canonical prior, not recovered anatomy'}


def lift(model,state,camera):
    """Analytic inverse construction on SOMA. Image points remain constraints.

    For a single observed child the parent rotates its canonical child axis;
    calibrated length is separate. At pelvis/chest branches local geometry can
    change with character proportions. Hidden children are never assigned
    fake pixel owners or treated as independently observed joints.
    """
    names=model['joint_names'];parents=model['parents']
    basis=camera_basis(camera);ray=np.cross(basis[0],basis[1])
    rest=np.array(model['rest_positions_m'])
    points={}
    for name,item in state['joints'].items():
        p=(np.array(item['point'])-[camera['tx'],camera['ty']])/camera['pixels_per_metre']
        index=names.index(name)
        points[index]=basis.T@p+ray*(rest[index]@ray)
    local=np.array(model['offsets_m']).copy();rotations=np.zeros((77,3));world=np.empty((77,3,3))
    original_rotations=Rotation.from_quat(model['local_quaternions_xyzw']).as_matrix()
    for i,parent in enumerate(parents):
        inherited=original_rotations[i] if parent<0 else world[parent]@original_rotations[i]
        children=[j for j,p in enumerate(parents) if p==i and j in points and i in points]
        if children:
            observed=np.array([points[j]-points[i] for j in children])
            prior=np.array([inherited@local[j] for j in children])
            observed/=np.linalg.norm(observed,axis=1)[:,None]
            prior/=np.linalg.norm(prior,axis=1)[:,None]
            rotation,_=Rotation.align_vectors(observed,prior)
            world[i]=rotation.as_matrix()@inherited
        else: world[i]=inherited
        rotations[i]=Rotation.from_matrix(inherited.T@world[i]).as_rotvec()
        if parent>=0 and i in points and parent in points:
            local[i]=world[parent].T@(points[i]-points[parent])
    geometry={'id':'Character1/idle/south','local_offsets_m':local.tolist(),
              'length_factors':(np.linalg.norm(local,axis=1)/np.maximum(1e-9,np.linalg.norm(model['offsets_m'],axis=1))).tolist(),
              'units':'metres','identification':'image-supported anatomy hypothesis; metric scale and hidden depth remain prior-selected',
              'source':'anatomical chain + paired fragments + original alpha','depth':'canonical depth prior, unobserved','art_corrections':{}}
    return geometry,rotations


def pose_with_shared_geometry(model,geometry,initial,camera,state,alpha):
    """Fit image pose/camera before considering any length change."""
    current=calibrated_model(model,geometry)
    names=model['joint_names']
    active=[i for i,n in enumerate(names) if any(model['parents'][names.index(child)]==i for child in state['joints'])]
    initial_angles=np.array(initial)
    x0=np.r_[initial_angles[active].ravel(),0.,0.,0.,0.,0.]
    points_names=list(state['joints'])
    indices=[names.index(n) for n in points_names]
    targets=np.array([state['joints'][n]['point'] for n in points_names])
    radii=np.array([state['joints'][n]['heuristic_radius_px'] for n in points_names])
    distance=ndimage.distance_transform_edt(~alpha)
    def unpack(x):
        angles=initial_angles.copy();angles[active]=x[:-5].reshape(-1,3)
        cam=dict(camera,yaw=camera['yaw']+x[-5],pitch=x[-4],pixels_per_metre=camera['pixels_per_metre']*np.exp(x[-3]),tx=camera['tx']+x[-2],ty=camera['ty']+x[-1])
        return angles,cam
    def residual(x):
        angles,cam=unpack(x)
        projected=project(fk(current,pose=angles),cam)[indices]
        values=((projected-targets)/radii[:,None]).ravel()
        sil=ndimage.map_coordinates(distance,[projected[:,1]-.5,projected[:,0]-.5],order=1,mode='constant',cval=max(alpha.shape))
        return np.r_[values,np.maximum(0,sil-.8), (x[:-5]-x0[:-5])*.025,x[-5:-3]*.1,x[-3]*.5]
    low=np.r_[np.full(len(x0)-5,-np.pi*2),-.8,-.65,-.5,-80.,-80.]
    high=np.r_[np.full(len(x0)-5,np.pi*2),.8,.65,.5,80.,80.]
    solution=least_squares(residual,x0,bounds=(low,high),loss='soft_l1',max_nfev=80,ftol=1e-5)
    angles,cam=unpack(solution.x)
    return angles,cam,{'success':bool(solution.success),'message':solution.message,'cost':float(solution.cost),'evaluations':solution.nfev,'geometry_fixed_first':True}
