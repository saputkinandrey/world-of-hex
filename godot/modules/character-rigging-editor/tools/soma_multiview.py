"""Staged single-additional-view calibration, starting with camera ONLY."""
import copy
import numpy as np
from scipy.optimize import least_squares

from soma_common import ROOT, read, project, write
from soma_multiview_model import MV, STAGES, delta_record, fingerprint, replay, snapshot, assert_unchanged
from soma_multiview_observations import load_observations, residual, metrics


def initial_camera(base,observation):
    camera=copy.deepcopy(base['camera_south'])
    camera['yaw']-=np.pi/4
    h,w=observation['alpha'].shape
    camera['tx']+=(w-base['source']['native_size'][0])/2
    camera['ty']+=(h-base['source']['native_size'][1])/2
    return camera


def fit_camera(base,positions,observation,initial):
    original=np.array(positions,copy=True)
    names=base['canonical']['joint_names']
    x0=np.array([initial['yaw'],initial['pitch'],np.log(initial['pixels_per_metre']),initial['tx'],initial['ty']])
    def unpack(x):return dict(initial,yaw=float(x[0]),pitch=float(x[1]),pixels_per_metre=float(np.exp(x[2])),tx=float(x[3]),ty=float(x[4]))
    def objective(x):return residual(project(original,unpack(x)),observation,names)
    solution=least_squares(objective,x0,bounds=([-np.pi/2,-np.pi/3,np.log(10),-300,-300],[.15,np.pi/3,np.log(150),400,400]),loss='soft_l1',max_nfev=200)
    np.testing.assert_array_equal(positions,original)
    return unpack(solution.x),{'success':bool(solution.success),'message':solution.message,'evaluations':solution.nfev,
                              'optimized_parameters':['yaw','pitch','pixels_per_metre','tx','ty'],'degrees_of_freedom':5,
                              'frozen_world_positions_sha256':fingerprint(original.tolist())}


def camera_only():
    base=snapshot();observation=load_observations(base,'idle/south-west')
    initial=initial_camera(base,observation)
    geometry_hash=fingerprint(base['geometry']);pose_hash=fingerprint(base['pose'])
    camera,verification=fit_camera(base,np.array(base['positions_m']),observation,initial)
    assert fingerprint(base['geometry'])==geometry_hash and fingerprint(base['pose'])==pose_hash
    stages={}
    for name,cam in [('Baseline Projection',initial),('Camera Only',camera)]:
        points=project(base['positions_m'],cam)
        stages[name]={'camera':cam,'projected_joints':points.tolist(),'positions_m':base['positions_m'],
                      'metrics':metrics(points,observation,base['canonical']['joint_names']),
                      'geometry_fingerprint':geometry_hash,'pose_fingerprint':pose_hash}
    result={'version':'1.0.0','source_model_id':base['model_id'],'image_identity':observation['source']['image_sha256'],
            'baseline_fingerprint':fingerprint(base),
            'view':'south-west','initial':initial,'after':camera,'type':'camera','confirmation':'fitted hypothesis',
            'changed_joints':[],'reason':'One rigid orthographic projection of frozen South Idle SOMA; raw masks/alpha and interval observations',
            'parameter_changes':{name:{'before':initial[name],'after':camera[name]} for name in verification['optimized_parameters']},
            'verification':verification,'validation':{name:stage['metrics'] for name,stage in stages.items()}}
    write(MV/'camera-south-west.json',result);write(MV/'camera-only-stages.json',stages)
    assert_unchanged(base)
    from soma_multiview_render import render_stage
    for name,stage in stages.items():render_stage(name,stage,base,observation)
    print({'camera':camera,'verification':verification,'metrics':{k:{n:v for n,v in s['metrics'].items() if n not in ['joints','segments']} for k,s in stages.items()}},flush=True)
    return base,observation,result,stages


def build():
    base,obs,camera,stages=camera_only()
    names=base['canonical']['joint_names']
    south=load_observations(base,'idle/south')
    reason=('Camera Only supports visible raw-mask segments; remaining attachment-point disagreements are uncertain. '
            'No independently justified depth, pose or art change. Empty delta, not an optimization placeholder.')
    deltas={'camera':camera}
    for key,kind in [('shared','shared_geometry'),('pose','pose'),('art','art_geometry')]:
        delta=delta_record(base,kind,obs['source']['image_sha256'],reason)
        delta['confirmation']='not applied: no sufficiently justified correction'
        delta['validation']={'south':metrics(project(base['positions_m'],base['camera_south']),south,names),
                             'south_west':stages['Camera Only']['metrics'],'south_projection_max_change_px':0.,
                             'world_joint_changes':0,'length_changes':0,'rotation_changes':0}
        deltas[key]=delta
        write(MV/f'{key}-delta.json',delta)
    write(MV/'deltas.json',deltas)
    export_stages(base,obs,south,deltas)


def export_stages(base,obs,south,deltas):
    names=base['canonical']['joint_names'];camera=deltas['camera']
    _,_,_,shared_positions=replay(base,deltas,'Shared Geometry')
    original_south=project(base['positions_m'],base['camera_south'])
    refined_south=project(shared_positions,base['camera_south'])
    south_shift=float(np.linalg.norm(refined_south-original_south,axis=1).max())
    scenes={}
    raw=read(ROOT/'observations/idle/south-west.json')
    for i,name in enumerate(STAGES):
        geometry,pose,cam,positions=replay(base,deltas,name)
        points=project(positions,cam)
        met=metrics(points,obs,names)
        data=copy.deepcopy(raw)
        data.update(projected_joints=points.tolist(),spatial_joints_m=positions.tolist(),geometry=geometry,
                    soma_pose={'local_rotation_vectors':pose},camera=cam,canonical_projection=points.tolist(),
                    joint_status=base['joint_status'],placement=[],anatomy=obs['anatomy'],constraints=[],
                    metrics={'conflicts':len(met['problem_regions']),'mean_outside_interval_px':met['mean_outside_interval_px']},
                    multiview={'stage':name,'index':i,'model_id':base['model_id'],'metrics':met,
                               'camera_degrees':{'yaw':float(np.degrees(cam['yaw'])),'pitch':float(np.degrees(cam['pitch']))},
                               'changes_since_previous':camera['verification']['optimized_parameters'] if i==1 else [],
                               'reason':'Five camera parameters, all 77 local transforms frozen' if i==1 else 'Initial projection at South yaw -45 degrees' if i==0 else deltas['shared' if i==2 else 'pose' if i==3 else 'art']['reason'],
                               'south_comparison':{'projected_joints':project(base['positions_m'] if i<2 else shared_positions,base['camera_south']).tolist(),
                                                   'source':'res://modules/character-rigging-editor/soma/assets/idle/south/source.png'},
                               'source_observations':'raw owners/alpha + unrefined intervals; previous SW fit excluded',
                               'south_projection_max_change_px':south_shift if i>=2 else 0.,
                               'delta_counts':{key:len(deltas[key]['changes']) if i>=minimum else 0 for key,minimum in [('shared',2),('pose',3),('art',4)]}})
        write(MV/'stages'/f'{i:02d}.json',data)
        scenes[name]={'camera':cam,'projected_joints':points.tolist(),'positions_m':positions.tolist(),'metrics':met}
    write(MV/'stages.json',scenes)
    write(MV/'replay-validation.json',{'south_projection_max_change_px':south_shift,
         'south_baseline':metrics(original_south,south,names),'south_after_shared':metrics(refined_south,south,names),
         'south_west_stages':{name:value['metrics'] for name,value in scenes.items()},
         'baseline_fingerprint':fingerprint(base),'baseline_files_unchanged':True,
         'shared_compromise_requires_review':south_shift>1e-8})
    analysis=[]
    for item in scenes['Camera Only']['metrics']['joints']:
        if item['outside_interval_px']<=0:continue
        analysis.append(dict(item,possible_causes=['uncertain chunk-to-joint interpretation','unobserved South depth',
            'small camera/Idle pose difference','possible art difference, not established'],unique_cause=False))
    write(MV/'discrepancies.json',{'joint_interval_disagreements':analysis,
          'shoulder_roots':{'joints':['Chest','LeftShoulder','RightShoulder'],'observable':False,
                            'conclusion':'Visible arms are compatible; hidden roots are not independently confirmed by mask coverage'},
          'conclusion':'One frozen geometry/pose explains the visible segments with a changed camera. Hidden attachment positions remain conditional.',
          'art_change_confirmed':False,'camera_only_visible_match':True,'complete_anatomy_confirmed':False})
    from soma_multiview_render import render_stage, render_south
    for name,stage in scenes.items():render_stage(name,stage,base,obs)
    render_south(base,south,shared_positions)
    assert_unchanged(base)


def replay_saved():
    base=read(MV/'south-baseline.json');assert_unchanged(base)
    deltas=read(MV/'deltas.json')
    export_stages(base,load_observations(base,'idle/south-west'),load_observations(base,'idle/south'),deltas)


if __name__=='__main__':
    import sys
    action=sys.argv[1] if len(sys.argv)>1 else 'camera'
    {'build':build,'replay':replay_saved,'camera':camera_only}[action]()
