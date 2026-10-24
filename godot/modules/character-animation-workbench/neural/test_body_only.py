"""RGBA transport and body/full routing checks; no neural model is loaded."""
import ast
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

import numpy as np
from PIL import Image

from evidence_store import BODY_TAGS
from head_runs import BATCH, body_batch
from infer import settings
from inference_parameters import DEFAULTS
from layerdiff_worker import patched_source, run_pipeline
from preprocess import METHODS, frame, prepare


class BodyOnlyTests(unittest.TestCase):
    def test_sw_rgb_matches_historical_input_and_alpha_matches_source_grid(self):
        source,_ = frame('south-west')
        prepared,transform = prepare(source,'crop','bicubic')
        historical = Image.open(BATCH/'reference/input.png').convert('RGB')
        np.testing.assert_array_equal(np.asarray(prepared.convert('RGB')),np.asarray(historical))
        self.assertEqual(prepared.mode,'RGBA')
        box = transform['crop']
        size = tuple(round((box[i+2]-box[i])*transform['scale'][i]) for i in range(2))
        placement = tuple(round(transform['offset'][i]+box[i]*transform['scale'][i]) for i in range(2))
        expected = Image.new('L',prepared.size)
        expected.paste(source.getchannel('A').crop(box).resize(size,METHODS['bicubic']),placement)
        np.testing.assert_array_equal(np.asarray(prepared.getchannel('A')),np.asarray(expected))
        self.assertEqual(np.asarray(prepared.getchannel('A'))[0,0],0)

    def test_partial_source_alpha_is_preserved_without_rgb_shift(self):
        source = Image.new('RGBA',(8,8))
        source.paste((70,110,150,128),(2,1,6,7))
        prepared,transform = prepare(source,'canvas','nearest',64)
        expected = source.resize((64,64),Image.Resampling.NEAREST)
        old_rgb = Image.new('RGBA',(64,64),'white')
        old_rgb.alpha_composite(expected)
        np.testing.assert_array_equal(np.asarray(prepared.convert('RGB')),np.asarray(old_rgb.convert('RGB')))
        np.testing.assert_array_equal(np.asarray(prepared.getchannel('A')),np.asarray(expected.getchannel('A')))
        self.assertIn(128,np.unique(np.asarray(prepared.getchannel('A'))))
        self.assertEqual(transform['offset'],[0.0,0.0])

    def test_real_upstream_body_adapter_passes_rgba_and_stops_before_head_crop(self):
        _,upstream,_ = settings()
        entry = upstream/'inference/scripts/inference_psd_quantized.py'
        tree = ast.parse(patched_source(entry.read_text(),'body-only'))
        function = next(node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name=='run_layerdiff')
        observed = []
        def generator(**kwargs):
            return SimpleNamespace(manual_seed=lambda seed:seed)
        def square(image,resolution,return_pad_info):
            return image,(image.shape[1],image.shape[0]),(0,0)
        class Pipeline:
            unet = SimpleNamespace(device='unused-test-device')
            def __call__(self,**kwargs):
                observed.append(kwargs)
                return SimpleNamespace(images=[kwargs['fullpage'].copy() for _ in BODY_TAGS])
        namespace = {'np':np,'Image':Image,'os':os,'osp':os.path,
            'torch':SimpleNamespace(Generator=generator),'center_square_pad_resize':square,
            '_hex_head_support':Mock(side_effect=AssertionError('Head crop must not execute'))}
        exec(compile(ast.Module(body=[function],type_ignores=[]),str(entry),'exec'),namespace)
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = Image.new('RGBA',(8,8))
            source.paste((80,120,160,127),(2,2,6,6))
            source.save(root/'input.png')
            namespace['run_layerdiff'](Pipeline(),str(root/'input.png'),str(root/'raw'),42,20,8)
            self.assertEqual(len(observed),1)
            self.assertEqual(observed[0]['prompt'],BODY_TAGS)
            np.testing.assert_array_equal(observed[0]['fullpage'],np.asarray(source))
            for tag in BODY_TAGS:
                with Image.open(root/'raw/input'/(tag+'.png')) as output:
                    self.assertEqual(output.mode,'RGBA')
                    np.testing.assert_array_equal(np.asarray(output),np.asarray(source))
            self.assertFalse((root/'raw/input/raw-head').exists())

    def test_body_only_skips_optional_stages_and_full_keeps_them(self):
        for mode in ('body-only','full'):
            calls = []
            def body(pipeline,source,raw,*args):
                folder = Path(raw)/'input'
                folder.mkdir()
                for tag in BODY_TAGS:
                    Image.new('RGBA',(8,8),(70,110,150,128)).save(folder/(tag+'.png'))
                if mode=='full':
                    (folder/'raw-head').mkdir()
                calls.append('body')
            namespace = {'seed_everything':lambda seed:None,
                'build_layerdiff_pipeline':lambda args:object(),'run_layerdiff':body,
                'build_marigold_pipeline':lambda args:calls.append('depth-build'),
                'run_marigold':lambda *args:calls.append('depth'),
                'further_extr':lambda *args,**kwargs:calls.append('psd')}
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                Image.new('RGBA',(8,8)).save(root/'input.png')
                (root/'raw').mkdir()
                stages,complete = run_pipeline(namespace,SimpleNamespace(),root/'input.png',root/'raw',DEFAULTS,
                    mode,SimpleNamespace(cuda=SimpleNamespace(empty_cache=lambda:None)))
                self.assertTrue(complete)
                self.assertEqual(calls,['body'] if mode=='body-only' else ['body','depth-build','depth','psd'])
                if mode=='body-only':
                    self.assertTrue(all(stages[name]['outcome']=='not_requested' for name in ('head','depth','export')))

    def test_fixed_batch_attempts_each_seed_once_and_continues_after_failure(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            Image.new('RGBA',(8,8),(80,120,160,128)).save(root/'source.png')
            plan = {'input':str(root/'source.png'),'output':str(root/'output'),'seeds':[42,7],
                'steps':20,'resolution':512,'preprocessing':'bicubic','diagnostic_alpha_threshold':128}
            (root/'plan.json').write_text(json.dumps(plan))
            with (patch('head_runs.settings',return_value=(root,root,root/'unused-python')),
                  patch('head_runs.contract',return_value={}),
                  patch('head_runs.execute_model',side_effect=[RuntimeError('model setup failed'),{'outcome':'inference_failure'}]) as execute):
                body_batch(root/'plan.json')
            self.assertEqual(execute.call_count,2)
            self.assertEqual([call.args[3]['seed'] for call in execute.call_args_list],[42,7])
            self.assertTrue(all(call.args[0]=='layerdiff' and call.kwargs['mode']=='body-only' for call in execute.call_args_list))
            with Image.open(root/'output/input/input.png') as prepared:
                self.assertEqual(prepared.mode,'RGBA')


if __name__=='__main__':
    unittest.main()
