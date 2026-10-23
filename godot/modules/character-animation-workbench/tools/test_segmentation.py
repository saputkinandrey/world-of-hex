"""Source-art ownership regressions, separate from skin-weight validation."""
import json
import unittest
from unittest.mock import patch

from PIL import Image
import author_segmentation as author
import calibrate_rig
import refine_anatomy
import deformation_masks
from deformation_masks import ASSETS, BONES, MANIFEST, MASKS, PALETTE
from protected_masks import protect
from segmentation_atlas import components


class SegmentationTests(unittest.TestCase):
    def test_source_contours_and_semantic_landmarks(self):
        document = json.loads(author.ANNOTATIONS.read_text())
        landmarks = json.loads((MASKS/'segmentation-landmarks.json').read_text())
        manifest = json.loads(MANIFEST.read_text())
        for view in ASSETS:
            image, labels, missing = author.annotated(view, document)
            self.assertEqual(missing, [], view)
            profile = manifest['bindings'][view]['Layers/BodyBase']
            owners = Image.open(MASKS/(profile+'-owners.png')).convert('RGB')
            for y in range(image.height):
                for x in range(image.width):
                    if image.getpixel((x,y))[3]:
                        self.assertEqual(owners.getpixel((x,y)), PALETTE[labels.getpixel((x,y))-1], (view,x,y))
            probes = list(landmarks['views'][view].items())
            probes += [(probe['bone'],probe['pixel']) for probe in landmarks['boundaries'][view]]
            for bone, point in probes:
                self.assertGreater(image.getpixel(tuple(point))[3], 0, (view,bone,point))
                self.assertEqual(owners.getpixel(tuple(point)), PALETTE[BONES.index(bone)], (view,bone,point))

    def test_every_component_is_reported(self):
        from segmentation_atlas import source
        manifest = json.loads(MANIFEST.read_text())
        reviewed = json.loads((MASKS/'segmentation-components.json').read_text())
        for view in ASSETS:
            image = source(view)
            name = manifest['bindings'][view]['Layers/BodyBase']
            owners = Image.open(MASKS/(name+'-owners.png')).convert('RGB')
            for connectivity, key in [(4,'four_neighbors'),(8,'eight_neighbors')]:
                actual = components(image, owners, connectivity)
                self.assertEqual(actual, reviewed[view][key], (view,key))
                self.assertEqual(sum(c['pixels'] for regions in actual.values() for c in regions),
                                 sum(image.getpixel((x,y))[3] > 0 for y in range(image.height) for x in range(image.width)))

    def test_legacy_regeneration_is_blocked(self):
        manifest = json.loads(MANIFEST.read_text())
        for view in ASSETS:
            with self.assertRaisesRegex(ValueError, 'overwrite manually reviewed masks'):
                calibrate_rig.paint_feet(manifest, view, {})
        with self.assertRaisesRegex(ValueError, 'overwrite manually reviewed masks'):
            refine_anatomy.refine()
        with self.assertRaisesRegex(ValueError, 'overwrite manually reviewed masks'):
            protect(['south-body'], 'Regression test')

    def test_missing_reviewed_mask_cannot_be_regenerated_from_old_seeds(self):
        missing = MASKS/'south-0-owners.png'
        original_exists = type(MASKS).exists

        def exists(path):
            return False if path == missing else original_exists(path)

        with patch.object(type(MASKS),'exists',exists), \
             patch.object(deformation_masks,'initial_masks',side_effect=AssertionError('Old seeds')):
            with self.assertRaisesRegex(ValueError,'overwrite manually reviewed masks'):
                deformation_masks.initialize()

    def test_calibration_does_not_repaint_masks(self):
        with patch.object(calibrate_rig, 'paint_feet', side_effect=AssertionError('Mask repaint')), \
             patch.object(calibrate_rig, 'calibrate_scene'), \
             patch.object(type(MANIFEST), 'write_text'):
            calibrate_rig.build()

    def test_authoring_preserves_later_manual_png_edits(self):
        lock = json.loads(author.LOCK.read_text())
        for filename, expected in lock['files'].items():
            self.assertEqual(author.digest(MASKS/filename), expected, filename)
        with patch.object(author, 'digest', return_value='manual-edit'):
            with self.assertRaisesRegex(ValueError, 'Preserving a manually edited mask'):
                author.build(write=True)


if __name__ == '__main__':
    unittest.main()
