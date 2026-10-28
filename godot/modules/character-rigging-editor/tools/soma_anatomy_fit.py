"""Production SOMA fit from causal anatomical reconstruction, not PCA endpoints."""
import copy
import hashlib

import numpy as np

from soma_common import ROOT, fk, project
from soma_anatomy import reconstruct, snapshot, establish
from soma_anatomy_rig import calibrated_model, fitted_camera, lift, pose_with_shared_geometry, refine
from soma_sources import inventory
from prepare import owners_for


def inputs(case,patch):
    entry,owners,_=owners_for(inventory(),case['key'])
    if entry.signature!=case['source']['signature']: raise ValueError('Source changed; regenerate anatomical observations explicitly')
    if hashlib.sha256(owners.tobytes()).hexdigest()!=case['source']['owners_sha256']:
        raise ValueError('Accepted owner revision changed; regenerate source observations')
    observed=owners.copy()
    for i in patch.get('excluded_chunks',[]):observed[observed==i]=0
    return entry.alpha.copy(),observed


def apply_overrides(state,case,patch,model):
    from soma_sources import MAPPING
    for owner,mapping in patch.get('mapping',{}).items():
        default=MAPPING[int(owner)]
        if len(mapping)!=len(default) or any(n not in model['joint_names'] for n in mapping):
            raise ValueError('Manual mapping must use the original ordered SOMA joints')
        for old,new in zip(default,mapping):
            if old not in state['joints'] or new==old:continue
            value=copy.deepcopy(state['joints'][old]);value['sources'].append('manual-mapping')
            state['joints'][new]=value
    for name,point in patch.get('pins',{}).items():
        if name not in model['joint_names'] or np.asarray(point).shape!=(2,) or not np.isfinite(point).all():
            raise ValueError('Manual pin must be a finite original SOMA joint in native pixels')
        establish(state,name,point,.75,['manual-pin'],'operator-constrained','Manual image-space observation, not source mask editing')


def fit(model,case,patch,baseline=None,diagnostic_input=None):
    """diagnostic_input is an explicit in-memory mask copy for corruption controls."""
    from soma_solver import constraints_for, compare
    constraints_for(case,patch,model['joint_names'])  # Identity/mapping validation before any solve.
    if {c['id'] for c in case['chunks']}!=set(range(1,15)):
        raise ValueError('Expected exactly the 14 source anatomical owner groups')
    alpha,owners=inputs(case,patch) if diagnostic_input is None else diagnostic_input
    if alpha.shape!=owners.shape or not np.isin(owners,np.arange(15)).all() or np.any(owners[~alpha]):
        raise ValueError('Anatomical observations require valid native owner IDs inside the unchanged alpha')
    state=reconstruct(case,model,alpha,owners)
    apply_overrides(state,case,patch,model)
    refinement=refine(state,alpha,model,patch.get('pins',{}))
    snapshot(state,'Joint anatomical refinement','Refine the sequential hypothesis using alpha containment and measured pose symmetry; early placements can move',0,['anatomical-chains','alpha','paired-anatomy'])
    camera=fitted_camera(model,state,case['view'],alpha)
    geometry,angles=lift(model,state,camera)
    is_base=case['key']=='idle/south'
    corrections=patch.get('art_corrections',{})
    if not is_base:
        if baseline is None:raise ValueError('South Idle anatomical baseline must be fitted first')
        geometry=copy.deepcopy(baseline['geometry'])
    for name,correction in corrections.items():
        if is_base or name not in model['joint_names'] or model['parents'][model['joint_names'].index(name)]<0 or not correction.get('confirmed') or not correction.get('reason','').strip():
            raise ValueError('Art correction requires a confirmed non-root non-baseline bone and explicit reason')
        factor=float(correction['multiplier'])
        if not .25<=factor<=4:raise ValueError('Art length multiplier must be in [0.25,4]')
        i=model['joint_names'].index(name)
        geometry['local_offsets_m'][i]=(np.array(geometry['local_offsets_m'][i])*factor).tolist()
        geometry['length_factors'][i]*=factor
    geometry['art_corrections']=corrections
    if not is_base:
        angles,camera,pose_metrics=pose_with_shared_geometry(model,geometry,angles,camera,state,alpha)
        refinement['pose_fit']=pose_metrics
    current=calibrated_model(model,geometry)
    spatial=fk(current,pose=angles);projected=project(spatial,camera)
    observations=[]
    statuses=[]
    for i,name in enumerate(model['joint_names']):
        item=state['joints'].get(name)
        status=item['status'] if item else 'canonical-prior-only'
        statuses.append({'joint':name,'position_2d':projected[i].tolist(),'position_3d_m':spatial[i].tolist(),'status':status,
                         'depth_status':'unobserved; canonical depth/pose prior','statistical_confidence':None,
                         'sources':item['sources'] if item else ['canonical'],'heuristic_radius_px':item['heuristic_radius_px'] if item else None})
        if not item: continue
        distance=float(np.linalg.norm(projected[i]-item['point']));radius=item['heuristic_radius_px']
        owner=next((n for n in item['sources'] if isinstance(n,int)),None)
        observations.append({'joint':name,'target':item['point'],'radius_px':radius,'weight':1. if status=='observed-chain' else .7,
                             'source_chunk':owner,'sources':item['sources'],'kind':'anatomical-relation-interval','status':status,
                             'distance_px':distance,'outside_interval_px':max(0.,distance-radius),'conflict':distance>radius*2})
    # The final FK projection is a separate LAST step, never visible at step 0.
    for name,item in state['joints'].items():item['point']=projected[model['joint_names'].index(name)].tolist()
    snapshot(state,'Final SOMA FK','Original 77-joint hierarchy, anatomical geometry and articulated pose; hidden joints remain priors',0,['joint-refinement','SOMA-FK'])
    pose_success=refinement.get('pose_fit',{}).get('success',True)
    metrics={'solver_success':bool(refinement['success'] and pose_success),'solver_message':refinement.get('pose_fit',refinement)['message'],
             'evaluations':refinement['evaluations'],'robust_cost':refinement['cost'],
             'mean_outside_interval_px':float(np.mean([o['outside_interval_px'] for o in observations])),
             'conflicts':sum(o['conflict'] for o in observations)+len(state['conflicts']),'identified_3d':False,'statistical_confidence':None,
             'anatomical_conflicts':state['conflicts'],'hypothesis_used_as_initial_state':True}
    result=dict(case,anatomy_version='2.0.0',canonical_sha256=model['source_sha256'],constraints=observations,placement=state['steps'],
                anatomy=state,canonical_projection=project(fk(model),camera).tolist(),projected_joints=projected.tolist(),spatial_joints_m=spatial.tolist(),
                geometry=geometry,soma_pose={'local_rotation_vectors':angles.tolist(),'units':'radians','source':case['key']},camera=camera,
                joint_status=statuses,manual=patch,metrics=metrics,
                comparison=compare(model,dict(case,manual=patch),projected,geometry['length_factors'],observations,baseline) if baseline else [],
                refinement=dict(refinement,before='causal anatomical placement',after='joint refinement and original SOMA FK',
                                projected_before=refinement['initial_points'],projected_after=projected.tolist()))
    result['input_observations']={'mode':'diagnostic copy' if diagnostic_input is not None else 'original source with separate manual exclusions',
                                  'used_owner_sha256':hashlib.sha256(owners.tobytes()).hexdigest(),
                                  'source_owner_sha256':case['source']['owners_sha256'],
                                  'used_alpha_sha256':hashlib.sha256(alpha.tobytes()).hexdigest(),
                                  'source_masks_written':False}
    result['chunks']=copy.deepcopy(case['chunks'])
    for chunk in result['chunks']:
        chunk['landmarks']=[state['joints'][n]['point'] for n in chunk['mapping'] if n in state['joints']]
        chunk['landmark_origin']='anatomical relations / silhouette; semantic mask is not edited'
        chunk['constraints']=[o for o in observations if o['source_chunk']==chunk['id']]
        if chunk['status']=='missing' and chunk['landmarks']:
            chunk['reasons'].append('Semantic owner absent; visible anatomy is reconstructed separately from alpha and the SOMA chain')
    return result
