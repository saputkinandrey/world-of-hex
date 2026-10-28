"""CPU invariants and calibrated claims tested against synthetic/actual evidence."""
import copy
import unittest
from unittest import mock
import sys
sys.dont_write_bytecode=True

import numpy as np
from scipy.spatial.transform import Rotation

from soma_common import ROOT, canonical, case_path, fk, overrides, project, read, write
from soma_solver import accumulate, constraints_for, fit, observation_residual
from soma_sources import EXPECTED, MAPPING, analyze, inventory


class CalibrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model=canonical()
        cls.base=read(case_path('idle/south'))

    def test_exact_77_hierarchy(self):
        self.assertEqual(len(self.model['parents']),77)
        self.assertEqual(self.model['parents'].count(-1),1)
        self.assertTrue(all(p<i for i,p in enumerate(self.model['parents'])))
        self.assertTrue(all(n in self.model['joint_names'] for mapping in MAPPING.values() for n in mapping))

    def test_parent_rotation_composes_child_offset(self):
        model=copy.deepcopy(self.model)
        root_rotation=Rotation.from_euler('z',90,degrees=True)
        model['local_quaternions_xyzw'][0]=root_rotation.as_quat().tolist()
        identity_model=copy.deepcopy(model)
        identity_model['local_quaternions_xyzw'][0]=[0,0,0,1]
        root=np.array(model['offsets_m'][0])
        expected=root_rotation.apply(fk(identity_model)-root)+root
        np.testing.assert_allclose(fk(model),expected,atol=1e-8)

    def test_lengths_invariant_to_pose(self):
        pose=np.zeros((77,3)); pose[12]=[.3,-.4,1.]
        positions=fk(self.model,pose=pose)
        for i,p in enumerate(self.model['parents']):
            if p>=0:
                self.assertAlmostEqual(np.linalg.norm(positions[i]-positions[p]),np.linalg.norm(self.model['offsets_m'][i]),places=7)

    def test_orthographic_native_pixels_and_foreshortening(self):
        cam={'yaw':0.,'pitch':0.,'pixels_per_metre':20.,'tx':50.,'ty':80.}
        points=np.array([[0,0,0],[1,0,0],[0,1,0],[0,0,1]])
        np.testing.assert_allclose(project(points,cam),[[50,80],[70,80],[50,60],[50,80]])
        cam['yaw']=np.pi/3
        self.assertAlmostEqual(np.linalg.norm(np.diff(project(points[:2],cam),axis=0)),10.)

    def test_puzzle_priority_and_causal_states(self):
        from soma_anatomy import reconstruct
        from prepare import owners_for
        dataset=inventory();entry,owners,_=owners_for(dataset,'idle/south')
        case=copy.deepcopy(self.base)
        for chunk in case['chunks']:
            chunk['score']=.05 if chunk['id'] in [2,3,10,11,12,13] else .9
        state=reconstruct(case,self.model,entry.alpha,owners)
        order=[step['name'] for step in state['steps']]
        self.assertEqual(state['steps'][0]['after'],{})
        self.assertLess(order.index('Right foot recovery'),order.index('Right arm reconstruction'))
        self.assertTrue(any(t['to']=='LeftShin' for t in state['knowledge']['transfers']))
        self.assertTrue(self.base['refinement']['hypothesis_used_as_initial_state'])

    def test_conflicting_segmentation_is_not_forced_into_anatomy(self):
        conflicts=self.base['metrics']['anatomical_conflicts']
        self.assertTrue(any('boundary' in reason and 'knee' in reason for reason in conflicts))
        i=self.model['joint_names'].index('LeftShin')
        self.assertLess(self.base['projected_joints'][i][1],94.)
        self.assertGreater(self.base['joint_status'][i]['heuristic_radius_px'],0.)

    def test_partial_and_missing_are_explicit(self):
        chunks=self.base['chunks']
        self.assertTrue(all(c['score_kind']=='uncalibrated heuristic' for c in chunks))
        self.assertFalse(any(c['status']=='reliable' for c in chunks))
        self.assertEqual([c['id'] for c in chunks if c['status']=='missing'],[4,5])
        self.assertTrue(all(not c['constraints'] for c in chunks if c['status']=='missing'))
        self.assertFalse(self.base['metrics']['identified_3d'])
        self.assertTrue(all(j['depth_status'].startswith('unobserved') for j in self.base['joint_status']))

    def test_connectivity_alone_is_not_reliability(self):
        class Entry: pass
        entry=Entry(); entry.original=np.ones((16,16),np.uint8); entry.provenance=np.ones((16,16),np.uint8)
        owners=np.ones((16,16),np.uint8)
        chunks=analyze(entry,owners,{i:str(i) for i in range(1,15)},{'status':'Not reviewed'})
        self.assertNotEqual(chunks[0]['status'],'reliable')
        self.assertEqual(chunks[0]['components'],1)

    def test_large_symmetric_head_cannot_hide_asymmetric_limbs(self):
        from soma_anatomy import pose_symmetry
        from prepare import owners_for
        dataset=inventory();entry,owners,_=owners_for(dataset,'idle/south')
        silhouette=entry.alpha.copy();silhouette[owners==12]=False
        result=pose_symmetry(silhouette,owners==1,'south')
        self.assertGreater(result['silhouette_mirror_iou'],.87)
        self.assertFalse(result['pose_symmetric'])

    def test_intervals_do_not_force_boundary_into_joint(self):
        c={'joint':'Hips','target':[0,0],'radius_px':5,'weight':1}
        points=np.zeros((77,2)); points[0]=[3,0]
        np.testing.assert_array_equal(observation_residual(points,[c],self.model['joint_names']),[0,0])

    def test_manual_mapping_pins_and_stale_identity(self):
        patch=overrides('idle/south')
        patch['mapping']={'2':['LeftHand']}
        patch['pins']={'Hips':[55.,65.]}
        values=constraints_for(self.base,patch,self.model['joint_names'])
        from soma_anatomy_fit import apply_overrides
        state=copy.deepcopy(self.base['anatomy'])
        expected=state['joints']['RightHand']['point']
        apply_overrides(state,self.base,patch,self.model)
        self.assertEqual(state['joints']['LeftHand']['point'],expected)
        self.assertEqual(values[-1]['kind'],'manual_pin')
        patch['mapping']['2']=['InventedJoint']
        with self.assertRaises(ValueError): constraints_for(self.base,patch,self.model['joint_names'])
        patch=overrides('idle/south'); patch['source_signature']={'stale':True}
        with self.assertRaises(ValueError): constraints_for(self.base,patch,self.model['joint_names'])
        patch=overrides('idle/south'); patch['calibration_identity']={'wrong_owner_hash':True}
        with self.assertRaises(ValueError): constraints_for(self.base,patch,self.model['joint_names'])

    def test_manual_roundtrip_separate_file(self):
        path=ROOT/'cache/tests/manual.json'
        patch=overrides('idle/south'); patch['pins']={'Head':[44.125,20.75]}
        write(path,patch)
        self.assertEqual(read(path),patch)

    def test_other_views_share_geometry_and_keep_residuals(self):
        for key in ['walk/south','idle/south-west','idle/north','idle/north-west']:
            case=read(case_path(key))
            self.assertEqual(case['geometry']['length_factors'],self.base['geometry']['length_factors'])
            self.assertEqual(len(case['comparison']),76)
            self.assertTrue(all(row['proposed_length_correction_m'] is None for row in case['comparison']))
            self.assertIsInstance(case['metrics']['anatomical_conflicts'],list)
            from soma_anatomy_rig import calibrated_model
            self.assertEqual(case['geometry']['local_offsets_m'],self.base['geometry']['local_offsets_m'])
            np.testing.assert_allclose(fk(calibrated_model(self.model,case['geometry']),pose=case['soma_pose']['local_rotation_vectors']),case['spatial_joints_m'],atol=1e-7)

    def test_no_unverified_accumulation(self):
        cases=[self.base,read(case_path('idle/south-west'))]
        result=accumulate(self.model,cases)
        self.assertEqual(result['accepted'],[])
        self.assertFalse(result['geometry_updated'])

    def synthetic_views(self):
        points=fk(self.model)
        cases=[]
        for key,yaw in [('idle/south',0.),('idle/south-west',-.8)]:
            cam={'kind':'orthographic','yaw':yaw,'pitch':.1,'pixels_per_metre':40.,'tx':70.,'ty':100.}
            projected=project(points,cam)
            obs=[]
            for i,name in enumerate(self.model['joint_names']):
                obs.append({'joint':name,'target':projected[i].tolist(),'radius_px':1.,'weight':.8,'source_chunk':1,'conflict':False})
            cases.append({'key':key,'pose':'idle','source':{'mirrored':False},'manual':{'verified_semantics':True,'verified_registration':True},
                          'constraints':obs,'geometry':{'id':'Character1/idle/south','length_factors':[1.]*77},
                          'soma_pose':{'local_rotation_vectors':np.zeros((77,3)).tolist()},'camera':cam})
        return cases

    def test_registered_views_add_rank_and_refine_shared_model(self):
        cases=self.synthetic_views()
        result=accumulate(self.model,cases)
        self.assertTrue(result['geometry_updated'])
        self.assertTrue(all(j['information_rank']==3 for j in result['joints']))
        before=np.array(result['heuristic_parameter_variance_before'])
        after=np.array(result['heuristic_parameter_variance_after'])
        self.assertTrue(np.all(after<=before+1e-6))
        self.assertTrue(np.any(after<before-.01))
        self.assertEqual(len(result['geometry']['length_factors']),77)
        self.assertIsNone(result['statistical_confidence'])

    def test_mirrors_and_different_poses_cannot_supply_depth(self):
        cases=self.synthetic_views()
        cases[1]['source']['mirrored']=True
        self.assertFalse(accumulate(self.model,cases)['geometry_updated'])
        cases=self.synthetic_views(); cases[1]['pose']='walk'
        self.assertFalse(accumulate(self.model,cases)['geometry_updated'])
        cases=self.synthetic_views(); cases[1]['manual']['art_corrections']={'LeftForeArm':{'confirmed':True,'multiplier':1.1}}
        self.assertFalse(accumulate(self.model,cases)['geometry_updated'])

    def test_parallel_views_leave_depth_ambiguous(self):
        cases=self.synthetic_views()
        cases[1]['camera']=copy.deepcopy(cases[0]['camera'])
        result=accumulate(self.model,cases)
        self.assertFalse(result['geometry_updated'])
        self.assertTrue(all(j['information_rank']==2 for j in result['joints']))

    def test_source_signatures_still_match(self):
        dataset=inventory()
        for key in dataset.keys:
            source=read(ROOT/'observations'/case_path(key).relative_to(ROOT/'cases'))
            self.assertEqual(dataset.signature(key),source['source']['signature'])

    def test_bad_art_change_rejected(self):
        patch=overrides('walk/south')
        patch['art_corrections']={'LeftForeArm':{'multiplier':1.1,'confirmed':False,'reason':'test'}}
        with self.assertRaises(ValueError): fit(self.model,read(ROOT/'observations/walk/south.json'),patch,self.base)

    def test_wrong_semantic_pixels_do_not_dominate_anatomy(self):
        from prepare import owners_for
        dataset=inventory();entry,owners,_=owners_for(dataset,'idle/south')
        bad=owners.copy();yy,xx=np.indices(bad.shape)
        bad[entry.alpha&(yy>=99)&(xx>=64)]=10
        result=fit(self.model,self.base,overrides('idle/south'),diagnostic_input=(entry.alpha.copy(),bad))
        self.assertTrue(any('Owner 10' in r for r in result['metrics']['anatomical_conflicts']))
        indices=[self.model['joint_names'].index(n) for n in ['LeftArm','LeftForeArm','RightArm','RightForeArm']]
        delta=np.array(result['projected_joints'])[indices]-np.array(self.base['projected_joints'])[indices]
        self.assertLess(float(np.linalg.norm(delta,axis=1).max()),1.)
        np.testing.assert_array_equal(owners,dataset.entry('idle/south').filled)

    def test_confirmed_art_change_is_explicit_and_local(self):
        patch=overrides('idle/south-west')
        patch['art_corrections']={'LeftForeArm':{'multiplier':1.1,'confirmed':True,'reason':'Synthetic operator confirmation for storage test'}}
        result=fit(self.model,read(ROOT/'observations/idle/south-west.json'),patch,self.base)
        i=self.model['joint_names'].index('LeftForeArm')
        self.assertAlmostEqual(result['geometry']['length_factors'][i],self.base['geometry']['length_factors'][i]*1.1)
        for j in range(77):
            if j!=i: self.assertEqual(result['geometry']['length_factors'][j],self.base['geometry']['length_factors'][j])
        row=next(r for r in result['comparison'] if r['bone']=='LeftForeArm')
        self.assertEqual(row['classification'],'operator-confirmed art correction')
        self.assertIsNotNone(row['proposed_length_correction_m'])
        path=ROOT/'cache/tests/art.json'
        write(path,patch)
        self.assertEqual(read(path)['art_corrections'],patch['art_corrections'])

    def test_failed_dependent_refit_does_not_publish_mixed_geometry(self):
        import soma_build
        request={'job':'test-staging','key':'idle/south','overrides':overrides('idle/south')}
        original_read=soma_build.read
        def read_request(path):
            return request if str(path).endswith('refit-request.json') else original_read(path)
        with mock.patch.object(soma_build,'read',side_effect=read_request), \
             mock.patch.object(soma_build,'load_case',return_value=read(ROOT/'observations/idle/south.json')), \
             mock.patch.object(soma_build,'fit',side_effect=[self.base,ValueError('stale dependent view')]), \
             mock.patch.object(soma_build,'persist_fit') as persist, \
             mock.patch.object(soma_build,'write') as persist_json:
            with self.assertRaisesRegex(ValueError,'stale dependent view'): soma_build.refit()
            persist.assert_not_called()
            persist_json.assert_not_called()


if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(CalibrationTests)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    write(ROOT/'test-validation.json',{'tests':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'success':result.wasSuccessful(),
                                      'source_cases':32,'hierarchy_joints':77,'claims':'synthetic mathematical checks plus actual immutable source signatures; no anatomical ground truth'})
    sys.exit(0 if result.wasSuccessful() else 1)
