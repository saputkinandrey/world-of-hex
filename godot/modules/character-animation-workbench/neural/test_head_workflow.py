"""Head-only experiment invariants; no GPU or Legacy dependency."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image

from head_analysis import components, iou, metrics
from head_runs import prepare_source, run_dual
from inference_parameters import DEFAULTS, parameters
from preprocess import project


class HeadWorkflowTests(unittest.TestCase):
    def test_worker_defaults_preserve_ordinary_numerics(self):
        self.assertEqual(parameters({}),{'seed':42,'steps':20,'resolution':512,'depth_resolution':512})
        self.assertEqual(parameters({'parameters':{'seed':7}}),{**DEFAULTS,'seed':7})
        with self.assertRaises(ValueError):
            parameters({'parameters':{'steps':0}})

    def test_selects_neural_mass_without_anatomical_location(self):
        alpha = np.zeros((20,20),np.uint8)
        alpha[1:5,1:5] = 200
        alpha[10:15,10:15] = 190
        mask,regions,selected = components(alpha,128)
        self.assertEqual(selected['area'],25)
        self.assertEqual(len(regions),2)
        self.assertTrue(mask[12,12])
        self.assertFalse(mask[2,2])

    def test_empty_mask_is_not_perfect_agreement(self):
        empty = np.zeros((4,4),bool)
        self.assertIsNone(iou(empty,empty))
        self.assertIsNone(metrics(empty,empty)['centroid_xy'])

    def test_frame_preparation_and_native_projection(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            image = Image.new('RGBA',(16,8))
            image.paste((80,50,20,255),(2,1,6,7))
            image.paste((20,50,80,255),(9,1,15,7))
            image.save(root/'atlas.png')
            record = prepare_source(root/'atlas.png',root/'prepared',64,'nearest',8)
            self.assertEqual(record['transform']['native_size'],[8,8])
            projected = project(np.ones((64,64),np.uint8),record['transform'])
            self.assertEqual(projected.shape,(8,8))
            self.assertEqual(Image.open(root/'prepared/source.png').getbbox(),(2,1,6,7))

    def test_failed_first_model_still_attempts_second(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            def runner(model,*args):
                return {'outcome':'inference_failure' if model=='layerdiff' else 'completed'}
            with patch('head_runs.execute_model',side_effect=runner) as execute:
                result = run_dual({},root,DEFAULTS,{'layerdiff':{},'semantic-sam':{}})
            self.assertEqual([call.args[0] for call in execute.call_args_list],['layerdiff','semantic-sam'])
            self.assertEqual(result['semantic-sam']['outcome'],'completed')

    def test_setup_exception_does_not_suppress_other_model(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            with patch('head_runs.execute_model',side_effect=[OSError('source read failed'),{'outcome':'completed'}]) as execute:
                result = run_dual({},root,DEFAULTS,{'layerdiff':{},'semantic-sam':{}})
            self.assertEqual(execute.call_count,2)
            self.assertEqual(result['layerdiff']['outcome'],'execution_setup_failure')
            self.assertIn('source read failed',result['layerdiff']['error'])
            self.assertEqual(result['semantic-sam']['outcome'],'completed')


if __name__ == '__main__':
    unittest.main()
