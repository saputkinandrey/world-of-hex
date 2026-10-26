"""Tests for structural/grounding/resume seams; no fake model-quality metrics."""
import copy
import tempfile
import unittest
import zipfile
from pathlib import Path

from common import ROOT, digest, read, write
from grounding import anchor, normalize
from parsing import parse_document, ParagraphHTML


class ParserTests(unittest.TestCase):
    def setUp(self):
        (ROOT/'cache').mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=ROOT/'cache')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def parse(self, suffix, content):
        path = self.root / ('source' + suffix)
        path.write_text(content, encoding='utf-8')
        return parse_document(path, 'en', self.root/'document.json', 'authored_fixture')

    def test_txt_soft_line_is_not_paragraph(self):
        doc = self.parse('.txt', 'One soft\nline.\n\n"Question?"\n\n"Answer."\n')
        self.assertEqual([p['text'] for p in doc['paragraphs']], ['One soft\nline.', '"Question?"', '"Answer."'])
        self.assertEqual(doc['paragraphs'][0]['origin'], {'char_start':0, 'char_end':14})
        self.assertEqual(doc['paragraphs'][1]['dialogue_spans'][0]['text'], '"Question?"')

    def test_fb2_inline_markup_and_section_order(self):
        doc = self.parse('.fb2', '<FictionBook xmlns="urn:fb2"><description><p>skip</p></description><body><section><title><p>Title</p></title><p>A <emphasis>soft</emphasis> line.</p><section><p>Second.</p></section></section></body><body name="notes"><p>note</p></body></FictionBook>')
        self.assertEqual([p['text'] for p in doc['paragraphs']], ['A soft line.', 'Second.'])
        self.assertNotEqual(doc['paragraphs'][0]['section_id'], doc['paragraphs'][1]['section_id'])

    def test_epub_uses_spine_not_zip_order(self):
        path = self.root/'source.epub'
        with zipfile.ZipFile(path, 'w') as archive:
            archive.writestr('META-INF/container.xml', '<container><rootfiles><rootfile full-path="O/book.opf"/></rootfiles></container>')
            archive.writestr('O/book.opf', '<package><manifest><item id="a" href="a.xhtml"/><item id="b" href="b.xhtml"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>')
            archive.writestr('O/a.xhtml', '<html><body><h1>A</h1><p>Last.</p></body></html>')
            archive.writestr('O/b.xhtml', '<html><body><h1>B</h1><p>First <em>inline</em><br/>still first.</p><p>Next.</p></body></html>')
        doc = parse_document(path, 'en', self.root/'document.json', 'authored_fixture')
        self.assertEqual([p['text'] for p in doc['paragraphs']], ['First inline\nstill first.', 'Next.', 'Last.'])

    def test_stable_ids_and_no_overwrite(self):
        doc = self.parse('.txt', 'A paragraph.\n\nAnother.')
        other = parse_document(self.root/'source.txt', 'en', self.root/'second.json', 'authored_fixture')
        self.assertEqual(doc['paragraphs'], other['paragraphs'])
        with self.assertRaises(FileExistsError):
            parse_document(self.root/'source.txt', 'en', self.root/'document.json', 'authored_fixture')

    def test_nested_list_keeps_author_paragraphs(self):
        parser = ParagraphHTML()
        parser.feed('<ul><li><p>First.</p><p>Second.</p></li></ul>')
        self.assertEqual([text for text, _, _ in parser.blocks], ['First.', 'Second.'])

    def test_original_crlf_and_utf8_positions_are_recoverable(self):
        from positions import export_positions
        path = self.root/'source.txt'
        path.write_bytes('First\r\nsoft.\r\n\r\nMara.'.encode('utf-8'))
        doc = parse_document(path, 'en', self.root/'document.json', 'authored_fixture')
        export_positions(doc, self.root/'positions.json')
        positions = read(self.root/'positions.json')['paragraphs']
        self.assertEqual(positions[1]['raw_char_start'], 16)
        self.assertEqual(path.read_bytes()[positions[1]['raw_byte_start']:positions[1]['raw_byte_end']], b'Mara.')

    def test_bom_and_cyrillic_byte_offsets(self):
        from positions import export_positions
        path = self.root/'source.txt'
        path.write_bytes(b'\xef\xbb\xbf' + '\u041c\u0430\u0440\u0430\r\n\r\n\u0418\u0432\u0435\u043d'.encode('utf-8'))
        doc = parse_document(path, 'ru', self.root/'document.json', 'authored_fixture')
        export_positions(doc, self.root/'positions.json')
        position = read(self.root/'positions.json')['paragraphs'][1]
        self.assertEqual(position['raw_byte_start'], 15)
        self.assertEqual(position['raw_char_start'], 8)


class GroundingTests(unittest.TestCase):
    def setUp(self):
        self.target = {'id':'p1', 'text':'Mara said, "No." She stayed.'}
        self.payload = {'mentions':[{'quote':'Mara','who':'Mara','kind':'name','role':'speaker'},
                                    {'quote':'She','who':'Mara','kind':'pronoun','role':'actor'}],
                        'observations':[], 'links':[], 'revisions':[]}

    def test_exact_quote_and_repeated_ambiguity(self):
        paragraphs = {'p':{'text':'he saw he'}}
        with self.assertRaises(ValueError):
            anchor({'paragraph_id':'p','quote':'he'}, paragraphs)
        self.assertEqual(anchor({'paragraph_id':'p','quote':'he','occurrence':1}, paragraphs)['start'], 7)

    def test_coreference_does_not_create_unmentioned_name(self):
        payload = copy.deepcopy(self.payload)
        payload['mentions'][1]['who'] = 'Invented'
        registry = []
        result = normalize(payload, self.target, [], registry)
        self.assertEqual(len(result['mentions']), 1)
        self.assertEqual(len(result['rejected']), 1)
        self.assertEqual([c['name'] for c in registry], ['Mara'])

    def test_ungrounded_observation_is_rejected_not_repaired(self):
        self.payload['observations'] = [{'evidence':[{'paragraph_id':'p1','quote':'She killed him.'}]}]
        result = normalize(self.payload, self.target, [], [])
        self.assertEqual(result['observations'], [])
        self.assertEqual(result['rejected'][0]['kind'], 'observation')

    def test_denial_retains_assertion_provenance(self):
        self.payload['observations'] = [{'who':'Mara','actor':'Mara','target':'unknown','speaker':'Mara','about':'Mara',
            'categories':['decision'], 'summary':'Mara refuses.', 'source':'self_report','status':'denied',
            'evidence':[{'paragraph_id':'p1','quote':'"No."'}]}]
        result = normalize(self.payload, self.target, [], [])
        self.assertEqual(result['observations'][0]['assertion_status'], 'denied')
        self.assertEqual(result['observations'][0]['certainty'], 'model_unverified')

    def test_completed_artifact_tampering_rejects_resume(self):
        from analysis import validate_saved
        (ROOT/'cache').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=ROOT/'cache') as directory:
            root = Path(directory)
            write(root/'raw.json', {'response':'original'})
            write(root/'records/00000.json', {'run_sha256':'abc', 'artifacts':[{'path':'raw.json','sha256':digest(root/'raw.json')}]})
            validate_saved(root/'records/00000.json', 'abc')
            write(root/'raw.json', {'response':'changed'})
            with self.assertRaises(ValueError):
                validate_saved(root/'records/00000.json', 'abc')

    def test_manual_correction_requires_source_evidence(self):
        from review import validate_correction
        corrected = {'fragments':[], 'mentions':[], 'speakers':[{'who':'Mara','evidence':[]}], 'evidence':[]}
        with self.assertRaises(ValueError):
            validate_correction(corrected, {'p1':self.target})

    def test_rejected_observation_cannot_pollute_registry(self):
        payload = {'mentions':[], 'observations':[{'who':'Mara','actor':'Mara','speaker':'Mara','about':'invented',
            'target':'unknown','source':'narrator','status':'asserted','categories':['action'],'summary':'Stays.',
            'evidence':[{'paragraph_id':'p1','quote':'She stayed.'}]}], 'links':[], 'revisions':[]}
        registry = []
        result = normalize(payload, self.target, [], registry)
        self.assertEqual(registry, [])
        self.assertEqual(len(result['rejected']), 1)

    def test_non_character_target_is_source_anchored_object(self):
        target = {'id':'p1','text':'Mara took the cup.'}
        payload = {'mentions':[], 'observations':[{'who':'Mara','actor':'Mara','speaker':'narrator','about':'Mara',
            'target':'the cup','source':'narrator','status':'asserted','categories':['action'],'summary':'Takes a cup.',
            'evidence':[{'paragraph_id':'p1','quote':'Mara took the cup.'}]}], 'links':[], 'revisions':[]}
        result = normalize(payload, target, [], [])
        self.assertEqual(result['observations'][0]['participants']['target']['quote'], 'the cup')

    def test_revision_is_consistent_and_cannot_target_current_record(self):
        from analysis import prompt_state, rebuild
        with tempfile.TemporaryDirectory(dir=ROOT/'cache') as directory:
            root = Path(directory)
            mention = {'id':'p0:m0','paragraph_id':'p0','character_id':'ambiguous','kind':'pronoun','quote':'He'}
            records = [{'paragraph_id':'p0','status':'SUCCESS','normalized':{'mentions':[mention]}},
                       {'paragraph_id':'p1','status':'SUCCESS','normalized':{'revision_proposals':[{'record_id':'p0:m0','character_id':'c1'}]}}]
            registry = [{'id':'c1','name':'Mara','aliases':[],'mentions':[],'status':'automatic_unverified'}]
            state = prompt_state(registry, records, {'previous_paragraphs':2,'registry_limit':24})
            self.assertEqual(state['recent_attributions'][0]['character_id'], 'c1')
            manifest = {'model':'qwen','revision':'test','processing':{},'run_sha256':'test'}
            document = {'paragraphs':[{'id':'p0','type':'narration'},{'id':'p1','type':'narration'}]}
            rebuild(root, document, manifest, records, registry)
            self.assertEqual(read(root/'characters.json')['ambiguous_mentions'], [])
            from common import rows
            self.assertEqual(rows(root/'fragments.jsonl')[0]['participants'], ['c1'])
            records[0]['normalized']['revision_proposals'] = [{'record_id':'p0:m0','character_id':'c1'}]
            records[1]['normalized'] = {}
            state = prompt_state(registry, records, {'previous_paragraphs':2,'registry_limit':24})
            self.assertEqual(state['recent_attributions'][0]['character_id'], 'ambiguous')

    def test_manual_textual_target_cannot_fabricate_a_quote(self):
        from review import validate_correction
        corrected = {'characters':{'characters':[{'id':'c1','name':'Mara'}]},
            'fragments':[{'id':'f1','paragraph_ids':['p1']}], 'mentions':[], 'speakers':[],
            'evidence':[{'character_id':'c1','fragment_id':'f1','categories':['action'],
                'evidence':[{'paragraph_id':'p1','quote':'She stayed.'}],
                'participants':{'target':{'kind':'textual_object','paragraph_id':'p1','quote':'invented object'}}}]}
        with self.assertRaises(ValueError):
            validate_correction(corrected, {'p1':self.target})

    def test_semantic_merge_requires_explicit_adjacent_link(self):
        from analysis import rebuild
        from common import rows
        with tempfile.TemporaryDirectory(dir=ROOT/'cache') as directory:
            root = Path(directory)
            records = [{'paragraph_id':'p0','status':'SUCCESS','normalized':{}},
                       {'paragraph_id':'p1','status':'SUCCESS','normalized':{'links':[{'paragraph_id':'p0','same_episode':True,'relation':'question_answer'}]}},
                       {'paragraph_id':'p2','status':'SUCCESS','normalized':{'links':[{'paragraph_id':'p1','same_episode':True,'relation':'scene_change'}]}}]
            document = {'paragraphs':[{'id':f'p{i}','type':'dialogue'} for i in range(3)]}
            rebuild(root, document, {'model':'qwen','revision':'test','processing':{},'run_sha256':'test'}, records, [])
            self.assertEqual([f['paragraph_ids'] for f in rows(root/'fragments.jsonl')], [['p0','p1'],['p2']])


if __name__ == '__main__':
    unittest.main()
