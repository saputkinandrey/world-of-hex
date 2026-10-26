"""Required A-H invariants with small independent topologies."""
import unittest
import numpy as np
from core import flood, transfer, transform, provenance, invariants, CROSS


class Algorithms(unittest.TestCase):
    def test_explicit_baseline_override_is_inherited_by_mirror(self):
        from pipeline import baseline_for
        atlas = {'pose':'idle','direction':'south-east','source_direction':'south-west','mirrored':True}
        cfg = {'baseline_frame':0,'atlas_overrides':{'idle/south-west':2}}
        self.assertEqual(baseline_for(atlas,cfg),2)
        cfg['atlas_overrides']['idle/south-east']=1
        with self.assertRaises(ValueError):
            baseline_for(atlas,cfg)

    def test_fixed_seeds_and_no_outside_fill(self):
        a = np.array([[0,1,1,1,0],[0,1,0,1,0]],bool)
        original = np.zeros(a.shape,np.uint8)
        original[0,1]=1
        result,ambiguous,distance = flood(original,a,4,2)
        invariants(original,result,a,provenance(result,original,a))
        self.assertEqual(int(result[1,2]),0)
        self.assertEqual(int(result[1,3]),1)

    def test_equal_group_distance_remains_unknown(self):
        original = np.array([[1,0,0,0,2]],np.uint8)
        filled,ambiguous,_ = flood(original,np.ones_like(original,bool),4,2)
        np.testing.assert_array_equal(filled,[[1,1,0,2,2]])
        self.assertTrue(ambiguous[0,2])

    def test_same_group_multiple_seeds_are_not_a_conflict(self):
        original = np.array([[1,0,1]],np.uint8)
        filled,ambiguous,_ = flood(original,np.ones_like(original,bool),1,2)
        self.assertEqual(int(filled[0,1]),1)
        self.assertFalse(ambiguous.any())

    def test_geodesic_radius_and_labeled_barrier(self):
        original = np.array([[1,0,2,0,0,0]],np.uint8)
        filled,_,distance = flood(original,np.ones_like(original,bool),2,2)
        self.assertEqual(int(filled[0,5]),0)
        self.assertEqual(int(filled[0,3]),2)

    def test_no_detection_no_invented_flood(self):
        original = np.zeros((5,5),np.uint8)
        filled,ambiguous,_ = flood(original,np.ones((5,5),bool),4,14)
        self.assertFalse(filled.any())
        self.assertFalse(ambiguous.any())

    def test_determinism_and_exact_mirror_without_relabeling(self):
        original = np.array([[0,1,0,0,2,0]],np.uint8)
        alpha = np.ones_like(original,bool)
        a = flood(original,alpha,2,2)
        b = flood(original,alpha,2,2)
        for x,y in zip(a,b):
            np.testing.assert_array_equal(x,y)
        mirrored = flood(original[:,::-1],alpha[:,::-1],2,2)
        for x,y in zip(a,mirrored):
            np.testing.assert_array_equal(x[:,::-1],y)
        np.testing.assert_array_equal(transform(original,mirror=True),original[:,::-1])

    def test_transfer_positive_supported_unknown_and_conflict_preserved(self):
        south = np.ones((7,17),np.uint8)
        north = np.zeros_like(south)
        north[:,1]=1
        north[3,14]=2
        alpha = np.ones_like(south,bool)
        filled,_,_ = flood(north,alpha,2,2)
        cfg = {'transfer_hypotheses':[{'mirror':False,'dx':0,'dy':0},{'mirror':True,'dx':0,'dy':0}],
               'silhouette_neighborhood_radius':1,'north_anchor_max_distance':4}
        assisted,added,conflicts,*_ = transfer(south,alpha,north,alpha,filled,cfg,2)
        self.assertTrue(added.any())
        self.assertTrue(conflicts[3,14])
        self.assertEqual(int(assisted[3,14]),2)
        p = provenance(assisted,north,alpha,added)
        self.assertTrue(np.all(p[added]==CROSS))
        invariants(north,assisted,alpha,p)

    def test_no_north_anchor_no_transfer(self):
        s = np.ones((5,5),np.uint8)
        n = np.zeros_like(s)
        cfg = {'transfer_hypotheses':[{'mirror':False,'dx':0,'dy':0},{'mirror':True,'dx':0,'dy':0}],
               'silhouette_neighborhood_radius':1,'north_anchor_max_distance':4}
        result,added,*_ = transfer(s,s>0,n,s>0,n,cfg,1)
        self.assertFalse(result.any())
        self.assertFalse(added.any())


if __name__ == '__main__':
    unittest.main()
