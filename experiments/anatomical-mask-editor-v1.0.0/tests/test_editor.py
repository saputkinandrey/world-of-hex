import copy
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace
from pathlib import Path
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from dataset import ROOT,Dataset,Entry
from editor import Editor,NO_OVERRIDE
from corrections import Store,read,write_json


class ModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset=Dataset()

    def model(self):
        alpha=np.ones((9,11),bool)
        alpha[0,0]=False
        original=np.zeros(alpha.shape,np.uint8)
        original[1,1]=1
        filled=self.dataset.converge(original,alpha)['owners']
        entry=Entry('synthetic/south',original,filled,alpha,[],np.zeros_like(original),np.zeros_like(original),0,{})
        return Editor(entry,self.dataset.converge)

    def test_dataset_and_14_existing_categories(self):
        self.assertEqual(len(self.dataset.keys),32)
        self.assertEqual(len(self.dataset.names),15)
        self.assertIn('Left_Hand',self.dataset.names.values())
        self.assertIn('Right_Foot',self.dataset.names.values())
        entry=self.dataset.entry('idle/north')
        self.assertEqual(entry.original.shape,entry.filled.shape)

    def test_native_brush_continuity_alpha_and_one_undo_per_stroke(self):
        model=self.model()
        model.begin()
        model.pencil((0,0),(5,5),14,1)
        model.pencil((5,5),(10,8),14,1)
        model.end()
        self.assertEqual(len(model.past),1)
        for i in range(1,6):
            self.assertEqual(int(model.owners()[i,i]),14)
        self.assertEqual(int(model.final[0,0]),NO_OVERRIDE)
        changed=model.owners().copy()
        model.undo()
        np.testing.assert_array_equal(model.owners(),model.entry.filled)
        model.redo()
        np.testing.assert_array_equal(model.owners(),changed)

    def test_brush_sizes_are_native_pixels(self):
        for size in [1,3,5]:
            model=self.model()
            model.pencil((5,4),(5,4),2,size)
            self.assertEqual(np.count_nonzero(model.final!=-1),size*size)

    def test_polygon_assignment_and_connected_fill_limit(self):
        model=self.model()
        selected=model.polygon([(0,0),(4,0),(4,4),(0,4)])
        model.apply(selected,14)
        self.assertFalse(selected[0,0])
        self.assertEqual(int(model.owners()[2,2]),14)
        region=model.connected((2,2),selected)
        np.testing.assert_array_equal(region,selected)
        model.apply(region,3)
        self.assertTrue(np.all(model.owners()[selected]==3))
        self.assertFalse(np.any(model.final[~model.entry.alpha]!=-1))

    def test_seed_recompute_preview_cancel_accept_and_final_survives(self):
        model=self.model()
        selected=np.zeros_like(model.entry.alpha)
        selected[7,9]=True
        model.apply(selected,14,'seed')
        model.apply(model.polygon([(4,3),(6,3),(6,5),(4,5)]),3,'final')
        before=model.owners().copy()
        final_mask=model.final!=-1
        preview=model.preview()
        self.assertTrue(model.pending_seeds)
        np.testing.assert_array_equal(model.owners(),before)
        self.assertTrue(np.all(preview['after'][final_mask]==3))
        model.accept(preview)
        self.assertFalse(model.pending_seeds)
        self.assertEqual(int(model.owners()[7,9]),14)
        model.undo()
        np.testing.assert_array_equal(model.owners(),before)
        self.assertTrue(model.pending_seeds)
        model.redo()
        self.assertFalse(model.pending_seeds)

    def test_erase_seed_is_not_no_override(self):
        model=self.model()
        selection=np.zeros_like(model.entry.alpha)
        selection[1,1]=True
        model.apply(selection,0,'seed')
        self.assertEqual(int(model.seed[1,1]),0)
        self.assertFalse(model.seeds().any())
        self.assertFalse(model.preview()['base'].any())
        model.apply(selection,-1,'seed')
        np.testing.assert_array_equal(model.seeds(),model.entry.original)

    def test_no_overrides_reproduces_all_32_source_maps(self):
        for key in self.dataset.keys:
            entry=self.dataset.entry(key)
            with self.subTest(key=key):
                np.testing.assert_array_equal(self.dataset.converge(entry.original,entry.alpha)['owners'],entry.filled)

    def test_save_reload_and_source_signature_rejection(self):
        (ROOT/'cache').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT/'cache') as directory:
            self.assertTrue(Path(directory).resolve().is_relative_to(ROOT/'cache'))
            store=Store(self.dataset,directory)
            model=store.load('idle/north')
            y,x=np.argwhere(model.entry.alpha)[0]
            selection=np.zeros_like(model.entry.alpha)
            selection[y,x]=True
            model.apply(selection,14)
            store.save(model,'Corrected','Synthetic test, not operator anatomy')
            loaded=store.load('idle/north')
            np.testing.assert_array_equal(loaded.owners(),model.owners())
            path=Path(directory)/'edits/idle/north/metadata.json'
            metadata=read(path)
            metadata['source_signature']['algorithm_version']='changed'
            write_json(path,metadata)
            with self.assertRaisesRegex(ValueError,'signature mismatch'):
                store.load('idle/north')

    def test_pending_seeds_cannot_be_saved(self):
        (ROOT/'cache').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT/'cache') as directory:
            store=Store(self.dataset,directory)
            model=store.load('idle/north')
            selection=np.zeros_like(model.entry.alpha)
            selection[np.argwhere(model.entry.alpha)[0][0],np.argwhere(model.entry.alpha)[0][1]]=True
            model.apply(selection,14,'seed')
            with self.assertRaisesRegex(ValueError,'pending'):
                store.save(model,'Corrected','test')

    def test_undo_during_active_stroke_only_removes_that_stroke(self):
        model=self.model()
        model.pencil((2,2),(2,2),2,1)
        first=model.owners().copy()
        model.begin()
        model.pencil((5,5),(7,5),3,1)
        model.undo()
        self.assertIsNone(model.transaction)
        np.testing.assert_array_equal(model.owners(),first)
        model.undo()
        np.testing.assert_array_equal(model.owners(),model.entry.filled)

    def test_committed_metadata_recovers_failed_journal_write(self):
        (ROOT/'cache').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT/'cache') as directory:
            store=Store(self.dataset,directory)
            model=store.load('idle/north')
            selection=np.zeros_like(model.entry.alpha)
            y,x=np.argwhere(model.entry.alpha)[0]
            selection[y,x]=True
            model.apply(selection,14)
            with patch.object(store,'write_journal',side_effect=OSError('simulated journal failure')):
                with self.assertRaises(OSError):
                    store.save(model,'Corrected','committed comment')
            recovered=Store(self.dataset,directory)
            self.assertEqual(recovered.records['idle/north']['status'],'Corrected')
            self.assertEqual(recovered.records['idle/north']['comment'],'committed comment')
            self.assertEqual(recovered.records['idle/north']['manual_pixels'],1)
            np.testing.assert_array_equal(recovered.load('idle/north').owners(),model.owners())

    def test_shortcuts_dispatch_windows_keys_in_cyrillic_layout(self):
        from app import App
        calls=[]
        fake=SimpleNamespace(history=lambda redo:(calls.append(redo) or 'break'),safe=lambda action:action(),save=lambda:calls.append('save'))
        self.assertEqual(App.shortcut(fake,SimpleNamespace(keycode=90,keysym='Cyrillic_ya')),'break')
        self.assertEqual(App.shortcut(fake,SimpleNamespace(keycode=89,keysym='Cyrillic_en')),'break')
        self.assertEqual(calls,[False,True])
        self.assertEqual(App.shortcut(fake,SimpleNamespace(keycode=83,keysym='Cyrillic_yeru')),'break')
        self.assertEqual(calls[-1],'save')

    def test_zoom_preserves_native_cursor_coordinate(self):
        from canvas import PixelCanvas
        fake=SimpleNamespace(zoom=4,offset=[10,20],draw=lambda:None,
            app=SimpleNamespace(zoom_var=SimpleNamespace(set=lambda value:None)))
        self.assertEqual(PixelCanvas.native(fake,50,60),(10,10))
        PixelCanvas.set_zoom(fake,32,(50,60))
        self.assertEqual(PixelCanvas.native(fake,50,60),(10,10))

    def test_mirror_history_is_guarded_and_session_history_survives_navigation(self):
        from app import App
        model=self.model()
        model.pencil((2,2),(2,2),14,1)
        fake=SimpleNamespace(model=model,editable=lambda:False)
        App.history(fake,False)
        self.assertEqual(int(model.owners()[2,2]),14)
        cached=SimpleNamespace(model=model,saved_state=model.snapshot(),sessions={},discard_on_leave=False,
                               dataset=SimpleNamespace(canonical=lambda key:key,assert_current=lambda entry:None))
        App.remember_current(cached)
        cached.model=None
        App.open_model(cached,model.entry.key)
        self.assertIs(cached.model,model)
        cached.model.undo()
        np.testing.assert_array_equal(cached.model.owners(),model.entry.filled)


if __name__=='__main__':
    unittest.main()
