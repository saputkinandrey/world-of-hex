"""Arithmetic and provenance invariants, using synthetic RGBA files only."""
import gzip
import itertools
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image

import segment


class ArithmeticTests(unittest.TestCase):
    def test_original_two_layer_recurrence(self):
        maps = segment.recurrence({'a': np.array([[1]]), 'b': np.array([[2]])})
        self.assertEqual([int(maps['s' + str(i)][0, 0]) for i in range(1, 5)], [3, 5, 11, 41])
        self.assertEqual([int(maps['p' + str(i)][0, 0]) for i in range(1, 5)], [2, 6, 30, 330])

    def test_large_pairwise_result_survives_exact_serialization(self):
        hit_count = 1000
        hitmaps = {name: np.array([[hit_count]]) for name in segment.LAYERS}
        maps = segment.recurrence(hitmaps)
        integers = [hit_count for name in hitmaps]
        expected_sum = sum(integers)
        expected_product = sum(a * b for a, b in itertools.combinations(integers, 2))
        for _ in range(3):
            expected_sum, expected_product = expected_sum + expected_product, expected_sum * expected_product
        self.assertGreater(expected_sum, 2**63 - 1)
        self.assertEqual(int(maps['s4'][0, 0]), expected_sum)
        self.assertEqual(int(maps['p4'][0, 0]), expected_product)
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            segment.save_numeric(output, hitmaps, maps, segment.threshold(maps['s4']))
            with gzip.open(output / 'numeric.json.gz', 'rt', encoding='utf-8') as stream:
                saved = json.load(stream)
            self.assertEqual(int(saved['recurrence']['s4'][0][0]), expected_sum)
            self.assertEqual(int(saved['recurrence']['p4'][0][0]), expected_product)

    def test_intensity_ranking_ties(self):
        ranking = segment.rank_layers({'b': np.array([[2, 0]]), 'a': np.array([[1, 1]]), 'c': np.array([[0, 1]])})
        self.assertEqual(ranking, ['a', 'b', 'c'])

    def test_threshold_boundary_and_zero(self):
        self.assertEqual(segment.threshold(np.array([[0, 4, 5, 100]], dtype=object)).tolist(), [[False, False, True, True]])
        self.assertFalse(segment.threshold(np.zeros((2, 2), dtype=object)).any())
        maps = segment.recurrence({'a': np.zeros((2, 2), dtype=object)})
        self.assertFalse(segment.threshold(maps['s4']).any())
        self.assertEqual(segment.component_areas(np.array([[True, False], [False, True]])), [1, 1])

    def test_single_layer_self_pair_for_arbitrary_category(self):
        maps = segment.recurrence({'arbitrary-category': np.array([[0, 1, 2, 7]])})
        self.assertEqual(maps['s1'].tolist(), [[0, 2, 4, 14]])
        self.assertEqual(maps['p1'].tolist(), [[0, 1, 4, 49]])
        self.assertEqual(maps['s4'].tolist(), [[0, 11, 152, 43967]])
        self.assertEqual(maps['p4'].tolist(), [[0, 30, 3072, 749 * 43218]])

    def test_three_layer_pairwise_initialization_is_unchanged(self):
        maps = segment.recurrence({name: np.array([[value]]) for name, value in (('a', 1), ('b', 2), ('c', 3))})
        self.assertEqual([int(maps[f's{i}'][0, 0]) for i in range(1, 5)], [6, 17, 83, 1205])
        self.assertEqual([int(maps[f'p{i}'][0, 0]) for i in range(1, 5)], [11, 66, 1122, 93126])


class SavedObservationTests(unittest.TestCase):
    def create_experiment(self, directory):
        experiment = Path(directory)
        (experiment / 'input').mkdir()
        source = experiment / 'input/source.png'
        Image.new('RGBA', (2, 2), (20, 40, 60, 255)).save(source)
        transform = {'native_size': [2, 2], 'input_size': [2, 2], 'scale': [1, 1], 'offset': [0, 0]}
        segment.write_json(experiment / 'plan.json', {'input': {'transform': transform, 'source_frame_sha256': segment.sha(source)}})
        for name in ('run-01', 'run-02'):
            folder = experiment / name / 'layerdiff'
            (folder / 'raw/layers').mkdir(parents=True)
            segment.write_json(folder / 'request.json', {'parameters': {'seed': 42}, 'input': {'transform': transform}})
            segment.write_json(folder / 'manifest.json', {'parameters': {'seed': 42}, 'stages': {'body': 'success'}})
            for layer in segment.LAYERS:
                rgba = np.zeros((2, 2, 4), dtype=np.uint8)
                if layer == 'head':
                    rgba[:, :, 3] = [[128, 129], [0, 255]]
                Image.fromarray(rgba).save(folder / 'raw/layers' / (layer + '.png'))
        return experiment

    def test_identical_duplicate_counts_once_and_empty_layer_is_retained(self):
        with tempfile.TemporaryDirectory() as directory:
            experiment = self.create_experiment(directory)
            _, maps, provenance = segment.load_observations(experiment, ['head', 'back hair'])
            self.assertEqual(provenance['unique_seeds'], [42])
            self.assertEqual(len(provenance['identical_duplicate_seeds']), 1)
            self.assertEqual(maps['head'].tolist(), [[0, 1], [0, 1]])
            self.assertEqual(int(maps['back hair'].sum()), 0)

    def test_duplicate_rgb_conflict_in_unselected_layer_is_not_hidden(self):
        with tempfile.TemporaryDirectory() as directory:
            experiment = self.create_experiment(directory)
            path = experiment / 'run-02/layerdiff/raw/layers/tail.png'
            Image.new('RGBA', (2, 2), (1, 0, 0, 0)).save(path)
            with self.assertRaises(segment.SeedConflict) as caught:
                segment.load_observations(experiment, ['head'])
            self.assertEqual(caught.exception.conflicts[0]['different_layers'], ['tail'])


if __name__ == '__main__':
    unittest.main()
