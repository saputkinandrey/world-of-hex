import unittest
import numpy as np
from flood import converge,mirror_result,unreachable_components,NORTH,EAST,SOUTH,WEST,NONE


class ConvergenceTests(unittest.TestCase):
    def test_unbounded_component_and_zero_terminal_delta(self):
        original=np.zeros((1,33),np.uint8)
        original[0,0]=14
        r=converge(original,np.ones_like(original,bool))
        self.assertTrue(np.all(r['owners']==14))
        self.assertEqual(r['max_depth'],32)
        self.assertEqual(r['wave_counts'],[1]*32)
        self.assertEqual(r['terminal_delta'],0)
        self.assertFalse(r['unknown'].any())

    def check_priority(self,codes,expected):
        original=np.zeros((3,3),np.uint8)
        alpha=np.zeros((3,3),bool)
        alpha[1,1]=True
        positions={NORTH:(0,1),EAST:(1,2),SOUTH:(2,1),WEST:(1,0)}
        for code,owner in zip(codes,[14,3,8,1]):
            y,x=positions[code]
            original[y,x]=owner
            alpha[y,x]=True
        r=converge(original,alpha)
        self.assertEqual(int(r['owners'][1,1]),int(original[positions[expected]]))
        self.assertEqual(int(r['tie_direction'][1,1]),expected)

    def test_pair_and_three_four_way_clockwise_conflicts(self):
        for codes,expected in [([NORTH,EAST],NORTH),([EAST,SOUTH],EAST),
                               ([SOUTH,WEST],SOUTH),([WEST,NORTH],NORTH),
                               ([EAST,SOUTH,WEST],EAST),([WEST,SOUTH,NORTH],NORTH),
                               ([WEST,EAST,NORTH,SOUTH],NORTH)]:
            with self.subTest(codes=codes):
                self.check_priority(codes,expected)

    def test_multiple_paths_of_same_owner_are_not_conflict(self):
        original=np.array([[7,0,7]],np.uint8)
        r=converge(original,np.ones_like(original,bool))
        self.assertEqual(int(r['owners'][0,1]),7)
        self.assertEqual(int(r['tie_direction'][0,1]),NONE)

    def test_same_wave_does_not_leak_to_neighbor(self):
        original=np.array([[9,0,0,2]],np.uint8)
        r=converge(original,np.ones_like(original,bool))
        np.testing.assert_array_equal(r['owners'],[[9,9,2,2]])
        np.testing.assert_array_equal(r['distance'],[[0,1,1,0]])

    def test_traversal_and_group_ids_do_not_affect_priority(self):
        rng=np.random.default_rng(23)
        alpha=rng.random((13,17))>.2
        original=np.where(alpha & (rng.random(alpha.shape)<.15),rng.integers(1,15,alpha.shape),0).astype(np.uint8)
        a=converge(original,alpha)
        b=converge(original,alpha,reverse_seeds=True,reverse_pixels=True)
        permutation=np.array([0,*range(14,0,-1)],np.uint8)
        c=converge(permutation[original],alpha)
        for key in ['owners','distance','tie_direction','tie_mask','unknown']:
            np.testing.assert_array_equal(a[key],b[key])
        np.testing.assert_array_equal(permutation[a['owners']],c['owners'])
        np.testing.assert_array_equal(a['tie_direction'],c['tie_direction'])

    def test_immutable_seeds_and_outside_alpha(self):
        alpha=np.array([[1,1,0],[0,0,1]],bool)
        original=np.array([[1,0,0],[0,0,0]],np.uint8)
        r=converge(original,alpha)
        self.assertEqual(int(r['owners'][0,0]),1)
        self.assertFalse(r['owners'][~alpha].any())
        self.assertTrue(r['unknown'][1,2])
        regions=unreachable_components(r['unknown'])
        self.assertEqual(regions[0]['coordinates_xy'],[[2,1]])
        self.assertEqual(regions[0]['area'],1)

    def test_no_seed_component_stays_unknown(self):
        original=np.zeros((4,4),np.uint8)
        r=converge(original,np.ones_like(original,bool))
        self.assertFalse(r['owners'].any())
        self.assertTrue(np.all(r['distance']==-1))
        self.assertEqual(r['wave_counts'],[])
        self.assertEqual(r['stop_reason'],'frontier_exhausted')

    def test_mirror_is_not_a_new_clockwise_flood(self):
        original=np.array([[1,0,2]],np.uint8)
        alpha=np.ones_like(original,bool)
        r=converge(original,alpha)
        m=mirror_result(r)
        np.testing.assert_array_equal(m['owners'],r['owners'][:,::-1])
        np.testing.assert_array_equal(m['distance'],r['distance'][:,::-1])
        self.assertEqual(int(m['tie_direction'][0,1]),WEST)
        self.assertNotEqual(int(m['owners'][0,1]),int(converge(original[:,::-1],alpha)['owners'][0,1]))


if __name__=='__main__':
    unittest.main()
