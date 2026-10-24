import copy
import json
from pathlib import Path
import tempfile
import unittest
from bench import summarize,write_json
from contracts import digest,state_text,validate_case,validate_prediction
from make_suite import build_suite


class ContractTests(unittest.TestCase):
    def test_suite_has_identical_action_sets_and_state_under_permutations(self):
        cases=build_suite()['cases']
        self.assertEqual(len(cases),96)
        self.assertEqual(len({c['id'] for c in cases}),96)
        for offset in range(0,len(cases),3):
            group=cases[offset:offset+3]
            self.assertEqual(len({state_text(c) for c in group}),1)
            self.assertEqual(len({digest(c['actions']) for c in group}),3)
            self.assertEqual(len({tuple(sorted((a['id'],a['description']) for a in c['actions'])) for c in group}),1)
            for case in group:
                validate_case(case)

    def test_context_pair_changes_only_relevant_context(self):
        cases=build_suite()['cases']
        for offset in range(0,len(cases),6):
            left,right=cases[offset],cases[offset+3]
            self.assertEqual(left['character'],right['character'])
            self.assertEqual(left['actions'],right['actions'])
            self.assertEqual(left['situation']['description'],right['situation']['description'])
            self.assertNotEqual(left['situation']['context'],right['situation']['context'])

    def test_invalid_action_identity_is_explicit(self):
        case=copy.deepcopy(build_suite()['cases'][0])
        case['actions'][1]['id']=case['actions'][0]['id']
        with self.assertRaises(ValueError):
            validate_case(case)

    def test_abstention_mass_is_not_discarded(self):
        answer={'selected_action':None,'abstained':True,'probabilities':{'help':.1,'leave':.2,'__insufficient_evidence__':.7}}
        validate_prediction(answer,['help','leave'])
        self.assertEqual(answer['probabilities']['__insufficient_evidence__'],.7)
        answer['probabilities']['help']=float('nan')
        with self.assertRaises(ValueError):
            validate_prediction(answer,['help','leave'])

    def test_reordering_probabilities_does_not_invent_sensitivity(self):
        base={'model':'example','case_id':'base','repeat':0,'language':'en',
              'character_id':'guard','scenario_id':'wounded','context_variant':0,
              'order_variant':'original','outcome':'completed','selected_action':'help',
              'abstained':False,'probabilities':{'help':.8,'leave':.2},'wall_seconds':.01}
        reversed_case={**base,'case_id':'reversed','order_variant':'reversed',
                       'probabilities':{'leave':.2,'help':.8}}
        with tempfile.TemporaryDirectory() as directory:
            output=Path(directory)
            write_json(output/'example/status.json',{'outcome':'completed'})
            (output/'example/results.jsonl').write_text(
                '\n'.join(json.dumps(row) for row in (base,reversed_case)),encoding='utf-8')
            summarize(output)
            pairs=json.loads((output/'sensitivity.json').read_text(encoding='utf-8'))
            self.assertEqual(len(pairs),1)
            self.assertFalse(pairs[0]['choice_changed'])
            self.assertEqual(pairs[0]['total_variation'],0)


if __name__=='__main__':
    unittest.main()
