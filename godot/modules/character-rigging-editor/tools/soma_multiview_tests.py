"""Frozen-transform checks, raw-source controls and deterministic delta replay."""
import sys
sys.dont_write_bytecode=True
import copy
import json
from pathlib import Path
import unittest
from unittest import mock

import numpy as np
from scipy.spatial.transform import Rotation

from soma_common import ROOT, camera_basis, fk, project, read, write
from soma_anatomy_rig import calibrated_model
from soma_multiview_model import MV,STAGES,apply_delta,assert_unchanged,delta_record,fingerprint,replay,world_bases
from soma_multiview_observations import load_observations,residual


class MultiViewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base=read(MV/'south-baseline.json');cls.deltas=read(MV/'deltas.json');cls.stages=read(MV/'stages.json')
        cls.obs=load_observations(cls.base,'idle/south-west')

    def test_all_77_transforms_frozen_in_camera_only(self):
        geometry,pose,cam,positions=replay(self.base,self.deltas,'Camera Only')
        self.assertEqual(len(self.base['canonical']['parents']),77)
        self.assertEqual(geometry,self.base['geometry'])
        self.assertEqual(pose,self.base['pose']['local_rotation_vectors'])
        np.testing.assert_array_equal(positions,self.base['positions_m'])
        np.testing.assert_array_equal(world_bases(self.base['canonical'],pose),world_bases(self.base['canonical'],self.base['pose']['local_rotation_vectors']))
        np.testing.assert_allclose(project(positions,cam),self.stages['Camera Only']['projected_joints'],atol=1e-12)

    def test_exactly_five_camera_degrees_of_freedom(self):
        camera=self.deltas['camera']
        self.assertEqual(camera['verification']['degrees_of_freedom'],5)
        expected={'yaw','pitch','pixels_per_metre','tx','ty'}
        self.assertEqual(set(camera['verification']['optimized_parameters']),expected)
        self.assertEqual(set(camera['parameter_changes']),expected)
        self.assertEqual(camera['changed_joints'],[])
        self.assertEqual(camera['after']['kind'],'orthographic')

    def test_objective_does_not_read_the_previous_sw_fit(self):
        import soma_multiview
        original=Path.read_text
        prohibited=(ROOT/'cases/idle/south-west.json').resolve()
        def guarded(path,*args,**kwargs):
            if path.resolve()==prohibited:raise AssertionError('Circular use of previous SouthWest fit')
            return original(path,*args,**kwargs)
        with mock.patch.object(Path,'read_text',guarded),mock.patch.object(soma_multiview,'write'),mock.patch('soma_multiview_render.render_stage'):
            _,_,result,_=soma_multiview.camera_only()
        self.assertTrue(result['verification']['success'])
        self.assertAlmostEqual(result['after']['yaw'],self.deltas['camera']['after']['yaw'],places=9)

    def test_raw_masks_contribute_without_generated_joint_targets(self):
        observation=dict(self.obs,targets=[])
        points=np.array(self.stages['Camera Only']['projected_joints'])
        score=np.linalg.norm(residual(points,observation,self.base['canonical']['joint_names']))
        wrong=np.linalg.norm(residual(points+[18.,12.],observation,self.base['canonical']['joint_names']))
        self.assertGreater(wrong,score+5.)

    def test_replay_many_loads_does_not_accumulate(self):
        before=fingerprint(self.base);delta_before=fingerprint(self.deltas)
        for name in STAGES:
            expected=replay(self.base,self.deltas,name)
            for _ in range(8):
                loaded=json.loads(json.dumps(self.deltas))
                result=replay(self.base,loaded,name)
                self.assertEqual(result[0],expected[0]);self.assertEqual(result[1],expected[1])
                np.testing.assert_array_equal(result[3],expected[3])
        self.assertEqual(fingerprint(self.base),before);self.assertEqual(fingerprint(self.deltas),delta_before)

    def test_real_unjustified_deltas_are_empty(self):
        for key in ['shared','pose','art']:
            delta=self.deltas[key]
            self.assertEqual(delta['changes'],[])
            self.assertIn('not applied',delta['confirmation'])
            self.assertEqual(delta['validation']['south_projection_max_change_px'],0.)
        self.assertEqual(self.stages['Camera Only']['projected_joints'],self.stages['Final Comparison']['projected_joints'])

    def sample_deltas(self):
        values=copy.deepcopy(self.deltas);base=self.base;model=base['canonical'];names=model['joint_names']
        i=names.index('Chest');parent=model['parents'][i]
        bases=world_bases(model,base['pose']['local_rotation_vectors'])
        ray=np.cross(*camera_basis(base['camera_south']))
        old=np.array(base['geometry']['local_offsets_m'][i]);new=old+bases[parent].T@ray*.001
        values['shared']['changes']=[{'joint':'Chest','before':old.tolist(),'after':new.tolist(),'reason':'Synthetic one-mm null-space fixture, not a real correction'}]
        j=names.index('LeftArm');old_pose=base['pose']['local_rotation_vectors'][j]
        after=(Rotation.from_rotvec(old_pose)*Rotation.from_rotvec([0,0,.01])).as_rotvec().tolist()
        values['pose']['changes']=[{'joint':'LeftArm','before':old_pose,'after':after,'reason':'Synthetic local pose fixture'}]
        return values

    def test_nonempty_shared_depth_delta_preserves_south_projection(self):
        deltas=self.sample_deltas()
        geometry,pose,_,world=replay(self.base,deltas,'Shared Geometry')
        self.assertNotEqual(geometry,self.base['geometry'])
        self.assertEqual(pose,self.base['pose']['local_rotation_vectors'])
        np.testing.assert_allclose(project(world,self.base['camera_south']),project(self.base['positions_m'],self.base['camera_south']),atol=1e-10)
        np.testing.assert_array_equal(world,replay(self.base,deltas,'Shared Geometry')[3])

    def test_nonempty_pose_delta_does_not_change_lengths(self):
        deltas=self.sample_deltas();a=replay(self.base,deltas,'Shared Geometry');b=replay(self.base,deltas,'Pose Delta')
        self.assertEqual(a[0],b[0]);self.assertNotEqual(a[1],b[1])
        parents=self.base['canonical']['parents']
        for i,p in enumerate(parents):
            if p>=0:self.assertAlmostEqual(np.linalg.norm(a[3][i]-a[3][p]),np.linalg.norm(b[3][i]-b[3][p]),places=10)

    def test_art_delta_is_separate_from_shared_geometry(self):
        deltas=self.sample_deltas();geometry,pose,_,_=replay(self.base,deltas,'Pose Delta')
        i=self.base['canonical']['joint_names'].index('RightForeArm');old=geometry['local_offsets_m'][i]
        deltas['art']['changes']=[{'joint':'RightForeArm','before':old,'after':(np.array(old)*1.01).tolist(),'reason':'Synthetic explicit art fixture, not current evidence'}]
        result=replay(self.base,deltas,'Art Delta')
        self.assertNotEqual(result[0],geometry)
        self.assertEqual(replay(self.base,deltas,'Shared Geometry')[0],replay(self.base,self.sample_deltas(),'Shared Geometry')[0])
        self.assertEqual(result[1],pose)

    def test_repeated_or_wrong_model_delta_rejected(self):
        delta=self.sample_deltas()['shared'];geometry=copy.deepcopy(self.base['geometry']);pose=copy.deepcopy(self.base['pose']['local_rotation_vectors'])
        apply_delta(self.base,delta,geometry,pose)
        with self.assertRaises(ValueError):apply_delta(self.base,delta,geometry,pose)
        bad=copy.deepcopy(self.deltas);bad['shared']['source_model_id']='wrong'
        with self.assertRaises(ValueError):replay(self.base,bad,'Shared Geometry')
        bad=copy.deepcopy(self.deltas);bad['pose']['image_identity']='wrong'
        with self.assertRaises(ValueError):replay(self.base,bad,'Pose Delta')

    def test_nonuniform_camera_rejected(self):
        bad=copy.deepcopy(self.deltas);bad['camera']['after']['scale_x']=2.
        with self.assertRaises(ValueError):replay(self.base,bad,'Camera Only')

    def test_original_files_and_source_masks_unchanged(self):
        assert_unchanged(self.base)
        from soma_sources import inventory
        dataset=inventory()
        for key in ['idle/south','idle/south-west']:
            self.assertEqual(dataset.signature(key),read(ROOT/'observations'/f'{key}.json')['source']['signature'])


if __name__=='__main__':
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(MultiViewTests))
    write(MV/'test-validation.json',{'tests':result.testsRun,'success':result.wasSuccessful(),'failures':len(result.failures),'errors':len(result.errors),
                                  'scope':['idle/south','idle/south-west'],'all_77_camera_only_frozen':True if result.wasSuccessful() else None,
                                  'nonempty_deltas':'synthetic application fixtures only; real changes remain empty'})
    sys.exit(0 if result.wasSuccessful() else 1)
