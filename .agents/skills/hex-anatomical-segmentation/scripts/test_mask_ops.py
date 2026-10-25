"""Set identities, coordinate validation and composition; no anatomical targets."""
import tempfile
from pathlib import Path
import unittest

import numpy as np
from PIL import Image

import mask_ops
from segment import read_json, sha, write_json


class SetOperationTests(unittest.TestCase):
    def test_set_algebra_and_directional_difference(self):
        a = np.array([[True, True, False, False]])
        b = np.array([[True, False, True, False]])
        intersection = mask_ops.apply_operation('intersection', a, b)
        difference = mask_ops.apply_operation('difference', a, b)
        reverse = mask_ops.apply_operation('difference', b, a)
        union = mask_ops.apply_operation('union', a, b)
        xor = mask_ops.apply_operation('symmetric-difference', a, b)
        self.assertTrue(np.array_equal(difference | intersection, a))
        self.assertFalse((difference & b).any())
        self.assertFalse(np.array_equal(difference, reverse))
        self.assertTrue(np.array_equal(xor, difference | reverse))
        self.assertTrue(np.array_equal(union, intersection | xor))
        self.assertFalse(mask_ops.apply_operation('difference', a, a).any())
        self.assertTrue(np.array_equal(mask_ops.apply_operation('union', a, a), a))

    def test_incompatible_grids_and_nonboolean_operands_fail(self):
        with self.assertRaises(ValueError):
            mask_ops.apply_operation('difference', np.zeros((2, 2), dtype=bool), np.zeros((3, 3), dtype=bool))
        with self.assertRaises(ValueError):
            mask_ops.apply_operation('union', np.array([[255]], dtype=np.uint8), np.array([[True]]))


class SavedMaskTests(unittest.TestCase):
    def result(self, root, name, mask, source=None):
        experiment = root / 'historical'
        source = source or experiment / 'input/source.png'
        source.parent.mkdir(parents=True, exist_ok=True)
        if not source.exists():
            Image.new('RGBA', (2, 2), (20, 40, 60, 255)).save(source)
        directory = root / name
        directory.mkdir()
        Image.fromarray(np.array(mask, dtype=np.uint8)).save(directory / 'mask.png')
        write_json(directory / 'metadata.json', {
            'source_image': str(source.resolve()), 'experiment_path': str(experiment.resolve()),
            'transform': {'native_size': [2, 2]},
            'input_checksums_sha256': {str(source.resolve()): sha(source)},
            'output_checksums_sha256': {'mask.png': sha(directory / 'mask.png')}})
        return directory

    def test_saved_difference_can_be_used_as_another_operand(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            left = self.result(root, 'left', [[255, 255], [0, 0]])
            right = self.result(root, 'right', [[255, 0], [255, 0]])
            before = {str(path): sha(path) for folder in (left, right) for path in folder.iterdir()}
            difference = root / 'difference'
            mask_ops.combine('difference', left, right, difference)
            mask_ops.combine('union', difference, right, root / 'combined')
            direct = mask_ops.combine('union', left, right, root / 'direct')
            self.assertTrue(np.array_equal(np.array(Image.open(root / 'combined/mask.png')),
                                           np.array(Image.open(root / 'direct/mask.png'))))
            self.assertEqual(direct['output_area_pixels'], int((np.array([[True, True], [False, False]]) |
                                                               np.array([[True, False], [True, False]])).sum()))
            self.assertEqual(read_json(difference / 'integrity.json')['outcome'], 'passed')
            self.assertTrue(all(sha(path) == checksum for path, checksum in before.items()))

    def test_same_dimensions_do_not_allow_different_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            left = self.result(root, 'left', [[255, 0], [0, 0]])
            other = root / 'other-source.png'
            Image.new('RGBA', (2, 2), (80, 90, 100, 255)).save(other)
            right = self.result(root, 'right', [[255, 0], [0, 0]], other)
            with self.assertRaises(ValueError):
                mask_ops.combine('difference', left, right, root / 'invalid')
            self.assertFalse((root / 'invalid').exists())

    def test_nonbinary_input_and_changed_checksums_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            invalid = self.result(root, 'gray', [[128, 0], [0, 0]])
            with self.assertRaises(ValueError):
                mask_ops.load_result(invalid)
            valid = self.result(root, 'valid', [[255, 0], [0, 0]])
            Image.new('L', (2, 2), 0).save(valid / 'mask.png')
            with self.assertRaises(ValueError):
                mask_ops.load_result(valid)


if __name__ == '__main__':
    unittest.main()
