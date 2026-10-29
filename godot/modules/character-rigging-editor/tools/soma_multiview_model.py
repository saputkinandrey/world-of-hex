"""Immutable South baseline and deterministic, typed multi-view deltas."""
import copy
import hashlib
import json

import numpy as np
from scipy.spatial.transform import Rotation

from soma_common import ROOT, canonical, fk, read, sha, write
from soma_anatomy_rig import calibrated_model

MV=ROOT/'multiview'
BASE_FILES=[ROOT/'geometry.json',ROOT/'cases/idle/south.json',ROOT/'poses/idle/south.json',ROOT/'canonical.json']
STAGES=['Baseline Projection','Camera Only','Shared Geometry','Pose Delta','Art Delta','Final Comparison']


def fingerprint(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()


def snapshot():
    baseline=read(ROOT/'cases/idle/south.json')
    if baseline['geometry']!=read(ROOT/'geometry.json'):
        raise ValueError('South case and geometry.json differ; explicit baseline selection required')
    model=canonical()
    positions=fk(calibrated_model(model,baseline['geometry']),pose=baseline['soma_pose']['local_rotation_vectors'])
    np.testing.assert_allclose(positions,baseline['spatial_joints_m'],atol=1e-8)
    value={'version':'1.0.0','model_id':'Character1/idle/south@'+sha(ROOT/'cases/idle/south.json')[:16],
           'base_commit':'33d337d','source_files':{str(p):sha(p) for p in BASE_FILES},
           'canonical':model,'geometry':baseline['geometry'],'pose':baseline['soma_pose'],
           'camera_south':baseline['camera'],'positions_m':positions.tolist(),'joint_status':baseline['joint_status'],
           'source':baseline['source'],'confirmation':'image-supported baseline; depth unobserved'}
    path=MV/'south-baseline.json'
    if path.exists():
        previous=read(path)
        if fingerprint(previous)!=fingerprint(value):raise ValueError('Baseline snapshot differs; preserve this record and explicitly create a new calibration version')
        return previous
    write(path,value)
    return value


def assert_unchanged(snapshot_data):
    for path,expected in snapshot_data['source_files'].items():
        if sha(path)!=expected:raise ValueError('Protected South baseline modified: '+path)


def world_bases(model,pose):
    local=Rotation.from_quat(model['local_quaternions_xyzw']).as_matrix()@Rotation.from_rotvec(pose).as_matrix()
    bases=np.empty((77,3,3))
    for i,p in enumerate(model['parents']):bases[i]=local[i] if p<0 else bases[p]@local[i]
    return bases


def apply_delta(base,delta,geometry,pose):
    if delta['source_model_id']!=base['model_id']:raise ValueError('Delta belongs to a different baseline')
    if delta['baseline_fingerprint']!=fingerprint(base):raise ValueError('Delta baseline fingerprint mismatch')
    if delta['type'] not in ['shared_geometry','art_geometry','pose']:raise ValueError('Unsupported delta type')
    if not delta['changes']:return
    for change in delta['changes']:
        if np.asarray(change['after']).shape!=(3,) or not np.isfinite(change['after']).all():raise ValueError('Delta requires finite three-component parameters')
        joint=base['canonical']['joint_names'].index(change['joint'])
        if delta['type'] in ['shared_geometry','art_geometry']:
            actual=geometry['local_offsets_m'][joint]
            if not np.allclose(actual,change['before'],atol=1e-12,rtol=0):raise ValueError('Wrong delta order or repeated application: '+change['joint'])
            geometry['local_offsets_m'][joint]=copy.deepcopy(change['after'])
        elif delta['type']=='pose':
            if not np.allclose(pose[joint],change['before'],atol=1e-12,rtol=0):raise ValueError('Wrong pose delta order or repeated application')
            pose[joint]=copy.deepcopy(change['after'])
        else:raise ValueError('Unsupported delta type: '+delta['type'])
    if delta['type']!='pose':
        offsets=np.array(geometry['local_offsets_m'])
        geometry['length_factors']=(np.linalg.norm(offsets,axis=1)/np.maximum(1e-9,np.linalg.norm(base['canonical']['offsets_m'],axis=1))).tolist()


def replay(base,deltas,stage):
    if stage not in STAGES:raise ValueError('Unknown multi-view stage: '+stage)
    geometry=copy.deepcopy(base['geometry']);pose=copy.deepcopy(base['pose']['local_rotation_vectors'])
    camera=copy.deepcopy(deltas['camera']['initial'] if stage=='Baseline Projection' else deltas['camera']['after'])
    if camera.get('kind')!='orthographic' or any(n in camera for n in ['scale_x','scale_y']):raise ValueError('One uniform orthographic scale is required')
    if not np.isfinite([camera[n] for n in ['yaw','pitch','pixels_per_metre','tx','ty']]).all() or camera['pixels_per_metre']<=0:raise ValueError('Invalid camera parameters')
    if deltas['camera']['source_model_id']!=base['model_id'] or deltas['camera']['baseline_fingerprint']!=fingerprint(base):raise ValueError('Camera baseline mismatch')
    index=STAGES.index(stage)
    for minimum,key in [(2,'shared'),(3,'pose'),(4,'art')]:
        if deltas[key]['type']!={'shared':'shared_geometry','pose':'pose','art':'art_geometry'}[key]:raise ValueError('Delta type/order mismatch')
        if deltas[key]['view']!='south-west' or deltas[key]['image_identity']!=deltas['camera']['image_identity']:raise ValueError('Delta image/view identity mismatch')
        if index>=minimum:apply_delta(base,deltas[key],geometry,pose)
    positions=fk(calibrated_model(base['canonical'],geometry),pose=pose)
    return geometry,pose,camera,positions


def delta_record(base,kind,image,reason):
    return {'version':'1.0.0','source_model_id':base['model_id'],'baseline_fingerprint':fingerprint(base),
            'image_identity':image,'view':'south-west','type':kind,'reason':reason,
            'confirmation':'hypothesis; not promoted to baseline','changes':[],'validation':{}}
