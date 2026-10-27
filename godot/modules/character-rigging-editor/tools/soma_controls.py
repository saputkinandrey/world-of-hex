"""Held-out legacy controls. Never imported by observation building or fitting."""
import numpy as np

from soma_common import MODULE, REPO, ROOT, canonical, case_path, read, sha, write

# Approximate legacy semantics are explicit. In particular the legacy Head
# anchor is a neck pivot, not the centre of the SOMA head or a cranial landmark.
CONTROL_MAP={'Pelvis':'Hips','Spine':'Spine1','Chest':'Chest','Head':'Neck2',
             'ArmL':'LeftArm','ForearmL':'LeftForeArm','ArmR':'RightArm','ForearmR':'RightForeArm',
             'ThighL':'LeftLeg','CalfL':'LeftShin','ThighR':'RightLeg','CalfR':'RightShin'}


def audit():
    model=canonical()
    path=REPO/'godot/modules/character-animation-workbench/rig-calibration.json'
    legacy=read(path)
    output=[]
    for file in sorted((ROOT/'cases/idle').glob('*.json')):
        case=read(file)
        view=case['view']
        points=case['projected_joints']
        for label,point in legacy['views'][view].items():
            if label not in CONTROL_MAP: continue
            soma=CONTROL_MAP[label]
            output.append({'case':case['key'],'kind':'legacy rig-calibration held-out control',
                           'source':str(path),'source_sha256':sha(path),'source_joint':label,'soma_joint':soma,
                           'pixel_distance':float(np.linalg.norm(np.array(points[model['joint_names'].index(soma)])-point)),
                           'used_in_fit':False,'independent_validation':False,
                           'reason':'Source image registration and pivot semantics unverified; legacy L/R may differ. Distance is diagnostic, not anatomical accuracy.'})
        pose_path=MODULE/'poses'/view/'idle.json'
        if not pose_path.exists(): continue
        pose=read(pose_path)
        bones=pose.get('bone_names',[])
        joints=pose.get('joints',[])
        # The existing KeyPose contract lists names separately from joint coordinates.
        if isinstance(bones,list) and bones and isinstance(bones[0],str) and len(joints)==len(bones):
            for label,point in zip(bones,joints):
                if label not in CONTROL_MAP: continue
                soma=CONTROL_MAP[label]
                output.append({'case':case['key'],'kind':'legacy KeyPose held-out control','source':str(pose_path),'source_sha256':sha(pose_path),
                               'source_joint':label,'soma_joint':soma,'pixel_distance':float(np.linalg.norm(np.array(points[model['joint_names'].index(soma)])-point)),
                               'same_raw_source_signature':pose['source_signature']==case['source']['signature'],
                               'used_in_fit':False,'independent_validation':False,'reason':'Old mask-derived pivot control; approximate semantics, not independent anatomical ground truth.'})
    write(ROOT/'held-out-controls.json',{'mapping':CONTROL_MAP,'controls':output,'used_as_objective':False})


if __name__=='__main__': audit()
