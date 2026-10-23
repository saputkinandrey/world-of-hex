"""Transactional replacement and model/direction failure isolation regressions."""
import ast
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import cv2
import numpy as np
from PIL import Image
import evidence_store as store
from full import run_models
from inference_jobs import cached
from layerdiff_worker import patched_source
from head_localization import head_support, MissingNeuralHead
from infer import settings


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)/'current'
        self.input = self.root.parent/'input.png'
        Image.new('RGB',(4,4),'white').save(self.input)
        self.record = {'source_sha256':'source','input_sha256':store.sha(self.input),
                       'input':str(self.input),'transform':{'input_size':[4,4]}}
        self.metadata = {'model':'semantic-sam','view':'south','input':self.record,
                         'classes':store.CLASSES,'contract':{'seed':42}}

    def tearDown(self):
        self.temporary.cleanup()

    def populate(self, target, value=1):
        import shutil
        shutil.copy2(self.input,target/'input.png')
        raw = target/'raw'
        raw.mkdir()
        logits = np.full((19,4,4),-2,dtype=np.float32)
        logits[0] = value
        logits[1] = value  # Overlapping positives must remain valid raw evidence.
        np.savez_compressed(raw/'logits.npz',logits=logits)
        for name in store.CLASSES:
            Image.new('L',(4,4),123).save(raw/(name+'.png'))

    def test_latest_replaces_only_after_validation_and_preserves_all_logits(self):
        with store.locked(self.root):
            first,_ = store.promote('south','semantic-sam',self.populate,self.metadata,self.root)
            def broken(target):
                self.populate(target)
                (target/'raw/logits.npz').write_bytes(b'not logits')
            with self.assertRaises(ValueError):
                store.promote('south','semantic-sam',broken,self.metadata,self.root)
            self.assertEqual(store.verify('south','semantic-sam',self.root)[0],first)
            second,_ = store.promote('south','semantic-sam',lambda path:self.populate(path,3),self.metadata,self.root)
            self.assertNotEqual(first,second)
            self.assertFalse(first.exists())
            self.assertEqual(len(list(second.parent.glob('snapshot-*'))),1)
            values = np.load(second/'raw/logits.npz')['logits']
            self.assertEqual(float(values[0,0,0]),3)
            self.assertEqual(float(values[2,0,0]),-2)
            self.assertEqual(list((self.root.parent/'.staging').iterdir()),[])

    def test_pointer_failure_keeps_previous_success_and_cleans_new_snapshot(self):
        with store.locked(self.root):
            first,_ = store.promote('south','semantic-sam',self.populate,self.metadata,self.root)
            original = store.write_json
            def fail_pointer(path, value):
                if Path(path).name == 'current.json':
                    raise OSError('simulated atomic pointer failure')
                original(path,value)
            with patch.object(store,'write_json',side_effect=fail_pointer):
                with self.assertRaisesRegex(OSError,'pointer failure'):
                    store.promote('south','semantic-sam',lambda path:self.populate(path,7),self.metadata,self.root)
            self.assertEqual(store.verify('south','semantic-sam',self.root)[0],first)
            self.assertEqual(len(list(first.parent.glob('snapshot-*'))),1)

    def test_binary_class_masks_cannot_replace_raw_floating_logits(self):
        with store.locked(self.root):
            first,_ = store.promote('south','semantic-sam',self.populate,self.metadata,self.root)
            def binary(target):
                self.populate(target)
                np.savez_compressed(target/'raw/logits.npz',logits=np.zeros((19,4,4),dtype=np.uint8))
            with self.assertRaisesRegex(ValueError,'raw SemanticSam logits'):
                store.promote('south','semantic-sam',binary,self.metadata,self.root)
            self.assertEqual(store.verify('south','semantic-sam',self.root)[0],first)

    def test_successful_layerdiff_stages_require_their_complete_outputs(self):
        metadata = {**self.metadata,'model':'layerdiff','stages':{'body':'success'}}
        def body(target):
            import shutil
            shutil.copy2(self.input,target/'input.png')
            layers = target/'raw/layers'
            layers.mkdir(parents=True)
            for name in store.BODY_TAGS:
                Image.new('RGBA',(4,4),(10,20,30,20)).save(layers/(name+'.png'))
        with store.locked(self.root):
            first,_ = store.promote('south','layerdiff',body,metadata,self.root)
            for stage in ('head','depth','export'):
                with self.subTest(stage=stage):
                    incomplete = {**metadata,'stages':{'body':'success',stage:'success'}}
                    with self.assertRaises((ValueError,FileNotFoundError)):
                        store.promote('south','layerdiff',body,incomplete,self.root)
                    self.assertEqual(store.verify('south','layerdiff',self.root)[0],first)

    def test_reuse_requires_identical_input_recipe_and_checksums(self):
        with store.locked(self.root):
            path,_ = store.promote('south','semantic-sam',self.populate,self.metadata,self.root)
            self.assertIsNotNone(cached('south','semantic-sam',self.record,{'seed':42},self.root))
            self.assertIsNone(cached('south','semantic-sam',self.record,{'seed':43},self.root))
            with self.assertRaisesRegex(ValueError,'input identity'):
                cached('south','semantic-sam',{**self.record,'transform':{}},{'seed':42},self.root)
            (path/'raw/face.png').write_bytes(b'corruption')
            with self.assertRaisesRegex(ValueError,'files changed'):
                cached('south','semantic-sam',self.record,{'seed':42},self.root)

    def test_explicit_recovery_removes_crash_leftovers_without_changing_current(self):
        import shutil
        with store.locked(self.root):
            current,_ = store.promote('south','semantic-sam',self.populate,self.metadata,self.root)
            orphan = current.parent/'snapshot-orphan'
            shutil.copytree(current,orphan)
            abandoned = self.root.parent/'.staging/promotion-abandoned'
            abandoned.mkdir()
            (abandoned/'partial').write_bytes(b'partial')
            store.recover_temporary('south','semantic-sam',self.root)
            self.assertFalse(orphan.exists())
            self.assertFalse(abandoned.exists())
            self.assertEqual(store.verify('south','semantic-sam',self.root)[0],current)

    def test_one_failed_model_does_not_suppress_other_models_or_directions(self):
        views = ['south','north','south-west','north-west']
        calls = []
        records = {view+'-crop-nearest-512':{} for view in views}
        def runner(view, model, record):
            calls.append((view,model))
            if view=='south' and model=='layerdiff':
                raise RuntimeError('genuine inference failure')
            return {'quality':'poor recognition','assembly':'refused'}
        result = run_models(views,records,{},runner)
        self.assertEqual(len(calls),8)
        self.assertEqual(result['south']['layerdiff']['outcome'],'inference_failure')
        self.assertEqual(result['south']['semantic-sam']['outcome'],'available')
        self.assertEqual(result['north-west']['semantic-sam']['outcome'],'available')

    def test_genuine_head_execution_failure_does_not_replace_previous_success(self):
        import shutil
        import subprocess
        import sys
        import inference_jobs as jobs
        metadata = {**self.metadata,'model':'layerdiff','stages':{'body':'success'}}
        def body(target):
            shutil.copy2(self.input,target/'input.png')
            (target/'raw/layers').mkdir(parents=True)
            for name in store.BODY_TAGS:
                Image.new('RGBA',(4,4),(10,20,30,20)).save(target/'raw/layers'/(name+'.png'))
        with store.locked(self.root):
            first,_ = store.promote('south','layerdiff',body,metadata,self.root)
        output = self.root.parent/'output'
        def child(command, **kwargs):
            work = Path(command[-1])
            (work/'raw/layers').mkdir(parents=True)
            for name in store.BODY_TAGS:
                Image.new('RGBA',(4,4),(50,20,30,20)).save(work/'raw/layers'/(name+'.png'))
            store.write_json(work/'result.json',{'body_complete':True,'stages':{
                'layerdiff':{'outcome':'inference_failure','traceback':'head network failed'},
                'body':{'outcome':'success'}}})
            return SimpleNamespace(returncode=0)
        with patch.object(jobs,'CURRENT',self.root),patch.object(jobs,'OUTPUT',output), \
             patch.object(jobs,'settings',return_value=(self.root.parent,self.root.parent,Path(sys.executable))), \
             patch.object(jobs,'contract',return_value={'seed':42}), \
             patch.object(jobs,'locked',side_effect=lambda:store.locked(self.root)), \
             patch.object(jobs.subprocess,'run',side_effect=child):
            with self.assertRaises(subprocess.CalledProcessError):
                jobs.run_one('south','layerdiff',self.record,force=True)
        with store.locked(self.root):
            self.assertEqual(store.verify('south','layerdiff',self.root)[0],first)

    def test_missing_head_keeps_all_direct_body_pixels_without_raising(self):
        _,upstream,_ = settings()
        source = (upstream/'inference/scripts/inference_psd_quantized.py').read_text()
        tree = ast.parse(patched_source(source))
        function = next(node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name=='run_layerdiff')
        body = [np.full((64,64,4),20,dtype=np.uint8) for _ in store.BODY_TAGS]
        class Pipeline:
            unet = SimpleNamespace(device='cpu')
            def __call__(self, **kwargs):
                self.request = kwargs
                return SimpleNamespace(images=body)
        pipeline = Pipeline()
        class Generator:
            def __init__(self, **kwargs):
                pass
            def manual_seed(self, value):
                return self
        import os
        namespace = {'os':os,'osp':os.path,'np':np,'cv2':cv2,'Image':Image,
            'torch':SimpleNamespace(Generator=Generator),
            'center_square_pad_resize':lambda image,*args,**kwargs:(image,[64,64],[0,0]),
            '_hex_head_support':head_support,'_hex_missing_head':MissingNeuralHead,
            '_hex_write_json':store.write_json,'_hex_path':Path}
        exec(compile(ast.Module(body=[function],type_ignores=[]),'<upstream-test>','exec'),namespace)
        Image.new('RGBA',(64,64),'white').save(self.input)
        namespace['run_layerdiff'](pipeline,str(self.input),str(self.root),42,20,64)
        self.assertEqual(pipeline.request['group_index'],0)
        for tag in store.BODY_TAGS:
            np.testing.assert_array_equal(np.asarray(Image.open(self.root/'input'/(tag+'.png'))),body[0])
        self.assertTrue((self.root/'input/head-stage.json').exists())


if __name__ == '__main__':
    unittest.main()
