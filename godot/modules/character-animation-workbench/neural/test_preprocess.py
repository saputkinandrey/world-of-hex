"""Coordinate, source preservation and neural-only localization regressions."""
import unittest
import numpy as np
from PIL import Image
from preprocess import SOURCES, frame, prepare, project
from head_localization import head_support
from heads import crop_box


class PreprocessingTests(unittest.TestCase):
    def test_all_views_roundtrip_without_legacy(self):
        for view in SOURCES:
            image,_ = frame(view)
            for mode in ('canvas','crop'):
                _,transform = prepare(image,mode,'nearest')
                native = np.arange(image.width*image.height,dtype=np.int32).reshape(image.height,image.width)+1
                # Build model labels by inverse edge coordinates, then project centers.
                grid_y,grid_x = np.indices((512,512))
                x = np.floor((grid_x+.5-transform['offset'][0])/transform['scale'][0]).astype(int)
                y = np.floor((grid_y+.5-transform['offset'][1])/transform['scale'][1]).astype(int)
                valid = (x>=0)&(y>=0)&(x<image.width)&(y<image.height)
                model = np.zeros((512,512),dtype=np.int32)
                model[valid] = native[y[valid],x[valid]]
                restored = project(model,transform)
                visible = np.asarray(image)[...,3]>0
                np.testing.assert_array_equal(restored[visible],native[visible])

    def test_head_residue_does_not_expand_crop(self):
        alpha = np.full((64,64),20,dtype=np.uint8)
        alpha[5:20,25:40] = 255
        alpha[50:52,1:3] = 255
        support = head_support(alpha)
        self.assertEqual(Image.fromarray(support).getbbox(),(25,5,40,20))

    def test_empty_head_fails_explicitly(self):
        with self.assertRaisesRegex(ValueError,'no confident'):
            head_support(np.zeros((64,64),dtype=np.uint8))

    def test_detailed_head_crop_preserves_confident_extent(self):
        alpha = np.full((512,512),20,dtype=np.uint8)
        alpha[4:104,180:270] = 255
        left,top,right,bottom = crop_box(alpha)
        self.assertEqual(right-left,bottom-top)
        self.assertGreaterEqual(top,0)
        self.assertLessEqual(left,180)
        self.assertGreaterEqual(right,270)
        self.assertGreaterEqual(bottom,104)


if __name__ == '__main__':
    unittest.main()
