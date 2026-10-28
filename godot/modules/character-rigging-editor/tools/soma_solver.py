"""Adaptive interval placement and robust FK fitting with explicit priors."""

import numpy as np
from scipy.optimize import least_squares

from soma_common import VERSION, camera_basis, fk, project
from soma_anatomy_rig import calibrated_model


CORE = ['Hips', 'Spine1', 'Spine2', 'Chest', 'Neck1', 'Neck2', 'Head', 'HeadEnd',
        'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
        'LeftLeg', 'LeftShin', 'LeftFoot', 'LeftToeBase', 'LeftToeEnd', 'RightLeg', 'RightShin', 'RightFoot', 'RightToeBase', 'RightToeEnd']
ROTATING = ['Hips', 'Spine1', 'Spine2', 'Chest', 'Neck1', 'Neck2', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm',
            'RightShoulder', 'RightArm', 'RightForeArm', 'LeftLeg', 'LeftShin', 'LeftFoot', 'RightLeg', 'RightShin', 'RightFoot']


def constraints_for(case, patch, names):
    if patch.get('source_signature') not in (None, case['source']['signature']):
        raise ValueError('Manual edits belong to different source data')
    if patch.get('calibration_identity') not in (None,case['source'].get('calibration_identity')):
        raise ValueError('Manual edits belong to different accepted mask revisions')
    constraints = []
    remaps={}
    for chunk in case['chunks']:
        if chunk['id'] in patch.get('excluded_chunks', []): continue
        mapping = patch.get('mapping', {}).get(str(chunk['id']), chunk['mapping'])
        if len(mapping) != len(chunk['mapping']) or any(j not in names for j in mapping):
            raise ValueError(f'Invalid joint mapping for chunk {chunk["id"]}')
        remaps[chunk['id']]=dict(zip(chunk['mapping'],mapping))
    # Cached anatomical observations already carry their actual joint semantics.
    # Never zip a variable list of torso observations onto four bone names.
    for observation in case.get('constraints',[]):
        owner=observation.get('source_chunk')
        if owner in patch.get('excluded_chunks',[]):continue
        joint=remaps.get(owner,{}).get(observation['joint'],observation['joint'])
        constraints.append(dict(observation,joint=joint))
    for joint, point in patch.get('pins', {}).items():
        if joint not in names or np.asarray(point).shape != (2,) or not np.isfinite(point).all():
            raise ValueError(f'Invalid manual pin: {joint}')
        constraints.append({'joint': joint, 'target': point, 'radius_px': .75, 'weight': 3., 'source_chunk': None, 'kind': 'manual_pin', 'status': 'operator-authored'})
    return constraints



def observation_residual(projected, constraints, names):
    output = []
    for c in constraints:
        delta = projected[names.index(c['joint'])] - c['target']
        distance = np.linalg.norm(delta)
        # No penalty within the visible/anatomical uncertainty interval.
        error = delta * max(0., 1-c['radius_px']/max(distance,1e-9))
        output.extend(error/max(1.,c['radius_px'])*np.sqrt(c['weight']))
    return np.array(output)


from soma_anatomy_fit import fit


def compare(model,case,points,lengths,observations,baseline):
    names = model['joint_names']
    output=[]
    for i,n in enumerate(names):
        p = model['parents'][i]
        if p<0: continue
        first=[c for c in observations if c['joint']==names[p]]
        second=[c for c in observations if c['joint']==n]
        observed = float(np.linalg.norm(np.array(first[0]['target'])-second[0]['target'])) if first and second else None
        predicted=float(np.linalg.norm(points[i]-points[p]))
        reliability=min([c['weight'] for c in first+second],default=0.)
        residual=observed-predicted if observed is not None else None
        interval = first[0]['radius_px']+second[0]['radius_px'] if first and second else 0.
        explicit = case.get('manual',{}).get('art_corrections',{}).get(n)
        classification = ('operator-confirmed art correction' if explicit else ('projection-compatible within uncertain visible intervals' if residual is not None and abs(residual)<=interval else ('ambiguous' if observed is not None else 'unobserved')))
        output.append({'bone':n,'parent':names[p], 'baseline_length_m':float(np.linalg.norm(model['offsets_m'][i])*baseline['geometry']['length_factors'][i]),
                       'current_length_m':float(np.linalg.norm(model['offsets_m'][i])*lengths[i]),
                       'observed_projection_px':observed, 'predicted_projection_px':predicted,'residual_px':residual,
                       'reliability':reliability, 'score_kind':'uncalibrated heuristic','proposed_length_correction_m':float(np.linalg.norm(model['offsets_m'][i])*(lengths[i]-baseline['geometry']['length_factors'][i])) if explicit else None,
                       'classification':classification,
                       'reason':'Pose/camera fitted first with shared baseline geometry. Visible axis boundaries are not confirmed joints; true art drift is not identifiable.'})
    return output


def accumulate(model, cases):
    """Linearised independent view constraints, gated by semantic/registration review.

    Intersect 3D ray slabs only for the SAME pose with known calibrated cameras.
    Never transfer a 2D point between different poses or count a mirror twice.
    This diagnostic does not silently overwrite the FK character geometry.
    """
    accepted=[]
    rejected=[]
    for case in cases:
        manual=case['manual']
        reason=None
        if case['pose']!='idle': reason='Different pose; no registered pose correspondence'
        elif case['source']['mirrored']: reason='Derived mirror is not independent'
        elif manual.get('art_corrections'): reason='Explicit art geometry differs from shared baseline; exclude from uncorrected accumulation'
        elif not manual.get('verified_semantics'): reason='Anatomical correspondence not explicitly verified'
        elif not manual.get('verified_registration'): reason='Image/camera registration not explicitly verified'
        if reason: rejected.append({'key':case['key'],'reason':reason})
        else: accepted.append(case)
    joints=[]
    for name in model['joint_names']:
        matrices=[]; targets=[]; keys=[]
        for case in accepted:
            obs=[c for c in case['constraints'] if c['joint']==name and not c['conflict']]
            if not obs: continue
            camera=case['camera']
            for c in obs:
                weight=np.sqrt(c['weight'])/c['radius_px']
                matrices.extend(camera_basis(camera)*camera['pixels_per_metre']*weight)
                targets.extend((np.array(c['target'])-[camera['tx'],camera['ty']])*weight)
            keys.append(case['key'])
        if len(set(keys))<2: continue
        a=np.array(matrices); b=np.array(targets)
        rank=int(np.linalg.matrix_rank(a,tol=1e-5))
        u,s,v=np.linalg.svd(a,full_matrices=False)
        joints.append({'joint':name,'cases':keys,'information_rank':rank,'singular_values':s.tolist(),
                       'status':'conditional 3D observation; cameras and correspondences assumed verified' if rank==3 else 'depth still ambiguous',
                       'candidate_position_m':np.linalg.lstsq(a,b,rcond=None)[0].tolist() if rank==3 else None,
                       'heuristic_information':(a.T@a).tolist(),'statistical_confidence':None,
                       'applied_to_geometry':False})
    result = {'version':VERSION,'accepted':[c['key'] for c in accepted],'rejected':rejected,'joints':joints,
              'geometry_updated':False,'status':'partial: no compatible verified multi-view observations',
              'warning':'Information matrices are heuristic, not calibrated covariance. Camera uncertainty and anatomy ambiguity remain.'}
    if not any(j['information_rank']==3 for j in joints): return result
    baseline=next((c for c in accepted if c['key']=='idle/south'),None)
    if baseline is None:
        result['status']='partial: verified South Idle is required to anchor the shared model'
        return result
    names=model['joint_names']
    ids=[names.index(n) for n in CORE if n!='Hips']
    rot_ids=[names.index(n) for n in ROTATING]
    ng=len(ids)
    shared=calibrated_model(model,baseline['geometry'])
    factors=np.ones(77)
    angles=np.array(baseline['soma_pose']['local_rotation_vectors'])
    def unpack(x):
        current=factors.copy(); current[ids]*=np.exp(x[:ng])
        pose=angles.copy(); pose[rot_ids]+=x[ng:].reshape(-1,3)
        return current,pose
    def residual(x,subset):
        current,pose=unpack(x)
        points=fk(shared,current,pose)
        return np.concatenate([observation_residual(project(points,c['camera']),c['constraints'],names) for c in subset])
    def objective(x):
        return np.r_[residual(x,accepted),x[:ng]*.9,x[ng:]*.2]
    x0=np.zeros(ng+len(rot_ids)*3)
    solution=least_squares(objective,x0,bounds=(-.65,.65),loss='soft_l1',f_scale=.7,max_nfev=60)
    refined,pose=unpack(solution.x)
    positions=fk(shared,refined,pose)
    # Conditional finite-difference information, includes the same priors in both comparisons.
    epsilon=1e-4
    def information(subset):
        # Linearise observation centres with their uncertainty widths. The
        # interval hinge is flat inside a valid slab and is not its information.
        def centers(x):
            current,pose=unpack(x)
            positions=fk(shared,current,pose)
            values=[]
            for case in subset:
                points=project(positions,case['camera'])
                for c in case['constraints']:
                    if c['conflict']: continue
                    values.extend((points[names.index(c['joint'])]-c['target'])/c['radius_px']*np.sqrt(c['weight']))
            return np.array(values)
        origin=centers(solution.x)
        columns=[]
        for i in range(len(x0)):
            x=solution.x.copy(); x[i]+=epsilon
            columns.append((centers(x)-origin)/epsilon)
        jac=np.array(columns).T
        return jac.T@jac+np.diag(np.r_[np.full(ng,.9**2),np.full(len(x0)-ng,.2**2)])
    before=np.linalg.inv(information([baseline]))
    after=np.linalg.inv(information(accepted))
    result.update(geometry_updated=True,status='conditional joint multi-view FK refinement; depth remains conditional on verified cameras',
                  geometry=dict(baseline['geometry'],local_offsets_m=(np.array(shared['offsets_m'])*refined[:,None]).tolist(),
                                length_factors=(np.array(baseline['geometry']['length_factors'])*refined).tolist(),
                                source='verified accumulated views', identification='conditional prior-regularized multi-view hypothesis'),
                  soma_pose={'local_rotation_vectors':pose.tolist(),'units':'radians','source':'shared Idle across verified views'},
                  projected_by_case={c['key']:project(positions,c['camera']).tolist() for c in accepted},spatial_joints_m=positions.tolist(),
                  heuristic_parameter_variance_before=np.diag(before).tolist(),heuristic_parameter_variance_after=np.diag(after).tolist(),
                  statistical_confidence=None,solver_success=bool(solution.success),solver_message=solution.message,
                  geometry_log_delta=solution.x[:ng].tolist(),observed_residual_before=float(np.linalg.norm(residual(x0,accepted))),
                  observed_residual_after=float(np.linalg.norm(residual(solution.x,accepted))))
    return result
