"""Regression guard: baking works with animation and audit reads forbidden."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import deformation_masks as compiler
from ligament_topology import interfaces


class TopologyTests(unittest.TestCase):
    def test_shared_boundary_and_unrelated_contact(self):
        linked = lambda a,b: a == b or abs(a-b) == 1
        self.assertEqual(len(interfaces([0,1],[255,255],2,1,linked)),1)
        self.assertEqual(interfaces([0,2],[255,255],2,1,linked),[])
        self.assertEqual(interfaces([0,1],[255,0],2,1,linked),[])
        self.assertEqual(len(interfaces([0,1,2,1],[255]*4,2,2,linked)),3)

    def test_bake_does_not_read_animation_or_audit_data(self):
        manifest = json.loads(compiler.MANIFEST.read_text())
        original_open = Path.open

        def guarded_open(path,*args,**kwargs):
            if 'animation' in path.parts or 'animations' in path.parts or path.name in ('motion-bridges.json','motion-gaps-before.json'):
                raise AssertionError('Forbidden motion input: '+str(path))
            return original_open(path,*args,**kwargs)

        parent = compiler.ROOT.parents[2]/'tmp/animation-workbench'
        parent.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=parent) as directory:
            with patch.object(compiler,'OUTPUT',Path(directory)),patch.object(Path,'open',guarded_open):
                for name,profile in manifest['profiles'].items():
                    compiler.compile_profile(name,profile,name == manifest['bindings'][profile['view']]['Layers/BodyBase'])
                    self.assertEqual((Path(directory)/(name+'.tscn')).read_bytes(),
                                     (compiler.ROOT/'rigs/masked'/(name+'.tscn')).read_bytes(),
                                     'Checked-in surface differs from mask-only compilation: '+name)
                self.assertEqual(len(list(Path(directory).glob('*.tscn'))),len(manifest['profiles']))


if __name__ == '__main__':
    unittest.main()
