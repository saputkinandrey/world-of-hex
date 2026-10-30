"""Convert hand-reviewed edits to existing sparse Offset Overrides; no fitting."""
import copy
import numpy as np
from scipy.spatial.transform import Rotation
from soma_common import ROOT, read, write, camera_basis, project

OUT=ROOT/'rig-editor'


def transforms(seed, joints):
    model=seed['canonical']
    local=Rotation.from_quat(model['local_quaternions_xyzw']).as_matrix() @ Rotation.from_rotvec(seed['base_pose']['local_rotation_vectors']).as_matrix()
    offsets=np.array(seed['geometry']['local_offsets_m'])
    positions=np.empty((77,3));bases=np.empty((77,3,3))
    for i,parent in enumerate(model['parents']):
        correction=joints.get(model['joint_names'][i],{})
        offset=offsets[i]+correction.get('local_offset_delta',np.zeros(3))
        if parent<0:
            positions[i]=offset+seed['base_pose']['root_translation_m'];bases[i]=local[i]
        else:
            positions[i]=positions[parent]+bases[parent]@offset;bases[i]=bases[parent]@local[i]
    return positions,bases


def prepare():
    seed=read(OUT/'seed.json');review=read(OUT/'north-west-review.json')
    names=seed['canonical']['joint_names'];hips=names.index('Hips')
    original={'camera':seed['cameras']['north-west'], 'anchor':seed['anchors']['idle/north-west'],
              'lens':seed['overrides']['idle/north-west']}
    positions,_=transforms(seed,{})
    anchor=copy.deepcopy(original['anchor'])
    delta=np.array(review['registration_hips_px'])-anchor['target_px']
    anchor['offset_px']=(np.array(anchor['offset_px'])+delta).tolist();anchor['target_px']=review['registration_hips_px']
    profiles={'Provisional':copy.deepcopy(original),'Anchor only':dict(camera=copy.deepcopy(original['camera']),anchor=anchor,lens={'enabled':True,'joints':{}})}
    for item in review['camera_candidates']:
        camera=copy.deepcopy(original['camera'])
        camera.update(yaw=float(np.radians(item['yaw_degrees'])),pitch=float(np.radians(item['pitch_degrees'])),status='manual visual camera hypothesis')
        projected=project(positions,dict(camera,tx=0.,ty=0.))
        a=dict(joint='Hips',target_px=review['registration_hips_px'],offset_px=(np.array(review['registration_hips_px'])-projected[hips]).tolist())
        profiles[item['name']]=dict(camera=camera,anchor=a,lens={'enabled':True,'joints':{}})
    working=copy.deepcopy(profiles[review['chosen_camera']]);joints=working['lens']['joints']
    camera=working['camera'];basis=camera_basis(camera)
    # Explicit camera-plane edit: depth is unchanged. Parents are processed
    # before descendants so each delta remains parent-local and relative.
    for name,target in review['manual_points_px'].items():
        positions,bases=transforms(seed,joints)
        i=names.index(name);parent=seed['canonical']['parents'][i]
        current=project(positions,dict(camera,tx=working['anchor']['offset_px'][0],ty=working['anchor']['offset_px'][1]))[i]
        world_delta=basis.T@(np.array(target)-current)/camera['pixels_per_metre']
        local_delta=bases[parent].T@world_delta
        joints[name]={'local_offset_delta':local_delta.tolist()}
    working['camera']['status']='working: visually reviewed NW / linked NE'
    profiles['Working']=working
    value=dict(version=1,model_id=seed['model_id'],baseline_fingerprint=seed['baseline_fingerprint'],
               chosen_camera=review['chosen_camera'],profiles=profiles,review=review,
               notes='Sparse hand-reviewed local offsets, composed before FK. Immutable seed and South Base Pose retained. Reflection link is explicit and detachable.')
    write(OUT/'north-west-calibration.json',value)
    print({'profiles':list(profiles),'corrected_joints':len(joints),'camera':camera,'anchor':working['anchor']})


if __name__=='__main__':prepare()
