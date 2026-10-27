"""Adaptive interval placement and robust FK fitting with explicit priors."""
import copy

import numpy as np
from scipy.optimize import least_squares

from soma_common import VERSION, camera_basis, fk, project

YAW = {'south': 0., 'north': np.pi, 'south-west': -np.pi/4, 'north-west': -3*np.pi/4}
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
    for chunk in case['chunks']:
        if chunk['id'] in patch.get('excluded_chunks', []): continue
        mapping = patch.get('mapping', {}).get(str(chunk['id']), chunk['mapping'])
        if len(mapping) != len(chunk['mapping']) or any(j not in names for j in mapping):
            raise ValueError(f'Invalid joint mapping for chunk {chunk["id"]}')
        for observation, joint in zip(chunk['constraints'], mapping):
            value = dict(observation, joint=joint)
            constraints.append(value)
    for joint, point in patch.get('pins', {}).items():
        if joint not in names or np.asarray(point).shape != (2,) or not np.isfinite(point).all():
            raise ValueError(f'Invalid manual pin: {joint}')
        constraints.append({'joint': joint, 'target': point, 'radius_px': .75, 'weight': 3., 'source_chunk': None, 'kind': 'manual_pin', 'status': 'operator-authored'})
    return constraints


def placement(chunks, constraints, names):
    """Choose by quality plus support from already placed semantic neighbours."""
    pending = [c for c in chunks if c['status'] != 'missing' and any(o['source_chunk']==c['id'] for o in constraints)]
    used = []
    estimates = {}
    steps = []
    accumulated = []
    while pending:
        def priority(chunk):
            observations = [c for c in constraints if c['source_chunk']==chunk['id']]
            shared = sum(o['joint'] in estimates for o in observations)
            support = len(set(chunk['neighbors']) & set(used))
            return chunk['score'] * (1+.16*support+.2*shared) * (1+.08*len(observations))
        selected = max(pending, key=priority)
        chosen_priority = priority(selected)
        neighbors = sorted(set(selected['neighbors']) & set(used))
        observations = [c for c in constraints if c['source_chunk']==selected['id']]
        before = copy.deepcopy(estimates)
        accumulated.extend(observations)
        for joint in {o['joint'] for o in observations}:
            items = [o for o in accumulated if o['joint']==joint]
            weights = np.array([o['weight']/o['radius_px']**2 for o in items])
            center = np.average([o['target'] for o in items], weights=weights, axis=0)
            # Includes disagreement: conflicting evidence must not reduce uncertainty.
            disagreement = max(np.linalg.norm(np.asarray(o['target'])-center) for o in items)
            radius = float(np.sqrt(1/weights.sum())+disagreement)
            estimates[joint] = {'point': center.tolist(), 'heuristic_radius_px': radius, 'evidence_count': len(items)}
        used.append(selected['id'])
        pending.remove(selected)
        steps.append({'step': len(steps)+1, 'chunk': selected['id'], 'name': selected['name'], 'priority': chosen_priority,
                      'why': 'Maximum current quality * neighbour support * shared-joint support * constraint count',
                      'quality': selected['score'], 'used_neighbors': neighbors, 'constrained_joints': [o['joint'] for o in observations],
                      'before': before, 'after': copy.deepcopy(estimates), 'unknown_joints': [j for j in names if j not in estimates],
                      'unknown_depth': 'All joints: canonical prior; single-view depth unobserved',
                      'remaining_prior_only_joints': len(names)-len(estimates)})
    return steps


def seed_camera(model, case):
    positions = fk(model)
    landmarks = np.array([p for c in case['chunks'] for p in c.get('landmarks', [])])
    height = np.ptp(positions[:,1])
    scale = np.ptp(landmarks[:,1])/height if len(landmarks) else 40.
    w,h = case['source']['native_size']
    return {'kind': 'orthographic', 'yaw': YAW[case['view']], 'pitch': 0., 'pixels_per_metre': float(scale),
            'tx': w/2, 'ty': h*.94, 'axis': 'Y-up; image Y-down; native pixels'}


def observation_residual(projected, constraints, names):
    output = []
    for c in constraints:
        delta = projected[names.index(c['joint'])] - c['target']
        distance = np.linalg.norm(delta)
        # No penalty within the visible/anatomical uncertainty interval.
        error = delta * max(0., 1-c['radius_px']/max(distance,1e-9))
        output.extend(error/max(1.,c['radius_px'])*np.sqrt(c['weight']))
    return np.array(output)


def fit(model, case, patch, baseline=None):
    names = model['joint_names']
    observations = constraints_for(case, patch, names)
    steps = placement(case['chunks'], observations, names)
    is_base = case['key']=='idle/south'
    if not is_base and baseline is None:
        raise ValueError('South Idle baseline must be fitted first')
    geometry_ids = [names.index(n) for n in CORE if n!='Hips'] if is_base else []
    pose_ids = [names.index(n) for n in ROTATING] if is_base or case['pose']!='idle' else []
    # A manually pinned digit can articulate its own chain without moving the
    # entire torso. The original 77-joint hierarchy remains unchanged.
    for name in patch.get('pins',{}):
        index=model['parents'][names.index(name)]
        while index>=0:
            if index not in pose_ids: pose_ids.append(index)
            index=model['parents'][index]
    factors = np.ones(77) if is_base else np.array(baseline['geometry']['length_factors'])
    pose = np.zeros((77,3)) if is_base else np.array(baseline['soma_pose']['local_rotation_vectors'])
    corrections = patch.get('art_corrections', {})
    for joint, correction in corrections.items():
        if is_base or joint not in names or model['parents'][names.index(joint)]<0 or not correction.get('confirmed') or not correction.get('reason', '').strip():
            raise ValueError('Art corrections require a named non-baseline bone, explicit confirmation and reason')
        multiplier = float(correction['multiplier'])
        if not .25<=multiplier<=4: raise ValueError('Art length multiplier must be in [0.25,4]')
        factors[names.index(joint)] *= multiplier
    cam = seed_camera(model,case)
    base_pose = pose.copy()
    ng, nr = len(geometry_ids), 3*len(pose_ids)
    x0 = np.zeros(ng+nr+5)
    x0[-5:] = [0,0,np.log(cam['pixels_per_metre']),cam['tx'],cam['ty']]
    initial_scale = cam['pixels_per_metre']

    def unpack(x):
        lengths = factors.copy()
        lengths[geometry_ids] *= np.exp(x[:ng])
        angles = base_pose.copy()
        if nr: angles[pose_ids] += x[ng:ng+nr].reshape(-1,3)
        camera = dict(cam, yaw=cam['yaw']+x[-5], pitch=x[-4], pixels_per_metre=float(np.exp(x[-3])), tx=float(x[-2]), ty=float(x[-1]))
        return lengths, angles, camera

    def residual(x):
        lengths, angles, camera = unpack(x)
        error = observation_residual(project(fk(model,lengths,angles),camera),observations,names)
        # A prior-selected representative, never a statistically identified 3D reconstruction.
        regularization = np.r_[x[:ng]*.65, x[ng:ng+nr]*.10, x[-5]*.3, x[-4]*.4, (x[-3]-np.log(initial_scale))*.12]
        if ng: regularization=np.r_[regularization, np.mean(x[:ng])*2.]
        return np.r_[error,regularization]

    lower = np.r_[np.full(ng,np.log(.35)),np.full(nr,-2.7),-.65,-.65,np.log(5.),-500.,-500.]
    upper = np.r_[np.full(ng,np.log(2.7)),np.full(nr,2.7),.65,.65,np.log(300.),500.,500.]
    solution = least_squares(residual,x0,bounds=(lower,upper),loss='soft_l1',f_scale=.7,max_nfev=90,ftol=2e-5,xtol=2e-5,gtol=2e-5)
    lengths, angles, camera = unpack(solution.x)
    points3 = fk(model,lengths,angles)
    points2 = project(points3,camera)
    canonical2 = project(fk(model),camera)
    errors = []
    for c in observations:
        d = float(np.linalg.norm(points2[names.index(c['joint'])]-c['target']))
        errors.append(dict(c, distance_px=d, outside_interval_px=max(0.,d-c['radius_px']), conflict=d>c['radius_px']*2))
    observed = {c['joint'] for c in observations}
    joint_status = [{'joint': n, 'position_2d': points2[i].tolist(), 'position_3d_m': points3[i].tolist(),
                     'status': 'operator-constrained' if n in patch.get('pins',{}) else ('hypothesis' if n in observed else 'canonical-prior-only'),
                     'depth_status': 'unobserved; regularized canonical prior', 'statistical_confidence': None} for i,n in enumerate(names)]
    return dict(case, canonical_sha256=model['source_sha256'], constraints=errors, placement=steps,
                canonical_projection=canonical2.tolist(), projected_joints=points2.tolist(), spatial_joints_m=points3.tolist(),
                geometry={'id':'Character1/idle/south', 'length_factors':lengths.tolist(), 'units':'metres',
                          'identification':'prior-regularized hypothesis; absolute metric scale unobserved',
                          'source':'South Idle' if is_base else 'shared South Idle; explicit art corrections only',
                          'depth':'unobserved; no independent depth reconstruction', 'art_corrections':corrections},
                soma_pose={'local_rotation_vectors':angles.tolist(),'units':'radians','source':case['key']}, camera=camera, joint_status=joint_status,
                manual=patch, metrics={'solver_success':bool(solution.success),'solver_message':solution.message,'evaluations':solution.nfev,
                                      'robust_cost':float(solution.cost),'mean_outside_interval_px':float(np.mean([c['outside_interval_px'] for c in errors])) if errors else None,
                                      'conflicts':sum(c['conflict'] for c in errors),'identified_3d':False,'statistical_confidence':None},
                comparison=compare(model,dict(case,manual=patch),points2,lengths,errors,baseline) if baseline else [],
                refinement={'before':'placement interval fusion','after':'joint robust FK optimization; early constraints remain movable',
                            'projected_before':steps[-1]['after'] if steps else {}, 'projected_after':points2.tolist()})


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
    factors=np.array(baseline['geometry']['length_factors'])
    angles=np.array(baseline['soma_pose']['local_rotation_vectors'])
    def unpack(x):
        current=factors.copy(); current[ids]*=np.exp(x[:ng])
        pose=angles.copy(); pose[rot_ids]+=x[ng:].reshape(-1,3)
        return current,pose
    def residual(x,subset):
        current,pose=unpack(x)
        points=fk(model,current,pose)
        return np.concatenate([observation_residual(project(points,c['camera']),c['constraints'],names) for c in subset])
    def objective(x):
        return np.r_[residual(x,accepted),x[:ng]*.9,x[ng:]*.2]
    x0=np.zeros(ng+len(rot_ids)*3)
    solution=least_squares(objective,x0,bounds=(-.65,.65),loss='soft_l1',f_scale=.7,max_nfev=60)
    refined,pose=unpack(solution.x)
    positions=fk(model,refined,pose)
    # Conditional finite-difference information, includes the same priors in both comparisons.
    epsilon=1e-4
    def information(subset):
        # Linearise observation centres with their uncertainty widths. The
        # interval hinge is flat inside a valid slab and is not its information.
        def centers(x):
            current,pose=unpack(x)
            positions=fk(model,current,pose)
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
                  geometry=dict(baseline['geometry'],length_factors=refined.tolist(),source='verified accumulated views', identification='conditional prior-regularized multi-view hypothesis'),
                  soma_pose={'local_rotation_vectors':pose.tolist(),'units':'radians','source':'shared Idle across verified views'},
                  projected_by_case={c['key']:project(positions,c['camera']).tolist() for c in accepted},spatial_joints_m=positions.tolist(),
                  heuristic_parameter_variance_before=np.diag(before).tolist(),heuristic_parameter_variance_after=np.diag(after).tolist(),
                  statistical_confidence=None,solver_success=bool(solution.success),solver_message=solution.message,
                  geometry_log_delta=solution.x[:ng].tolist(),observed_residual_before=float(np.linalg.norm(residual(x0,accepted))),
                  observed_residual_after=float(np.linalg.norm(residual(solution.x,accepted))))
    return result
